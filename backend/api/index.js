const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const app = express();

// Middleware pour parser le JSON dans les requêtes
app.use(express.json());

// Initialisation du client Google Generative AI
// Assurez-vous que GEMINI_API_KEY est définie dans vos variables d'environnement sur Vercel
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" }); // Ou "gemini-pro"

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

    // Construction du prompt pour Gemini
    // Le prompt initial définit le rôle de l'IA et le contexte du scénario.
    // Les messages suivants sont ajoutés à l'historique.
    
    let prompt = `Tu es un simulateur de client pour un commercial. Ton rôle est de jouer le client décrit dans le scénario suivant :
    Scénario: ${scenario.title}
    Description du client: ${scenario.description}
    
    Le commercial essaie de te vendre un produit ou service (non spécifié, reste général).
    Interagis naturellement. Pose des questions, exprime des objections ou de l'intérêt en accord avec ton rôle de client.
    Sois concis dans tes réponses (1-2 phrases).
    Ne termine pas la conversation trop vite, essaie d'avoir au moins 3-5 échanges.
    Ne dis pas que tu es une IA ou un simulateur.
    ---
    `;

    // Construction de l'historique pour le modèle Gemini
    // Gemini attend un format spécifique : { role: "user" | "model", parts: [{ text: "..." }] }
    const geminiHistory = [];

    // Ajout du prompt système comme premier message "utilisateur" pour guider le modèle
    // (Certains modèles préfèrent cela, ou un champ "system instruction")
    // Pour Gemini, on peut l'inclure dans le premier message utilisateur ou comme contexte.
    // Ici, on va le mettre en contexte avant l'historique de la conversation.

    if (conversationHistory.length === 0) {
      // Premier tour, le commercial initie avec userTranscript
      prompt += `Le commercial commence la conversation et dit : "${userTranscript}"\nRéponds en tant que client.`;
    } else {
      // Tours suivants, ajouter l'historique
      conversationHistory.forEach(msg => {
        geminiHistory.push({
          role: msg.sender === 'user' ? 'user' : 'model', // 'user' pour le commercial, 'model' pour le client (IA)
          parts: [{ text: msg.text }]
        });
      });
      // Ajouter le dernier message du commercial (l'actuel userTranscript)
      geminiHistory.push({ role: 'user', parts: [{ text: userTranscript }] });
      // Le prompt initial est implicitement le contexte pour le chat.
      // On peut aussi le passer explicitement si on utilise startChat avec un historique.
    }
    
    let aiResponseText;

    if (geminiHistory.length > 0) {
      // Utiliser un chat session pour les tours suivants
      const chat = model.startChat({
        history: geminiHistory.slice(0, -1), // Historique sans le dernier message utilisateur
        // generationConfig: { maxOutputTokens: 100 } // Optionnel
      });
      const result = await chat.sendMessage(userTranscript); // Envoyer le dernier message utilisateur
      const response = result.response;
      aiResponseText = response.text();
    } else {
      // Premier tour, utiliser generateContent avec le prompt complet
      const result = await model.generateContent(prompt);
      const response = result.response;
      aiResponseText = response.text();
    }
    
    res.json({ aiResponse: aiResponseText });

  } catch (error) {
    console.error('Erreur dans /api/chat:', error.message, error.stack);
    // Transmettre plus de détails sur l'erreur si c'est une erreur de l'API Google
    if (error.response && error.response.data) {
      return res.status(500).json({ error: 'Erreur de l\'API Gemini.', details: error.response.data });
    }
    res.status(500).json({ error: 'Erreur interne du serveur.' });
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
