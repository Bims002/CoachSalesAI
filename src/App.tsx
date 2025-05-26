import { useState, useEffect, useCallback } from 'react';
import './App.css';
import ScenarioSelection from './components/ScenarioSelection';
import SimulationControls from './components/SimulationControls';
// import ConversationView from './components/ConversationView'; // Retiré de la vue simulation
import ResultsView from './components/ResultsView';
import HotjarTracking from './components/HotjarTracking';
import HistoryView from './components/HistoryView';
import type { SimulationRecord } from './components/HistoryView';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import AuthForm from './components/AuthForm';
import ContextInput from './components/ContextInput';
import GlobalLoader from './components/GlobalLoader'; // Importer GlobalLoader
import { useAuth } from './contexts/AuthContext';
import useSpeechRecognition from './hooks/useSpeechRecognition';
import { db } from './firebase-config';
import { collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore';

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
const MAX_HISTORY_MESSAGES = 2; 

export type AppStep = 'scenarioSelection' | 'contextInput' | 'simulation' | 'results' | 'history' | 'dashboard' | 'auth';

function App() {
  const { currentUser } = useAuth();
  const [currentStep, setCurrentStep] = useState<AppStep>(currentUser ? 'scenarioSelection' : 'auth');
  const [scenarios] = useState<Scenario[]>(scenariosData);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [userContext, setUserContext] = useState<string>(''); 
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastProcessedUserMessageId, setLastProcessedUserMessageId] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<any | null>(null); 
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [simulationTime, setSimulationTime] = useState(0); 
  const [timerIntervalId, setTimerIntervalId] = useState<NodeJS.Timeout | null>(null); 

  const [history, setHistory] = useState<SimulationRecord[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (currentUser) {
        try {
          const userHistoryCollection = collection(db, `users/${currentUser.uid}/simulations`);
          const q = query(userHistoryCollection, orderBy('date', 'desc'), limit(20));
          const querySnapshot = await getDocs(q);
          const firestoreHistory: SimulationRecord[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            firestoreHistory.push({ 
              id: doc.id, 
              date: data.date instanceof Timestamp ? data.date.toDate().toLocaleString() : new Date(data.date).toLocaleString(), 
              scenarioTitle: data.scenarioTitle,
              score: data.score,
              summary: data.summary
            });
          });
          setHistory(firestoreHistory);
        } catch (error) {
          console.error("Erreur lors de la récupération de l'historique Firestore:", error);
        }
      } else {
        const storedHistory = localStorage.getItem('coachSalesLocalHistory');
        if (storedHistory) {
          setHistory(JSON.parse(storedHistory));
        } else {
          setHistory([]);
        }
      }
    };
    fetchHistory();
  }, [currentUser]); 
  
  const addToHistory = async (recordData: Omit<SimulationRecord, 'id' | 'date'>) => {
    const newRecord: SimulationRecord = {
      ...recordData,
      id: Date.now().toString(), 
      date: new Date().toLocaleString(), 
    };

    if (currentUser) {
      try {
        const userHistoryCollection = collection(db, `users/${currentUser.uid}/simulations`);
        await addDoc(userHistoryCollection, { ...recordData, date: serverTimestamp() });
        setHistory(prevHistory => [newRecord, ...prevHistory].slice(0, 20));
      } catch (error) {
        console.error("Erreur lors de l'ajout à l'historique Firestore:", error);
      }
    } else {
      setHistory(prevHistory => {
        const updatedHistory = [newRecord, ...prevHistory].slice(0, 20);
        localStorage.setItem('coachSalesLocalHistory', JSON.stringify(updatedHistory));
        return updatedHistory;
      });
    }
  };
  
  useEffect(() => {
    if (analysisResults && selectedScenario) {
      const recordData: Omit<SimulationRecord, 'id' | 'date'> = {
        scenarioTitle: selectedScenario.title,
        score: analysisResults.score ?? null,
        summary: analysisResults.ameliorations?.join(', ') ?? 'Aucun point spécifique',
      };
      addToHistory(recordData);
    }
  }, [analysisResults, selectedScenario, currentUser]); 

  const handleSpeechResultCb = useCallback((finalTranscript: string) => {
    const trimmedTranscript = finalTranscript.trim();
    if (trimmedTranscript) {
      setConversation(prev => [...prev, { id: Date.now().toString() + '_user', text: trimmedTranscript, sender: 'user' }]);
    }
  }, []);

  const speechRecognitionHook = useSpeechRecognition({ onResult: handleSpeechResultCb });
  const { isListening, startListening, stopListening, error: speechError, browserSupportsSpeechRecognition } = speechRecognitionHook;

  const playAiAudioCb = useCallback((audioContent: string) => {
    if (isListening) stopListening();
    setIsAiSpeaking(true);
    const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
    audio.play().catch(e => {
      console.error("Erreur audio.play():", e);
      setIsAiSpeaking(false);
      if (currentStep === 'simulation' && !isAiResponding && !isAnalyzing) {
         startListening();
      }
    });
    audio.onended = () => {
      setIsAiSpeaking(false);
      if (currentStep === 'simulation' && !isAiResponding && !isAnalyzing) {
         startListening();
      }
    };
    audio.onerror = (e) => {
      console.error("Erreur de l'élément Audio:", e);
      setIsAiSpeaking(false);
      if (currentStep === 'simulation' && !isAiResponding && !isAnalyzing) {
         startListening();
      }
    };
  }, [currentStep, isListening, startListening, stopListening, setIsAiSpeaking, isAiResponding, isAnalyzing]);

  const getAiResponseCb = useCallback(async (userMessageText: string, currentConvHistory: Message[]) => {
    if (!selectedScenario || !userMessageText.trim() || !userContext.trim()) { 
      console.warn("Scénario, contexte ou message utilisateur vide, appel API annulé.");
      setIsAiResponding(false);
      return;
    }
    setIsAiResponding(true);
    setApiError(null);

    const historyForApi = currentConvHistory
      .slice(0, -1) 
      .slice(-MAX_HISTORY_MESSAGES * 2) 
      .map(msg => ({
        text: msg.text, 
        sender: msg.sender,
      }));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userTranscript: userMessageText, 
          scenario: selectedScenario, 
          conversationHistory: historyForApi,
          initialContext: userContext 
        }),
      });
      setIsAiResponding(false);
      if (!response.ok) {
        let errorResponseMessage = `Erreur HTTP: ${response.status} ${response.statusText}`;
        try {
            const errorData = await response.json();
            errorResponseMessage = errorData.error || errorResponseMessage;
        } catch (e) { /* Ignorer */ }
        throw new Error(errorResponseMessage);
      }
      const data = await response.json();
      if (data.aiResponse) {
        const aiMessage: Message = { id: Date.now().toString() + '_ai', text: data.aiResponse, sender: 'ai', audioContent: data.audioContent };
        setConversation(prev => [...prev, aiMessage]);
        if (data.audioContent && !IS_MOBILE_DEVICE) {
          playAiAudioCb(data.audioContent);
        } else if (!data.audioContent && currentStep === 'simulation' && !isAnalyzing) { // Ne pas redémarrer si analyse en cours
          if (!isListening) startListening();
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
  }, [selectedScenario, currentStep, playAiAudioCb, startListening, isListening, stopListening, setIsAiSpeaking, setConversation, setIsAiResponding, setApiError, userContext, isAnalyzing]);

  const runAnalysis = useCallback(async () => {
    if (conversation.length === 0) {
      console.warn("Aucune conversation à analyser.");
      setAnalysisResults(null);
      setCurrentStep('results'); 
      return;
    }
    setIsAnalyzing(true);
    setApiError(null); 
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation }), 
      });
      setIsAnalyzing(false);
      if (!response.ok) {
        let errorResponseMessage = `Erreur HTTP lors de l'analyse: ${response.status} ${response.statusText}`;
        try {
            const errorData = await response.json();
            errorResponseMessage = errorData.error || errorResponseMessage;
        } catch (e) { /* Ignorer */ }
        throw new Error(errorResponseMessage);
      }
      const data = await response.json();
      setAnalysisResults(data); 
      setCurrentStep('results'); 
    } catch (error) {
      console.error("Erreur lors de l'analyse:", error);
      let errMsg = "Une erreur est survenue lors de l'analyse de la simulation.";
      if (error instanceof Error) errMsg = error.message;
      else if (typeof error === 'string') errMsg = error;
      setApiError(errMsg);
      setIsAnalyzing(false);
      setAnalysisResults(null); 
      setCurrentStep('results'); 
    }
  }, [conversation, setAnalysisResults, setCurrentStep, setIsAnalyzing, setApiError]);

  useEffect(() => {
    if (conversation.length > 0) {
      const lastMessage = conversation[conversation.length - 1];
      if (lastMessage.sender === 'user' && lastMessage.id !== lastProcessedUserMessageId && !isAiResponding && !isAiSpeaking && !isAnalyzing) { 
        setLastProcessedUserMessageId(lastMessage.id);
        getAiResponseCb(lastMessage.text, conversation);
      }
    }
  }, [conversation, isAiResponding, isAiSpeaking, isAnalyzing, getAiResponseCb, lastProcessedUserMessageId, setLastProcessedUserMessageId]);

  const handleSelectScenario = (scenario: Scenario) => {
    setSelectedScenario(scenario);
    setConversation([]);
    setUserContext(''); 
    if (isListening) stopListening();
    setCurrentStep('contextInput'); 
    setLastProcessedUserMessageId(null);
    setAnalysisResults(null);
    setApiError(null);
  };

  const handleSubmitContext = (context: string) => {
    setUserContext(context);
    setConversation([]); 
    setSimulationTime(0); 
    setCurrentStep('simulation'); 
  };

  const startSimulationTimer = () => {
    if (!timerIntervalId && currentStep === 'simulation') { 
      const newIntervalId = setInterval(() => {
        setSimulationTime(prevTime => prevTime + 1);
      }, 1000);
      setTimerIntervalId(newIntervalId);
    }
  };

  const customStartListening = () => {
    startListening(); 
    startSimulationTimer(); 
  };

  const toggleListening = () => {
    if (isAiSpeaking || isAnalyzing) return; 
    if (isListening) {
      stopListening();
    } else {
      customStartListening(); 
    }
  };

  const handleEndSimulation = () => {
    if (isListening) stopListening();
    if (timerIntervalId) {
      clearInterval(timerIntervalId); 
      setTimerIntervalId(null);
    }
    runAnalysis(); 
  };
  
  useEffect(() => {
    return () => {
      if (timerIntervalId) {
        clearInterval(timerIntervalId);
      }
    };
  }, [timerIntervalId]);

  useEffect(() => {
    if (!browserSupportsSpeechRecognition && !speechError) {
      alert("La reconnaissance vocale n'est pas supportée.");
    }
  }, [browserSupportsSpeechRecognition, speechError]);

  useEffect(() => {
    console.log(`App useEffect (Auth): currentUser=${!!currentUser}, currentStep=${currentStep}`);
    if (currentUser && currentStep === 'auth') {
      console.log("App useEffect (Auth): Utilisateur connecté sur page auth, redirection vers scenarioSelection.");
      setCurrentStep('scenarioSelection'); 
    } else if (!currentUser && (currentStep === 'dashboard' || currentStep === 'history')) {
      console.log(`App useEffect (Auth): Invité essayant d'accéder à ${currentStep}, redirection vers auth.`);
      setCurrentStep('auth'); 
    }
  }, [currentUser, currentStep]); // Retiré setCurrentStep des dépendances pour éviter boucle si setCurrentStep est appelé à l'intérieur

  const handleNavigation = (step: AppStep) => {
    console.log(`handleNavigation: Reçu step=${step}, currentUser=${!!currentUser}, currentStep actuel=${currentStep}`);
    if (!currentUser && (step === 'dashboard' || step === 'history')) {
      console.log("handleNavigation: Invité essayant d'accéder à une route protégée, redirection vers auth.");
      setCurrentStep('auth'); 
    } else { 
      console.log(`handleNavigation: Mise à jour de currentStep vers ${step}.`);
      setCurrentStep(step);
    }
  };
  
  console.log(`App Rendu: currentStep=${currentStep}, currentUser=${!!currentUser}`);

  return (
    <div className="app-layout">
      <HotjarTracking />
      <GlobalLoader isLoading={isAnalyzing} /> {/* GlobalLoader uniquement pour l'analyse */}
      <Navbar onNavigate={handleNavigation} currentStep={currentStep} />
      <main className="main-content">
        <div className="app-container"> 
          {apiError && <p style={{color: 'orange', textAlign: 'center', marginBottom: '20px'}}>Erreur API: {apiError}</p>}
          {speechError && <p style={{color: 'red', textAlign: 'center', marginBottom: '20px'}}>{speechError}</p>}
          {IS_MOBILE_DEVICE && currentStep === 'simulation' && !isAnalyzing && 
            <p style={{textAlign: 'center', padding: '10px', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: `1px solid var(--color-border)`, borderRadius: '8px', marginBottom: '20px'}}>
              Note: Sur mobile, cliquez sur 🔊 à côté du message de l'IA pour l'entendre.
            </p>
          }
          
          {currentStep === 'scenarioSelection' && (
            <section id="scenario-selection" className="app-section">
              <h2>Choisir un Scénario</h2>
              <ScenarioSelection scenarios={scenarios} selectedScenario={selectedScenario} onSelectScenario={handleSelectScenario} />
            </section>
          )}
          {currentStep === 'contextInput' && selectedScenario && (
            <ContextInput onSubmitContext={handleSubmitContext} selectedScenarioTitle={selectedScenario.title} />
          )}
          {currentStep === 'simulation' && selectedScenario && userContext && (
            <div className="simulation-interface app-section"> 
              <div className="simulation-panels-container">
                <div className="simulation-panel">
                  <img src="/assets/img1.png" alt="Client IA" className="avatar" onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/100?text=IA')} />
                  <h4>{selectedScenario.title}</h4>
                  <div className="last-message">
                    {/* L'indicateur isAiSpeaking reste ici car il est spécifique au panneau IA */}
                    {isAiSpeaking && <span style={{fontSize: '2em', animation: 'pulse 1.5s infinite ease-in-out'}}>🔊</span>} 
                    {/* Afficher le dernier message de l'IA si elle ne parle pas et ne réfléchit pas */}
                    {!isAiSpeaking && !isAiResponding && (conversation.filter(m => m.sender === 'ai').slice(-1)[0]?.text || "En attente de votre réponse...")}
                    {/* Si l'IA réfléchit, on peut afficher un message placeholder ici ou rien si l'indicateur est ailleurs */}
                    {isAiResponding && !isAiSpeaking && <p className="placeholder-text" style={{fontStyle: 'italic'}}>...</p>}
                  </div>
                </div>
                <div className="simulation-panel">
                  <img src={currentUser?.photoURL || "/assets/img2.png"} alt="Vous" className="avatar" onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/100?text=Vous')}/>
                  <h4>Vous {currentUser?.displayName ? `(${currentUser.displayName})` : ''}</h4>
                  <div className="last-message">
                    {isListening && <span style={{fontSize: '2em'}} className="mic-icon-listening">🎤</span>}
                    {!isListening && conversation.filter(m => m.sender === 'user').slice(-1)[0]?.text || "Prêt à parler..."}
                  </div>
                </div>
              </div>

              <div className="simulation-timer">
                {Math.floor(simulationTime / 60).toString().padStart(2, '0')}:{(simulationTime % 60).toString().padStart(2, '0')}
              </div>

              <div id="simulation-controls" className="app-section" style={{background: 'transparent', border: 'none', boxShadow: 'none', padding: 0}}>
                <SimulationControls 
                  onStartListening={customStartListening} 
                  onStopListening={stopListening} 
                  isListening={isListening} 
                  disabled={!browserSupportsSpeechRecognition || isAiResponding || isAiSpeaking || isAnalyzing} 
                />
                 {isListening && !isAiResponding && !isAiSpeaking && !isAnalyzing && (
                  <p className="placeholder-text" style={{ textAlign: 'center', marginTop: '15px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                    Parlez clairement dans un environnement calme...
                  </p>
                )}
                {/* Indicateurs textuels pour IA répond/parle, sous les contrôles */}
                {isAiResponding && !isAiSpeaking && !isAnalyzing && (
                  <div style={{ textAlign: 'center', marginTop: '10px' }}>
                    <div className="loader-ia"></div> {/* Spinner simple */}
                    <p className="placeholder-text">🤖 L'IA réfléchit...</p>
                  </div>
                )}
                 {/* L'indicateur isAiSpeaking est déjà dans le panneau IA, on peut le retirer d'ici si doublon */}
                {/* {isAiSpeaking && !isAnalyzing && <p className="placeholder-text" style={{textAlign: 'center', marginTop: '10px', color: 'var(--color-accent)'}}>🔊 L'IA parle...</p>} */}

              </div>
              
              <button onClick={handleEndSimulation} style={{marginTop: '30px', backgroundColor: '#dc3545', width: 'auto', padding: '10px 20px'}} disabled={isAiResponding || isAiSpeaking || isAnalyzing}>
                Terminer & Voir Résultats
              </button>
              {/* L'indicateur isAnalyzing est géré par GlobalLoader, pas besoin ici */}
            </div>
          )}
          {currentStep === 'results' && (
            <ResultsView 
              analysisResults={analysisResults}
              selectedScenarioTitle={selectedScenario?.title}
              conversation={conversation} 
              userContext={userContext} 
              onNewSimulation={() => { setCurrentStep('scenarioSelection'); setLastProcessedUserMessageId(null); setAnalysisResults(null); setApiError(null); }}
              isAnalyzing={isAnalyzing} // Passé pour afficher le loader spécifique de ResultsView si besoin
            />
          )}
          {currentStep === 'history' && (
            <section id="history-display" className="app-section">
              <h2>Historique des simulations</h2>
              <HistoryView history={history} onSelectRecord={(record) => {
                setSelectedScenario(scenarios.find(s => s.title === record.scenarioTitle) ?? null);
                setAnalysisResults({
                  score: record.score,
                  conseils: record.summary ? record.summary.split(', ') : [], 
                  ameliorations: record.summary ? record.summary.split(', ') : [],
                });
                setCurrentStep('results');
              }} />
              <button onClick={() => setCurrentStep('scenarioSelection')} style={{marginTop: '20px'}}>Retour à la sélection</button>
            </section>
          )}
          {currentStep === 'dashboard' && (
            <section id="dashboard-display" className="app-section">
              <Dashboard history={history} />
              <button onClick={() => setCurrentStep('scenarioSelection')} style={{marginTop: '20px'}}>Retour à la sélection</button>
            </section>
          )}
          {currentStep === 'auth' && (
            <section id="auth-display" className="app-section">
              <AuthForm onNavigateToGuest={handleNavigation} />
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
