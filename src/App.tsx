import { useState, useEffect, useCallback } from 'react';
import './App.css';
import ScenarioSelection from './components/ScenarioSelection';
import SimulationControls from './components/SimulationControls';
import ConversationView from './components/ConversationView';
import ResultsView from './components/ResultsView';
import useSpeechRecognition from './hooks/useSpeechRecognition';

export interface Scenario {
  id: string;
  title: string;
  description: string;
}

const scenariosData: Scenario[] = [
  { id: 'hesitant', title: 'Client Hésitant', description: 'Le client montre de l\'intérêt mais exprime des doutes et a besoin d\'être rassuré.' },
  { id: 'pressed', title: 'Client Pressé', description: 'Le client a peu de temps et veut aller droit au but.' },
  { id: 'curious', title: 'Client Curieux', description: 'Le client pose beaucoup de questions techniques et de détail.' },
  { id: 'budget', title: 'Client Sensible au Prix', description: 'Le client est très concerné par le budget et cherche la meilleure offre.' },
];

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
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastProcessedUserMessageId, setLastProcessedUserMessageId] = useState<string | null>(null); // Nouvel état

  const handleSpeechResult = useCallback((finalTranscript: string) => {
    const trimmedTranscript = finalTranscript.trim();
    if (trimmedTranscript) {
      setConversation(prevConversation => [
        ...prevConversation,
        { id: Date.now().toString() + '_user', text: trimmedTranscript, sender: 'user' }
      ]);
    }
  }, []); // setConversation est stable

  const {
    interimTranscript,
    isListening,
    startListening,
    stopListening,
    error: speechError,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition({ onResult: handleSpeechResult });

  const getAiResponse = useCallback(async (userMessageText: string, currentConvHistory: Message[]) => {
    if (!selectedScenario) return;

    setIsAiResponding(true);
    setApiError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userTranscript: userMessageText,
          scenario: selectedScenario,
          conversationHistory: currentConvHistory.slice(0, -1) 
        }),
      });

      setIsAiResponding(false); 

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      if (data.aiResponse) {
        const aiMessage: Message = { id: Date.now().toString() + '_ai', text: data.aiResponse, sender: 'ai' };
        setConversation(prev => [...prev, aiMessage]);

        if (data.audioContent) {
          if (isListening) stopListening();
          
          setIsAiSpeaking(true);
          const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
          audio.play();
          audio.onended = () => {
            setIsAiSpeaking(false);
            if (currentStep === 'simulation' && !isListening) {
              startListening();
            }
          };
          audio.onerror = () => {
            console.error("Erreur de lecture audio");
            setIsAiSpeaking(false);
            if (currentStep === 'simulation' && !isListening) {
              startListening();
            }
          }
        } else {
          if (currentStep === 'simulation' && !isListening) {
            startListening();
          }
        }
      }
    } catch (error) {
      console.error("Erreur lors de l'appel à /api/chat ou lecture audio:", error);
      let errorMessage = "Une erreur inconnue est survenue.";
      if (error instanceof Error) { errorMessage = error.message; }
      else if (typeof error === 'string') { errorMessage = error; }
      setApiError(errorMessage);
      setIsAiResponding(false);
      setIsAiSpeaking(false);
    }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore 
  }, [selectedScenario, currentStep, isListening, startListening, stopListening, setConversation, setIsAiResponding, setApiError, setIsAiSpeaking]);

  useEffect(() => {
    if (conversation.length > 0) {
      const lastMessage = conversation[conversation.length - 1];
      if (
        lastMessage.sender === 'user' &&
        lastMessage.id !== lastProcessedUserMessageId && // Vérifier si ce message a déjà été traité
        !isAiResponding &&
        !isAiSpeaking
      ) {
        setLastProcessedUserMessageId(lastMessage.id); // Marquer comme traité
        getAiResponse(lastMessage.text, conversation);
      }
    }
  }, [conversation, isAiResponding, isAiSpeaking, getAiResponse, lastProcessedUserMessageId, setLastProcessedUserMessageId]);

  const handleSelectScenario = (scenario: Scenario) => {
    setSelectedScenario(scenario);
    setConversation([]);
    if (isListening) stopListening();
    setCurrentStep('simulation');
    setLastProcessedUserMessageId(null); // Réinitialiser pour un nouveau scénario
  };

  const toggleListening = () => {
    if (isAiSpeaking) return; 

    if (isListening) {
      stopListening();
    } else {
      // Quand on commence une nouvelle écoute manuellement, réinitialiser l'ID du dernier message traité
      // pour permettre à la nouvelle transcription de déclencher une réponse IA.
      // Cependant, handleSpeechResult va créer un nouveau message avec un nouvel ID.
      // La réinitialisation de conversation dans toggleListening (si on commence un nouveau tour)
      // a été enlevée car la conversation est censée être continue.
      // setConversation([]); // Ne pas faire ça ici, la conversation est continue.
      startListening();
    }
  };

  const handleEndSimulation = () => {
    if (isListening) stopListening();
    setCurrentStep('results');
  };
  
  useEffect(() => {
    if (!browserSupportsSpeechRecognition && !speechError) {
      alert("La reconnaissance vocale n'est pas supportée par votre navigateur.");
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
                disabled={!browserSupportsSpeechRecognition || isAiResponding || isAiSpeaking} 
              />
              {isAiResponding && !isAiSpeaking && <p className="placeholder-text" style={{textAlign: 'center', marginTop: '10px'}}>🤖 L'IA réfléchit...</p>}
              {isAiSpeaking && <p className="placeholder-text" style={{textAlign: 'center', marginTop: '10px', color: 'purple'}}>🔊 L'IA parle...</p>}
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
