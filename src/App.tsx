import React, { useState, useEffect } from 'react'; // Ajout de useEffect
import './App.css';
import ScenarioSelection from './components/ScenarioSelection';
import SimulationControls from './components/SimulationControls';
import ConversationView from './components/ConversationView';
import ResultsView from './components/ResultsView';
import useSpeechRecognition from './hooks/useSpeechRecognition'; // Import du hook

// Définition du type pour un scénario
export interface Scenario {
  id: string;
  title: string;
  description: string;
  // promptInitialIA?: string; // Pour plus tard
}

// Données des scénarios (pourraient être dans un fichier séparé plus tard)
const scenariosData: Scenario[] = [
  { id: 'hesitant', title: 'Client Hésitant', description: 'Le client montre de l\'intérêt mais exprime des doutes et a besoin d\'être rassuré.' },
  { id: 'pressed', title: 'Client Pressé', description: 'Le client a peu de temps et veut aller droit au but.' },
  { id: 'curious', title: 'Client Curieux', description: 'Le client pose beaucoup de questions techniques et de détail.' },
  { id: 'budget', title: 'Client Sensible au Prix', description: 'Le client est très concerné par le budget et cherche la meilleure offre.' },
];

// Définition du type pour un message de conversation
export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
}

function App() {
  const [scenarios] = useState<Scenario[]>(scenariosData);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [isAiResponding, setIsAiResponding] = useState(false); // Nouvel état
  const [apiError, setApiError] = useState<string | null>(null);   // Nouvel état

  // Fonction pour appeler le backend et obtenir la réponse de l'IA
  const getAiResponse = async (userMessageText: string, currentConversation: Message[]) => {
    if (!selectedScenario) return;

    setIsAiResponding(true);
    setApiError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userTranscript: userMessageText,
          scenario: selectedScenario,
          conversationHistory: currentConversation.slice(0, -1) // Envoyer l'historique SANS le dernier message utilisateur actuel
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      if (data.aiResponse) {
        const aiMessage: Message = { id: Date.now().toString() + '_ai', text: data.aiResponse, sender: 'ai' };
        setConversation(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error("Erreur lors de l'appel à /api/chat:", error);
      let errorMessage = "Une erreur inconnue est survenue lors de la communication avec l'IA.";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      setApiError(errorMessage);
    } finally {
      setIsAiResponding(false);
    }
  };
  
  const handleSpeechResult = (finalTranscript: string) => {
    console.log("Transcription finale reçue:", finalTranscript);
    const trimmedTranscript = finalTranscript.trim();
    if (trimmedTranscript) {
      // Ajoute le message utilisateur à la conversation, PUIS appelle l'IA
      // Il faut passer la conversation *après* l'ajout du message utilisateur pour l'historique correct
      setConversation(prevConversation => {
        const userMessage: Message = { id: Date.now().toString() + '_user', text: trimmedTranscript, sender: 'user' };
        const newConversation = [...prevConversation, userMessage];
        getAiResponse(trimmedTranscript, newConversation); // Passer la nouvelle conversation
        return newConversation;
      });
    }
  };

  const {
    transcript, // Transcription accumulée par le hook (morceaux finaux)
    interimTranscript, // Transcription intermédiaire actuelle
    isListening,
    startListening,
    stopListening,
    error: speechError,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition({ onResult: handleSpeechResult });

  const handleSelectScenario = (scenario: Scenario) => {
    setSelectedScenario(scenario);
    setConversation([]); // Réinitialiser la conversation si le scénario change
    setIsSimulationRunning(false); // Arrêter la simulation si en cours
    if (isListening) stopListening(); // Arrêter l'écoute si en cours
    console.log("Scénario sélectionné:", scenario.title);
  };

  // Gérer le démarrage/arrêt de la simulation et de l'écoute
  const toggleSimulationAndListening = () => {
    if (!selectedScenario) {
      alert("Veuillez d'abord sélectionner un scénario.");
      return;
    }

    if (isListening) { // Si on écoute, on arrête
      stopListening();
      // On pourrait considérer que la simulation s'arrête ici ou après la réponse de l'IA
      // setIsSimulationRunning(false); // Pour l'instant, on arrête l'écoute seulement
    } else { // Si on n'écoute pas, on commence
      setConversation([]); // Réinitialiser la conversation à chaque nouveau démarrage de simulation
      startListening();
      setIsSimulationRunning(true); // Marquer la simulation comme active
    }
  };
  
  // Afficher un message d'erreur si la reconnaissance vocale n'est pas supportée
  useEffect(() => {
    if (!browserSupportsSpeechRecognition && !speechError) { // Afficher seulement si pas déjà une autre erreur de speech
      alert("La reconnaissance vocale n'est pas supportée par votre navigateur. Veuillez essayer avec Chrome ou Edge.");
    }
  }, [browserSupportsSpeechRecognition, speechError]);

  return (
    <div className="app-container">
      {apiError && <p style={{ color: 'orange', textAlign: 'center' }}>Erreur API: {apiError}</p>}
      {speechError && <p style={{ color: 'red', textAlign: 'center' }}>{speechError}</p>}
      <header>
        <h1>CoachSales AI</h1>
      </header>
      <main>
        <section id="scenario-selection" className="app-section">
          <h2>Section 1: Choisir un scénario</h2>
          <ScenarioSelection 
            scenarios={scenarios}
            selectedScenario={selectedScenario}
            onSelectScenario={handleSelectScenario}
          />
        </section>

        <section id="simulation-start" className="app-section">
          <h2>Section 2: Démarrer la simulation</h2>
          <SimulationControls 
            onToggleListening={toggleSimulationAndListening} 
            isListening={isListening}
            disabled={!selectedScenario || !browserSupportsSpeechRecognition || isAiResponding} 
          />
          {isAiResponding && <p className="placeholder-text" style={{textAlign: 'center', marginTop: '10px'}}>🤖 L'IA réfléchit...</p>}
        </section>

        <section id="conversation-display" className="app-section">
          <h2>Section 3: Affichage de la conversation en direct</h2>
          <ConversationView 
            messages={conversation}
            interimTranscript={interimTranscript}
          />
        </section>

        <section id="results-display" className="app-section">
          <h2>Section 4: Résultats</h2>
          <ResultsView />
        </section>
      </main>
      <footer>
        <p>&copy; {new Date().getFullYear()} CoachSales AI</p>
      </footer>
    </div>
  );
}

export default App;
// Suppression de l'accolade fermante en trop qui correspondait à la première déclaration erronée de function App()
