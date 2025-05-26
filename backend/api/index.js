const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { TextToSpeechClient } = require('@google-cloud/text-to-speech'); // Ajout du client TTS
const app = express();

// Middleware pour parser le JSON dans les requêtes (avec une limite de taille augmentée)
app.use(express.json({ limit: '5mb' })); // Augmenter la limite à 5MB

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
    // Déstructurer toutes les variables attendues une seule fois
    const { userTranscript, scenario, conversationHistory = [], initialContext } = req.body;

    if (!userTranscript || !scenario ) { // initialContext est maintenant optionnel au niveau de la validation de base ici
      return res.status(400).json({ error: 'La transcription de l\'utilisateur et le scénario sont requis.' });
    }
    if (scenario && !initialContext && conversationHistory.length === 0) { // Si c'est le début d'une nouvelle simulation (pas d'historique) et que le contexte est manquant
        return res.status(400).json({ error: 'Le contexte initial est requis pour démarrer une nouvelle simulation.' });
    }
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY n\'est pas définie.');
      return res.status(500).json({ error: 'Configuration du serveur incomplète (clé API manquante).' });
    }

    // Construire l'instruction système
    let systemPromptText = `Tu es un simulateur de client pour un commercial. Ton rôle est de jouer le client décrit dans le scénario de base suivant :
    Scénario: ${scenario.title}
    Description de base du client: ${scenario.description}.`;

    if (initialContext) { // Toujours ajouter le contexte initial s'il est fourni
    systemPromptText += `\nL'utilisateur a ajouté les précisions suivantes sur ton rôle, ton comportement, ou le produit/service en jeu : "${initialContext}". Intègre impérativement ces détails dans ta simulation. Ces précisions de l'utilisateur sont prioritaires et doivent guider tes réponses et objections.`;
    }
    
    systemPromptText += `\n\nLe commercial va essayer de te vendre un produit ou service en lien avec le contexte fourni.`;
    
    systemPromptText += `\n\nIMPORTANT : Adapte ton langage et tes réactions pour refléter un contexte client africain, spécifiquement camerounais. Cela signifie :
    - Utilise un français clair et accessible. Tu peux intégrer des expressions locales camerounaises si cela semble naturel et pertinent, mais sans excès ni caricature.
    - Montre une sensibilité aux relations interpersonnelles, à la confiance et au respect mutuel.
    - Tes objections ou questions peuvent refléter des réalités économiques locales, des habitudes de consommation, ou une préférence pour des solutions éprouvées et fiables.
    - Évite un ton trop direct, trop formel ou des références culturelles purement occidentales qui ne seraient pas pertinentes. L'approche peut être plus indirecte et valoriser le contact humain.
    - Fais preuve de patience et d'écoute.`;
    
    systemPromptText += `\n\nInteragis naturellement. Pose des questions, exprime des objections ou de l'intérêt en accord avec ton rôle de client et le contexte fourni.
    Sois concis dans tes réponses (1-2 phrases maximum).
    Ne termine pas la conversation trop vite, essaie d'avoir au moins 3-5 échanges significatifs.
    Ne révèle jamais que tu es une IA ou un simulateur. Joue ton rôle de client de manière crédible.`;

    const currentGeminiModel = genAI.getGenerativeModel({ 
      model: "gemini-2.5-pro-preview-05-06",
      systemInstruction: {
        role: "system",
        parts: [{ text: systemPromptText }],
      }
    });

    let geminiChatHistory = [];
    if (conversationHistory && conversationHistory.length > 0) {
      geminiChatHistory = conversationHistory.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      }));
      
      if (geminiChatHistory.length > 0 && geminiChatHistory[0].role === 'model') {
        console.warn("Premier message de l'historique était 'model', il a été retiré pour cet appel à Gemini.");
        geminiChatHistory.shift(); 
      }
    }
    
    let chat;
    if (geminiChatHistory.length > 0) {
      chat = currentGeminiModel.startChat({
        history: geminiChatHistory
      });
    } else {
      chat = currentGeminiModel.startChat(); // Appel sans argument si pas d'historique
    }

    const result = await chat.sendMessage(userTranscript);
    const aiResponseText = result.response.text();
    
    console.log("Texte de réponse de Gemini:", aiResponseText);

    if (!aiResponseText || aiResponseText.trim() === '') {
      console.log("Réponse de Gemini vide, renvoi d'une réponse par défaut.");
      return res.json({ aiResponse: "Je ne sais pas quoi répondre à cela.", audioContent: null });
    }

    let audioContentBase64 = null;
    try {
      const ttsRequest = {
        input: { text: aiResponseText },
        voice: { languageCode: 'fr-FR', name: 'fr-FR-Neural2-A' },
        audioConfig: { audioEncoding: 'MP3' },
      };
      const [ttsResponse] = await ttsClient.synthesizeSpeech(ttsRequest);
      audioContentBase64 = ttsResponse.audioContent.toString('base64');
      console.log("Audio généré par TTS (longueur base64):", audioContentBase64 ? audioContentBase64.length : 'null');
    } catch (ttsError) {
      console.error('Erreur Text-to-Speech:', ttsError.message, ttsError.stack);
    }
    
    res.json({ aiResponse: aiResponseText, audioContent: audioContentBase64 });

  } catch (error) {
    console.error('Erreur dans /api/chat:', error.message, error.stack);
    let errorMsg = 'Erreur interne du serveur.';
    let errorDetails = null;
    if (error.response && error.response.promptFeedback && error.response.promptFeedback.blockReason) {
        errorMsg = `Contenu bloqué par l'API Gemini: ${error.response.promptFeedback.blockReason}`;
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

app.post('/api/analyze', async (req, res) => {
  try {
    const { conversation } = req.body; 

    if (!conversation || !Array.isArray(conversation)) {
      return res.status(400).json({ error: 'La conversation est requise et doit être un tableau.' });
    }
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY n\'est pas définie.');
      return res.status(500).json({ error: 'Configuration du serveur incomplète (clé API manquante).' });
    }

    const analysisPrompt = `Analyse la conversation de vente suivante entre un commercial (rôle "user") et un client IA (rôle "model").
    Évalue la performance du commercial.
    Fournis un score global sur 100, une liste de conseils personnalisés pour le commercial, et une liste de points spécifiques à améliorer.
    
    Conversation:
    ${conversation.map(msg => `${msg.sender === 'user' ? 'Commercial' : 'Client IA'}: ${msg.text}`).join('\n')}
    
    Fournis ta réponse au format JSON, avec les champs suivants :
    {
      "score": number, 
      "conseils": string[], 
      "ameliorations": string[] 
    }
    Assure-toi que la réponse est un JSON valide et ne contient rien d'autre.`;

    const geminiAnalysisModel = genAI.getGenerativeModel({ model: "gemini-2.5-pro-preview-05-06" }); 

    const result = await geminiAnalysisModel.generateContent(analysisPrompt);
    const analysisText = result.response.text();

    console.log("Réponse d'analyse de Gemini:", analysisText);

    let analysisResults = null;
    try {
      const jsonMatch = analysisText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) { 
        analysisResults = JSON.parse(jsonMatch[1]);
      } else {
        analysisResults = JSON.parse(analysisText);
      }
      if (typeof analysisResults.score !== 'number' || !Array.isArray(analysisResults.conseils) || !Array.isArray(analysisResults.ameliorations)) {
          throw new Error("Structure JSON inattendue de l'analyse.");
      }

    } catch (parseError) {
      console.error('Erreur lors du parsing de la réponse d\'analyse de Gemini:', parseError.message, parseError.stack);
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

module.exports = app;
