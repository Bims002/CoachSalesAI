import React, { useState, useEffect, useCallback } from 'react'; // Assurez-vous que React est importé
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import './App.css';
import ScenarioSelection from './components/ScenarioSelection';
import SimulationControls from './components/SimulationControls';
import ResultsView from './components/ResultsView';
import HotjarTracking from './components/HotjarTracking';
import HistoryView from './components/HistoryView';
import type { SimulationRecord } from './components/HistoryView';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import AuthForm from './components/AuthForm';
import ContextInput from './components/ContextInput';
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

interface ProtectedRouteProps {
  children: React.ReactNode; 
}

function App() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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

  const getCurrentAppStep = (pathname: string): AppStep => {
    if (pathname.startsWith('/auth')) return 'auth';
    if (pathname.startsWith('/context')) return 'contextInput';
    if (pathname.startsWith('/simulation')) return 'simulation';
    if (pathname.startsWith('/results')) return 'results';
    if (pathname.startsWith('/history')) return 'history';
    if (pathname.startsWith('/dashboard')) return 'dashboard';
    return 'scenarioSelection'; 
  };
  const currentAppStepForNavbar = getCurrentAppStep(location.pathname);

  useEffect(() => {
    const fetchHistory = async () => {
      if (currentUser) {
        try {
          const userHistoryCollection = collection(db, `users/${currentUser.uid}/simulations`);
          const q = query(userHistoryCollection, orderBy('date', 'desc'), limit(20));
          const querySnapshot = await getDocs(q);
          const firestoreHistory: SimulationRecord[] = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return { 
              id: doc.id, 
              date: data.date instanceof Timestamp ? data.date.toDate().toLocaleString() : new Date(data.date).toLocaleString(), 
              scenarioTitle: data.scenarioTitle,
              score: data.score,
              summary: data.summary
            };
          });
          setHistory(firestoreHistory);
        } catch (error) {
          console.error("Erreur Firestore (historique):", error);
        }
      } else {
        const storedHistory = localStorage.getItem('coachSalesLocalHistory');
        setHistory(storedHistory ? JSON.parse(storedHistory) : []);
      }
    };
    fetchHistory();
  }, [currentUser]); 
  
  const addToHistory = async (recordData: Omit<SimulationRecord, 'id' | 'date'>) => {
    const newRecordBase = { ...recordData, date: serverTimestamp() };
    const newRecordDisplay: SimulationRecord = {
        ...recordData,
        id: Date.now().toString(), 
        date: new Date().toLocaleString(), 
    };

    if (currentUser) {
      try {
        const userHistoryCollection = collection(db, `users/${currentUser.uid}/simulations`);
        await addDoc(userHistoryCollection, newRecordBase);
        setHistory(prevHistory => [newRecordDisplay, ...prevHistory].slice(0, 20));
      } catch (error) {
        console.error("Erreur Firestore (ajout historique):", error);
      }
    } else {
      setHistory(prevHistory => {
        const updatedHistory = [newRecordDisplay, ...prevHistory].slice(0, 20);
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
      setIsAiSpeaking(false);
      if (location.pathname.startsWith('/simulation') && !isAiResponding && !isAnalyzing) startListening();
    });
    audio.onended = () => {
      setIsAiSpeaking(false);
      if (location.pathname.startsWith('/simulation') && !isAiResponding && !isAnalyzing) startListening();
    };
    audio.onerror = () => {
      setIsAiSpeaking(false);
      if (location.pathname.startsWith('/simulation') && !isAiResponding && !isAnalyzing) startListening();
    };
  }, [location.pathname, isListening, startListening, stopListening, isAiResponding, isAnalyzing]);

  const getAiResponseCb = useCallback(async (userMessageText: string, currentConvHistory: Message[]) => {
    if (!selectedScenario || !userMessageText.trim() || !userContext.trim()) { 
      setIsAiResponding(false); return;
    }
    setIsAiResponding(true); setApiError(null);
    const historyForApi = currentConvHistory.slice(0, -1).slice(-MAX_HISTORY_MESSAGES * 2).map(msg => ({ text: msg.text, sender: msg.sender }));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userTranscript: userMessageText, scenario: selectedScenario, conversationHistory: historyForApi, initialContext: userContext }),
      });
      setIsAiResponding(false);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
      }
      const data = await response.json();
      if (data.aiResponse) {
        setConversation(prev => [...prev, { id: Date.now().toString() + '_ai', text: data.aiResponse, sender: 'ai', audioContent: data.audioContent }]);
        if (data.audioContent && !IS_MOBILE_DEVICE) playAiAudioCb(data.audioContent);
        else if (!data.audioContent && location.pathname.startsWith('/simulation') && !isAnalyzing && !isListening) startListening();
      }
    } catch (error: any) {
      setApiError(error.message || "Erreur inconnue.");
      setIsAiResponding(false); setIsAiSpeaking(false);
    }
  }, [selectedScenario, location.pathname, playAiAudioCb, startListening, isListening, stopListening, userContext, isAnalyzing]);

  const runAnalysis = useCallback(async () => {
    if (conversation.length === 0) { navigate('/results'); return; }
    setIsAnalyzing(true); setApiError(null); 
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation }), 
      });
      setIsAnalyzing(false);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur HTTP (analyse): ${response.status}`);
      }
      setAnalysisResults(await response.json()); 
      navigate('/results');
    } catch (error: any) {
      setApiError(error.message || "Erreur d'analyse.");
      setIsAnalyzing(false); setAnalysisResults(null); navigate('/results');
    }
  }, [conversation, navigate]);

  useEffect(() => {
    if (conversation.length > 0) {
      const lastMessage = conversation[conversation.length - 1];
      if (lastMessage.sender === 'user' && lastMessage.id !== lastProcessedUserMessageId && !isAiResponding && !isAiSpeaking && !isAnalyzing) { 
        setLastProcessedUserMessageId(lastMessage.id);
        getAiResponseCb(lastMessage.text, conversation);
      }
    }
  }, [conversation, isAiResponding, isAiSpeaking, isAnalyzing, getAiResponseCb, lastProcessedUserMessageId]);

  const handleSelectScenario = (scenario: Scenario) => {
    setSelectedScenario(scenario); setConversation([]); setUserContext(''); 
    if (isListening) stopListening();
    setLastProcessedUserMessageId(null); setAnalysisResults(null); setApiError(null);
    setIsAnalyzing(false); setIsAiResponding(false);
    navigate('/context'); 
  };

  const handleSubmitContext = (context: string) => {
    setUserContext(context); setConversation([]); setSimulationTime(0); 
    setIsAnalyzing(false); setIsAiResponding(false);
    navigate('/simulation'); 
  };

  const startSimulationTimer = () => {
    if (!timerIntervalId && location.pathname.startsWith('/simulation')) { 
      const newIntervalId = setInterval(() => setSimulationTime(prevTime => prevTime + 1), 1000);
      setTimerIntervalId(newIntervalId);
    }
  };

  const customStartListening = () => { startListening(); startSimulationTimer(); };
  const handleEndSimulation = () => {
    if (isListening) stopListening();
    if (timerIntervalId) { clearInterval(timerIntervalId); setTimerIntervalId(null); }
    runAnalysis(); 
  };
  
  useEffect(() => { return () => { if (timerIntervalId) clearInterval(timerIntervalId); }; }, [timerIntervalId]);
  useEffect(() => { if (!browserSupportsSpeechRecognition && !speechError) alert("Reconnaissance vocale non supportée."); }, [browserSupportsSpeechRecognition, speechError]);

  useEffect(() => {
    if (currentUser && location.pathname === '/auth') navigate('/');
    // La logique de redirection pour les non-connectés est commentée pour permettre l'accès invité
    // else if (!currentUser && !['/auth', '/', '/context', '/simulation', '/results'].includes(location.pathname) && !location.pathname.startsWith('/scenario/')) {
    //   navigate('/auth');
    // }
  }, [currentUser, location.pathname, navigate]);

  const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => children; // Accès invité permis partout pour l'instant
  const AuthRoute: React.FC<ProtectedRouteProps> = ({ children }) => currentUser ? <Navigate to="/" replace /> : children;

  return (
    <div className="app-layout">
      <HotjarTracking />
      {currentAppStepForNavbar !== 'auth' && <Navbar onNavigate={(path) => navigate(path)} currentStep={currentAppStepForNavbar} />}
      <main 
        className="main-content"
        style={{ 
          marginLeft: currentAppStepForNavbar !== 'auth' ? '260px' : '0',
          display: currentAppStepForNavbar === 'auth' ? 'flex' : 'block',
          alignItems: currentAppStepForNavbar === 'auth' ? 'center' : 'flex-start',
          justifyContent: currentAppStepForNavbar === 'auth' ? 'center' : 'flex-start',
          paddingTop: currentAppStepForNavbar === 'auth' ? '0' : '20px', // Pas de padding top pour la page auth si centrée
          minHeight: currentAppStepForNavbar === 'auth' ? 'calc(100vh - 40px)' : 'auto' // Ajuster pour padding de main-content
        }}
      >
        <div 
          className="app-container" 
          style={{ width: currentAppStepForNavbar === 'auth' ? 'auto' : '100%', maxWidth: currentAppStepForNavbar === 'auth' ? '500px' : '960px' }} // Max-width pour le form auth
        > 
          {apiError && <p style={{color: 'orange', textAlign: 'center', marginBottom: '20px'}}>Erreur API: {apiError}</p>}
          {speechError && <p style={{color: 'red', textAlign: 'center', marginBottom: '20px'}}>{speechError}</p>}
          
          <Routes>
            <Route path="/auth" element={<AuthRoute><AuthForm onNavigateToGuest={() => navigate('/')} /></AuthRoute>} />
            <Route path="/" element={ <ScenarioSelection scenarios={scenarios} selectedScenario={selectedScenario} onSelectScenario={handleSelectScenario} /> } />
            <Route path="/context" element={ selectedScenario ? <ContextInput onSubmitContext={handleSubmitContext} selectedScenarioTitle={selectedScenario.title} /> : <Navigate to="/" replace /> } />
            <Route path="/simulation" element={
              (selectedScenario && userContext) ? (
                <div className="simulation-interface app-section"> 
                  <div className="simulation-panels-container">
                    <div className="simulation-panel">
                      <img src="/assets/img1.png" alt="Client IA" className="avatar" onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/100?text=IA')} />
                      <h4>{selectedScenario.title}</h4>
                      <div className="last-message">
                        {isAiSpeaking && <span style={{fontSize: '2em', animation: 'pulse 1.5s infinite ease-in-out'}}>🔊</span>} 
                        {!isAiSpeaking && !isAiResponding && (conversation.filter(m => m.sender === 'ai').slice(-1)[0]?.text || "En attente de votre réponse...")}
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
                        Parlez clairement...
                      </p>
                    )}
                    {isAiResponding && !isAiSpeaking && !isAnalyzing && (
                      <div style={{ textAlign: 'center', marginTop: '10px' }}><div className="loader-ia"></div><p className="placeholder-text">🤖 L'IA réfléchit...</p></div>
                    )}
                  </div>
                  <button onClick={handleEndSimulation} style={{marginTop: '30px', backgroundColor: '#dc3545', width: 'auto', padding: '10px 20px'}} disabled={isAiResponding || isAiSpeaking || isAnalyzing}>
                    Terminer & Voir Résultats
                  </button>
                  {isAnalyzing && (
                      <div style={{ textAlign: 'center', marginTop: '20px' }}><div className="loader-ia"></div><p className="placeholder-text" style={{color: 'var(--color-accent-hover)'}}>📊 Analyse...</p></div>
                  )}
                </div>
              ) : <Navigate to="/context" replace />
            } />
            <Route path="/results" element={
              <ResultsView 
                analysisResults={analysisResults} selectedScenarioTitle={selectedScenario?.title}
                conversation={conversation} userContext={userContext} 
                onNewSimulation={() => { 
                  navigate('/'); setLastProcessedUserMessageId(null); setAnalysisResults(null); 
                  setApiError(null); setIsAnalyzing(false); setIsAiResponding(false);
                }}
                isAnalyzing={isAnalyzing}
              />
            } />
            <Route path="/history" element={<ProtectedRoute><HistoryView history={history} onSelectRecord={(record) => {
                setSelectedScenario(scenarios.find(s => s.title === record.scenarioTitle) ?? null);
                setAnalysisResults({ score: record.score, conseils: [], ameliorations: record.summary ? [record.summary] : [] });
                navigate('/results');
            }} /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard history={history} /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to={currentUser ? "/" : "/auth"} replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default App;
