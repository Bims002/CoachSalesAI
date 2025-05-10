import { useState, useEffect, useCallback } from 'react'; // Ajout de useCallback
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
  type AppStep = 'scenarioSelection' | 'simulation' | 'results';

  const [currentStep, setCurrentStep] = useState<AppStep>('scenarioSelection');
  const [scenarios] = useState<Scenario[]>(scenariosData);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // 1. Définir handleSpeechResult (sera passé au hook)
  // Ce callback met juste à jour la conversation avec le message de l'utilisateur.
  const handleSpeechResult = useCallback((finalTranscript: string) => {
    console.log("Transcription finale reçue (dans handleSpeechResult):", finalTranscript);
    const trimmedTranscript = finalTranscript.trim();
    if (trimmedTranscript) {
      setConversation(prevConversation => [
        ...prevConversation,
        { id: Date.now().toString() + '_user', text: trimmedTranscript, sender: 'user' }
      ]);
    }
  }, []); // setConversation est stable

  // 2. Initialiser useSpeechRecognition
  const {
    interimTranscript,
    isListening,
    startListening,
    stopListening,
    error: speechError,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition({ onResult: handleSpeechResult });

  // 3. Définir getAiResponse (sera appelé par un useEffect)
  const getAiResponse = useCallback(async (userMessageText: string, currentConvHistory: Message[]) => {
    if (!selectedScenario) return;

    console.log('getAiResponse called with history length:', currentConvHistory.length); // Forcer l'utilisation
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
        // Si nous sommes toujours en mode simulation, redémarrer l'écoute pour le prochain tour de l'utilisateur.
        if (currentStep === 'simulation' && !isListening) { // Vérifier aussi !isListening au cas où l'utilisateur aurait déjà cliqué pour arrêter
          startListening();
        }
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
  // Dépendances pour getAiResponse : selectedScenario, currentStep, isListening, startListening.
  }, [selectedScenario, currentStep, isListening, startListening]);

  // 4. useEffect pour appeler getAiResponse lorsque la conversation change (nouveau message utilisateur)
  useEffect(() => {
    if (conversation.length > 0) {
      const lastMessage = conversation[conversation.length - 1];
      if (lastMessage.sender === 'user' && !isAiResponding) {
        // Le dernier message est de l'utilisateur, et l'IA ne répond pas déjà.
        // L'historique à envoyer à l'IA est la conversation actuelle (qui inclut le dernier message utilisateur).
        getAiResponse(lastMessage.text, conversation);
      }
    }
  // Dépendances : conversation, isAiResponding, getAiResponse.
  }, [conversation, isAiResponding, getAiResponse]);


  const handleSelectScenario = (scenario: Scenario) => {
    setSelectedScenario(scenario);
    setConversation([]);
    if (isListening) stopListening();
    console.log("Scénario sélectionné:", scenario.title);
    setCurrentStep('simulation'); // Passer à l'étape de simulation
  };

  // Gérer le démarrage/arrêt de l'écoute pendant la simulation
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      // Ne pas réinitialiser la conversation ici, car on est en cours de simulation
      startListening();
    }
  };

  const handleEndSimulation = () => {
    if (isListening) stopListening();
    // Ici, on pourrait faire une analyse finale de la conversation avant de passer aux résultats
    console.log("Simulation terminée. Conversation:", conversation);
    setCurrentStep('results');
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
        {currentStep === 'scenarioSelection' && (
          <section id="scenario-selection" className="app-section">
            <h2>Étape 1: Choisir un scénario</h2>
            <ScenarioSelection 
              scenarios={scenarios}
              selectedScenario={selectedScenario}
              onSelectScenario={handleSelectScenario}
            />
          </section>
        )}

        {currentStep === 'simulation' && selectedScenario && (
          <>
            <section id="simulation-info" className="app-section">
              <h2>Simulation en cours : {selectedScenario.title}</h2>
              <p className="placeholder-text">{selectedScenario.description}</p>
            </section>
            
            <section id="simulation-controls" className="app-section">
              <h3>Votre tour :</h3>
              <SimulationControls 
                onToggleListening={toggleListening} 
                isListening={isListening}
                disabled={!browserSupportsSpeechRecognition || isAiResponding} 
              />
              {isAiResponding && <p className="placeholder-text" style={{textAlign: 'center', marginTop: '10px'}}>🤖 L'IA réfléchit...</p>}
            </section>

            <section id="conversation-display" className="app-section">
              <h3>Conversation :</h3>
              <ConversationView 
                messages={conversation}
                interimTranscript={interimTranscript}
              />
            </section>
            
            <button onClick={handleEndSimulation} style={{marginTop: '20px', backgroundColor: '#dc3545'}}>
              Terminer la simulation et voir les résultats
            </button>
          </>
        )}

        {currentStep === 'results' && (
          <section id="results-display" className="app-section">
            <h2>Étape 3: Résultats de la simulation</h2>
            {selectedScenario && <p>Scénario: {selectedScenario.title}</p>}
            {/* Passer la conversation complète à ResultsView pour affichage/analyse */}
            <ResultsView conversation={conversation} /> 
            <button onClick={() => setCurrentStep('scenarioSelection')}>Nouvelle simulation</button>
          </section>
        )}
      </main>
      <footer>
        <p>&copy; {new Date().getFullYear()} CoachSales AI</p>
      </footer>
    </div>
  );
}

export default App;
// Suppression de l'accolade fermante en trop qui correspondait à la première déclaration erronée de function App()
