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
  audioContent?: string | null;
}

const IS_MOBILE_DEVICE = /Mobi|Android/i.test(navigator.userAgent);

function App() {
  type AppStep = 'scenarioSelection' | 'simulation' | 'results';

  const [currentStep, setCurrentStep] = useState<AppStep>('scenarioSelection');
  const [scenarios] = useState<Scenario[]>(scenariosData);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastProcessedUserMessageId, setLastProcessedUserMessageId] = useState<string | null>(null);

  const handleSpeechResultCb = useCallback((finalTranscript: string) => {
    const trimmedTranscript = finalTranscript.trim();
    if (trimmedTranscript) {
      setConversation(prev => [...prev, { id: Date.now().toString() + '_user', text: trimmedTranscript, sender: 'user' }]);
    }
  }, []); // setConversation est stable

  const speechRecognitionHook = useSpeechRecognition({ onResult: handleSpeechResultCb });
  const { interimTranscript, isListening, startListening, stopListening, error: speechError, browserSupportsSpeechRecognition } = speechRecognitionHook;

  const playAiAudioCb = useCallback((audioContent: string) => {
    if (isListening) stopListening();
    setIsAiSpeaking(true);
    const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
    audio.play().catch(e => { // Ajout de .catch pour les erreurs de play()
      console.error("Erreur audio.play():", e);
      setIsAiSpeaking(false); // S'assurer de réinitialiser l'état
      if (currentStep === 'simulation') startListening(); // Tenter de redémarrer l'écoute
    });
    audio.onended = () => {
      setIsAiSpeaking(false);
      if (currentStep === 'simulation') startListening();
    };
    audio.onerror = (e) => {
      console.error("Erreur de l'élément Audio:", e);
      setIsAiSpeaking(false);
      if (currentStep === 'simulation') startListening();
    };
  }, [currentStep, isListening, startListening, stopListening, setIsAiSpeaking]);

  const getAiResponseCb = useCallback(async (userMessageText: string, currentConvHistory: Message[]) => {
    if (!selectedScenario) return;
    setIsAiResponding(true);
    setApiError(null);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userTranscript: userMessageText, scenario: selectedScenario, conversationHistory: currentConvHistory.slice(0, -1) }),
      });
      setIsAiResponding(false);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
      }
      const data = await response.json();
      if (data.aiResponse) {
        const aiMessage: Message = { id: Date.now().toString() + '_ai', text: data.aiResponse, sender: 'ai', audioContent: data.audioContent };
        setConversation(prev => [...prev, aiMessage]);
        if (data.audioContent && !IS_MOBILE_DEVICE) {
          playAiAudioCb(data.audioContent);
        } else if (!data.audioContent && currentStep === 'simulation') {
          if (!isListening) startListening(); // Redémarrer seulement si pas déjà en écoute
        }
      }
    } catch (error) {
      console.error("Erreur API ou audio:", error);
      let errMsg = "Une erreur inconnue est survenue.";
      if (error instanceof Error) errMsg = error.message;
      else if (typeof error === 'string') errMsg = error;
      setApiError(errMsg);
      setIsAiResponding(false);
      setIsAiSpeaking(false);
    }
  }, [selectedScenario, currentStep, playAiAudioCb, startListening, isListening, /*dépendances stables:*/ setConversation, setIsAiResponding, setApiError, setIsAiSpeaking]);

  useEffect(() => {
    if (conversation.length > 0) {
      const lastMessage = conversation[conversation.length - 1];
      if (lastMessage.sender === 'user' && lastMessage.id !== lastProcessedUserMessageId && !isAiResponding && !isAiSpeaking) {
        setLastProcessedUserMessageId(lastMessage.id);
        getAiResponseCb(lastMessage.text, conversation);
      }
    }
  }, [conversation, isAiResponding, isAiSpeaking, getAiResponseCb, lastProcessedUserMessageId /*, setLastProcessedUserMessageId est stable*/]);

  const handleSelectScenario = (scenario: Scenario) => {
    setSelectedScenario(scenario);
    setConversation([]);
    if (isListening) stopListening();
    setCurrentStep('simulation');
    setLastProcessedUserMessageId(null);
  };

  const toggleListening = () => {
    if (isAiSpeaking) return;
    if (isListening) stopListening();
    else startListening();
  };

  const handleEndSimulation = () => {
    if (isListening) stopListening();
    setCurrentStep('results');
  };
  
  useEffect(() => {
    if (!browserSupportsSpeechRecognition && !speechError) {
      alert("La reconnaissance vocale n'est pas supportée.");
    }
  }, [browserSupportsSpeechRecognition, speechError]);

  return (
    <div className="app-container">
      {apiError && <p style={{color: 'orange', textAlign: 'center'}}>Erreur API: {apiError}</p>}
      {speechError && <p style={{color: 'red', textAlign: 'center'}}>{speechError}</p>}
      {IS_MOBILE_DEVICE && currentStep === 'simulation' && <p style={{textAlign: 'center', padding: '10px', backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffeeba', borderRadius: '4px'}}>Note: Sur mobile, cliquez sur ▶️ à côté du message de l'IA pour l'entendre.</p>}
      <header><h1>CoachSales AI</h1></header>
      <main>
        {currentStep === 'scenarioSelection' && (
          <section id="scenario-selection" className="app-section">
            <h2>Étape 1: Choisir un scénario</h2>
            <ScenarioSelection scenarios={scenarios} selectedScenario={selectedScenario} onSelectScenario={handleSelectScenario} />
          </section>
        )}
        {currentStep === 'simulation' && selectedScenario && (
          <>
            <section id="simulation-info" className="app-section">
              <h2>Simulation: {selectedScenario.title}</h2>
              <p className="placeholder-text">{selectedScenario.description}</p>
            </section>
            <section id="simulation-controls" className="app-section">
              <h3>Votre tour :</h3>
              <SimulationControls onToggleListening={toggleListening} isListening={isListening} disabled={!browserSupportsSpeechRecognition || isAiResponding || isAiSpeaking} />
              {isAiResponding && !isAiSpeaking && <p className="placeholder-text" style={{textAlign: 'center', marginTop: '10px'}}>🤖 L'IA réfléchit...</p>}
              {isAiSpeaking && <p className="placeholder-text" style={{textAlign: 'center', marginTop: '10px', color: 'purple'}}>🔊 L'IA parle...</p>}
            </section>
            <section id="conversation-display" className="app-section">
              <h3>Conversation :</h3>
              <ConversationView messages={conversation} interimTranscript={interimTranscript} onPlayAiAudio={playAiAudioCb} isMobile={IS_MOBILE_DEVICE} />
            </section>
            <button onClick={handleEndSimulation} style={{marginTop: '20px', backgroundColor: '#dc3545'}}>Terminer & Voir Résultats</button>
          </>
        )}
        {currentStep === 'results' && (
          <section id="results-display" className="app-section">
            <h2>Étape 3: Résultats</h2>
            {selectedScenario && <p>Scénario: {selectedScenario.title}</p>}
            <ResultsView conversation={conversation} /> 
            <button onClick={() => { setCurrentStep('scenarioSelection'); setLastProcessedUserMessageId(null); }}>Nouvelle simulation</button>
          </section>
        )}
      </main>
      <footer><p>&copy; {new Date().getFullYear()} CoachSales AI</p></footer>
    </div>
  );
}
export default App;
