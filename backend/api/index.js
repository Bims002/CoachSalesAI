const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { TextToSpeechClient } = require('@google-cloud/text-to-speech'); // Ajout du client TTS
const app = express();

// Middleware pour parser le JSON dans les requêtes
app.use(express.json());

// Initialisation des clients API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Initialisation du client Text-to-Speech
let ttsClientOptions = {};
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  try {
    // Si la variable d'env contient le JSON directement (cas de Vercel)
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    ttsClientOptions = { credentials };
    console.log("Credentials Google Cloud parsées depuis la variable d'environnement.");
  } catch (e) {
    // Si ce n'est pas un JSON valide, on suppose que c'est un chemin de fichier (pour tests locaux par ex.)
    // Dans ce cas, la bibliothèque cliente devrait le gérer automatiquement si la variable est un chemin.
    // Mais pour Vercel, on s'attend à un JSON. Si le parsing échoue, c'est un problème de config.
    console.error("Erreur lors du parsing de GOOGLE_APPLICATION_CREDENTIALS. Assurez-vous qu'elle contient le JSON valide de la clé de service ou un chemin vers le fichier de clé.", e);
    // On pourrait choisir de ne pas initialiser ttsClient ou de le laisser essayer avec l'auth par défaut.
    // Pour l'instant, on logue l'erreur et on laisse la bibliothèque tenter sa chance.
  }
} else {
  console.warn("Variable d'environnement GOOGLE_APPLICATION_CREDENTIALS non définie. L'API Text-to-Speech pourrait ne pas fonctionner.");
}
const ttsClient = new TextToSpeechClient(ttsClientOptions);

// Route de test
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend CoachSales AI fonctionne !' });
});

// Route pour la simulation de chat
app.post('/api/chat', async (req, res) => {
  try {
    const { userTranscript, scenario, conversationHistory = [] } = req.body;

    if (!userTranscript || !scenario) {
      return res.status(400).json({ error: 'La transcription de l\'utilisateur et le scénario sont requis.' });
    }
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY n\'est pas définie.');
      return res.status(500).json({ error: 'Configuration du serveur incomplète (clé API manquante).' });
    }

    // Définir l'instruction système pour Gemini
    const systemInstruction = `Tu es un simulateur de client pour un commercial. Ton rôle est de jouer le client décrit dans le scénario suivant :
    Scénario: ${scenario.title}
    Description du client: ${scenario.description}
    
    Le commercial essaie de te vendre un produit ou service (non spécifié, reste général).
    Interagis naturellement. Pose des questions, exprime des objections ou de l'intérêt en accord avec ton rôle de client.
    Sois concis dans tes réponses (1-2 phrases).
    Ne termine pas la conversation trop vite, essaie d'avoir au moins 3-5 échanges.
    Ne dis pas que tu es une IA ou un simulateur.`;

    const geminiModel = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro-latest",
      systemInstruction: {
        role: "system", // Ou un autre rôle si Gemini le préfère pour les instructions système
        parts: [{ text: systemInstruction }],
      }
    });

    // Construire l'historique pour le modèle Gemini à partir de `conversationHistory`
    // `conversationHistory` est l'historique jusqu'au dernier message de l'IA (ou vide si premier tour)
    const geminiChatHistory = conversationHistory.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));
    
    // Démarrer une session de chat avec l'historique
    const chat = geminiModel.startChat({
      history: geminiChatHistory,
    });

    // Envoyer le message actuel de l'utilisateur
    const result = await chat.sendMessage(userTranscript);
    const aiResponseText = result.response.text();
    
    console.log("Texte de réponse de Gemini:", aiResponseText);

    if (!aiResponseText || aiResponseText.trim() === '') {
      console.log("Réponse de Gemini vide, renvoi d'une réponse par défaut.");
      return res.json({ aiResponse: "Je ne sais pas quoi répondre à cela.", audioContent: null });
    }

    // 2. Convertir la réponse textuelle en audio
    let audioContentBase64 = null;
    try {
      const ttsRequest = {
        input: { text: aiResponseText },
        voice: { languageCode: 'fr-FR', name: 'fr-FR-Wavenet-D' }, // Voix exemple, à ajuster
        audioConfig: { audioEncoding: 'MP3' },
      };
      const [ttsResponse] = await ttsClient.synthesizeSpeech(ttsRequest);
      audioContentBase64 = ttsResponse.audioContent.toString('base64');
      console.log("Audio généré par TTS (longueur base64):", audioContentBase64 ? audioContentBase64.length : 'null'); // LOG AJOUTÉ
    } catch (ttsError) {
      console.error('Erreur Text-to-Speech:', ttsError.message, ttsError.stack);
      // audioContentBase64 reste null
    }
    
    res.json({ aiResponse: aiResponseText, audioContent: audioContentBase64 });

  } catch (error) {
    console.error('Erreur dans /api/chat:', error.message, error.stack);
    let errorMsg = 'Erreur interne du serveur.';
    let errorDetails = null;
    // Tenter de récupérer des détails plus spécifiques de l'erreur Gemini
    if (error.response && error.response.promptFeedback && error.response.promptFeedback.blockReason) {
        errorMsg = `Contenu bloqué par l'API Gemini: ${error.response.promptFeedback.blockReason}`;
        errorDetails = error.response.promptFeedback;
    } else if (error.message) {
        errorMsg = error.message;
    }
    
    if (error.response && error.response.data) { // Pour les erreurs HTTP générales de l'API
        errorDetails = error.response.data;
    }
    res.status(500).json({ error: errorMsg, details: errorDetails });
  }
});

// Nouvelle route pour l'analyse de la simulation
app.post('/api/analyze', async (req, res) => {
  try {
    const { conversation } = req.body; // Recevoir la conversation complète

    if (!conversation || !Array.isArray(conversation)) {
      return res.status(400).json({ error: 'La conversation est requise et doit être un tableau.' });
    }
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY n\'est pas définie.');
      return res.status(500).json({ error: 'Configuration du serveur incomplète (clé API manquante).' });
    }

    // Construire le prompt pour l'analyse
    const analysisPrompt = `Analyse la conversation de vente suivante entre un commercial (rôle "user") et un client IA (rôle "model").
    Évalue la performance du commercial.
    Fournis un score global sur 100, une liste de conseils personnalisés pour le commercial, et une liste de points spécifiques à améliorer.
    
    Conversation:
    ${conversation.map(msg => `${msg.sender === 'user' ? 'Commercial' : 'Client IA'}: ${msg.text}`).join('\n')}
    
    Fournis ta réponse au format JSON, avec les champs suivants :
    {
      "score": number, // Score global sur 100 (ex: 75)
      "conseils": string[], // Liste de conseils (ex: ["Améliorer l'écoute active", "Poser plus de questions ouvertes"])
      "ameliorations": string[] // Liste de points à améliorer (ex: ["Interruption du client", "Manque de clarté sur les bénéfices"])
    }
    Assure-toi que la réponse est un JSON valide et ne contient rien d'autre.`;

    const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" }); // Utiliser le même modèle pour l'analyse

    const result = await geminiModel.generateContent(analysisPrompt);
    const analysisText = result.response.text();

    console.log("Réponse d'analyse de Gemini:", analysisText);

    // Tenter de parser la réponse JSON de Gemini
    let analysisResults = null;
    try {
      // Gemini peut parfois inclure le JSON dans des blocs de code markdown ```json ... ```
      const jsonMatch = analysisText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        analysisResults = JSON.parse(jsonMatch[1]);
      } else {
        // Si pas de bloc de code, essayer de parser directement
        analysisResults = JSON.parse(analysisText);
      }
      // Valider la structure de base
      if (typeof analysisResults.score !== 'number' || !Array.isArray(analysisResults.conseils) || !Array.isArray(analysisResults.ameliorations)) {
          throw new Error("Structure JSON inattendue de l'analyse.");
      }

    } catch (parseError) {
      console.error('Erreur lors du parsing de la réponse d\'analyse de Gemini:', parseError.message, parseError.stack);
      // Renvoyer une erreur spécifique si le parsing échoue
      return res.status(500).json({ error: 'Erreur lors du traitement de l\'analyse par l\'IA.', details: parseError.message });
    }

    res.json(analysisResults);

  } catch (error) {
    console.error('Erreur dans /api/analyze:', error.message, error.stack);
    let errorMsg = 'Erreur interne du serveur lors de l\'analyse.';
    let errorDetails = null;
    if (error.response && error.response.promptFeedback && error.response.promptFeedback.blockReason) {
        errorMsg = `Contenu bloqué par l'API Gemini lors de l'analyse: ${error.response.promptFeedback.blockReason}`;
        errorDetails = error.response.promptFeedback;
    } else if (error.message) {
        errorMsg = error.message;
    }
     if (error.response && error.response.data) {
        errorDetails = error.response.data;
    }
    res.status(500).json({ error: errorMsg, details: errorDetails });
  }
});


// Exporter l'application Express pour Vercel
// Vercel s'attend à ce que le fichier par défaut exporte la fonction handler.
// Si ce fichier est à la racine du dossier /api, Vercel le gère automatiquement.
module.exports = app;

// Si on voulait le lancer localement pour des tests (non nécessaire pour Vercel serverless)
// const PORT = process.env.PORT || 3001;
// app.listen(PORT, () => {
//   console.log(`Serveur backend démarré sur le port ${PORT}`);
// });
