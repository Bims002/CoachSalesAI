import { useState, useEffect, useCallback } from 'react';
import './App.css';
import ScenarioSelection from './components/ScenarioSelection';
import SimulationControls from './components/SimulationControls';
import ConversationView from './components/ConversationView';
import ResultsView from './components/ResultsView';
import HotjarTracking from './components/HotjarTracking';
import HistoryView from './components/HistoryView';
import type { SimulationRecord } from './components/HistoryView';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import AuthForm from './components/AuthForm';
import ContextInput from './components/ContextInput'; // Importer ContextInput
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
const MAX_HISTORY_MESSAGES = 2; // Réduit à 2 messages (1 tour) pour tester

function App() {
  type AppStep = 'scenarioSelection' | 'contextInput' | 'simulation' | 'results' | 'history' | 'dashboard' | 'auth'; // Ajouter 'contextInput'

  const { currentUser } = useAuth();
  const [currentStep, setCurrentStep] = useState<AppStep>(currentUser ? 'scenarioSelection' : 'auth');
  const [scenarios] = useState<Scenario[]>(scenariosData);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [userContext, setUserContext] = useState<string>(''); // Nouvel état pour le contexte utilisateur
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastProcessedUserMessageId, setLastProcessedUserMessageId] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<any | null>(null); // Nouvel état pour les résultats d'analyse
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Nouvel état pour l'historique des simulations
  const [history, setHistory] = useState<SimulationRecord[]>([]);

  // Charger l'historique depuis Firestore ou localStorage
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
              // Assurer la conversion correcte de Timestamp en string si nécessaire
              date: data.date instanceof Timestamp ? data.date.toDate().toLocaleString() : new Date(data.date).toLocaleString(), 
              scenarioTitle: data.scenarioTitle,
              score: data.score,
              summary: data.summary
            });
          });
          setHistory(firestoreHistory);
        } catch (error) {
          console.error("Erreur lors de la récupération de l'historique Firestore:", error);
          // Fallback ou gestion d'erreur
        }
      } else {
        // Pour les utilisateurs non connectés, on pourrait utiliser localStorage ou ne rien charger
        const storedHistory = localStorage.getItem('coachSalesLocalHistory');
        if (storedHistory) {
          setHistory(JSON.parse(storedHistory));
        } else {
          setHistory([]);
        }
      }
    };
    fetchHistory();
  }, [currentUser]); // Re-fetch si l'utilisateur change
  
  // Fonction pour ajouter une simulation à l'historique (Firestore ou localStorage)
  const addToHistory = async (recordData: Omit<SimulationRecord, 'id' | 'date'>) => {
    const newRecord: SimulationRecord = {
      ...recordData,
      id: Date.now().toString(), // ID temporaire, Firestore générera le sien
      date: new Date().toLocaleString(), // Date en string pour la simplicité, Firestore utilisera serverTimestamp
    };

    if (currentUser) {
      try {
        const userHistoryCollection = collection(db, `users/${currentUser.uid}/simulations`);
        // Utiliser serverTimestamp pour la date pour un tri correct côté serveur
        await addDoc(userHistoryCollection, { ...recordData, date: serverTimestamp() });
        // Re-fetch l'historique pour mettre à jour l'UI avec l'enregistrement de Firestore (incluant l'ID et la date serveur)
        // Ou ajouter localement et espérer la synchro, mais re-fetch est plus sûr pour l'ID et la date.
        // Pour l'instant, on ajoute localement pour la réactivité, puis on re-fetch au prochain chargement.
        setHistory(prevHistory => [newRecord, ...prevHistory].slice(0, 20));

      } catch (error) {
        console.error("Erreur lors de l'ajout à l'historique Firestore:", error);
      }
    } else {
      // Logique localStorage pour utilisateurs non connectés
      setHistory(prevHistory => {
        const updatedHistory = [newRecord, ...prevHistory].slice(0, 20);
        localStorage.setItem('coachSalesLocalHistory', JSON.stringify(updatedHistory));
        return updatedHistory;
      });
    }
  };
  
  // Mettre à jour l'historique après analyse réussie
  useEffect(() => {
    if (analysisResults && selectedScenario) {
      const recordData: Omit<SimulationRecord, 'id' | 'date'> = {
        scenarioTitle: selectedScenario.title,
        score: analysisResults.score ?? null,
        summary: analysisResults.ameliorations?.join(', ') ?? 'Aucun point spécifique',
      };
      addToHistory(recordData);
    }
  }, [analysisResults, selectedScenario, currentUser]); // Ajouter currentUser aux dépendances

  const handleSpeechResultCb = useCallback((finalTranscript: string) => {
    const trimmedTranscript = finalTranscript.trim();
    if (trimmedTranscript) {
      setConversation(prev => [...prev, { id: Date.now().toString() + '_user', text: trimmedTranscript, sender: 'user' }]);
    }
  }, []);

  const speechRecognitionHook = useSpeechRecognition({ onResult: handleSpeechResultCb });
  const { interimTranscript, isListening, startListening, stopListening, error: speechError, browserSupportsSpeechRecognition } = speechRecognitionHook;

  const playAiAudioCb = useCallback((audioContent: string) => {
    if (isListening) stopListening();
    setIsAiSpeaking(true);
    const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
    audio.play().catch(e => {
      console.error("Erreur audio.play():", e);
      setIsAiSpeaking(false);
      if (currentStep === 'simulation') startListening();
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
    if (!selectedScenario || !userMessageText.trim() || !userContext.trim()) { // Vérifier aussi userContext
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
        text: msg.text, // Garder la structure simple pour le backend actuel
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
          initialContext: userContext // Envoyer le contexte initial
        }),
      });
      setIsAiResponding(false);
      if (!response.ok) {
        // Essayer de parser comme JSON si possible, sinon utiliser le statut texte
        let errorResponseMessage = `Erreur HTTP: ${response.status} ${response.statusText}`;
        try {
            const errorData = await response.json();
            errorResponseMessage = errorData.error || errorResponseMessage;
        } catch (e) { /* Ignorer si la réponse n'est pas JSON */ }
        throw new Error(errorResponseMessage);
      }
      const data = await response.json();
      if (data.aiResponse) {
        const aiMessage: Message = { id: Date.now().toString() + '_ai', text: data.aiResponse, sender: 'ai', audioContent: data.audioContent };
        setConversation(prev => [...prev, aiMessage]);
        if (data.audioContent && !IS_MOBILE_DEVICE) {
          playAiAudioCb(data.audioContent);
        } else if (!data.audioContent && currentStep === 'simulation') {
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
  }, [selectedScenario, currentStep, playAiAudioCb, startListening, isListening, stopListening, setIsAiSpeaking, setConversation, setIsAiResponding, setApiError]);

  // Fonction pour lancer l'analyse de la conversation
  const runAnalysis = useCallback(async () => {
    if (conversation.length === 0) {
      console.warn("Aucune conversation à analyser.");
      setAnalysisResults(null);
      setCurrentStep('results'); // Passer quand même aux résultats, mais vides
      return;
    }

    setIsAnalyzing(true);
    setApiError(null); // Réinitialiser les erreurs API pour l'analyse

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation }), // Envoyer la conversation complète
      });

      setIsAnalyzing(false);

      if (!response.ok) {
        let errorResponseMessage = `Erreur HTTP lors de l'analyse: ${response.status} ${response.statusText}`;
        try {
            const errorData = await response.json();
            errorResponseMessage = errorData.error || errorResponseMessage;
        } catch (e) { /* Ignorer si la réponse n'est pas JSON */ }
        throw new Error(errorResponseMessage);
      }

      const data = await response.json();
      setAnalysisResults(data); // Stocker les résultats
      setCurrentStep('results'); // Passer à l'étape des résultats

    } catch (error) {
      console.error("Erreur lors de l'analyse:", error);
      let errMsg = "Une erreur est survenue lors de l'analyse de la simulation.";
      if (error instanceof Error) errMsg = error.message;
      else if (typeof error === 'string') errMsg = error;
      setApiError(errMsg);
      setIsAnalyzing(false);
      setAnalysisResults(null); // S'assurer que les anciens résultats sont effacés
      setCurrentStep('results'); // Passer quand même aux résultats pour afficher l'erreur
    }
  }, [conversation, setAnalysisResults, setCurrentStep, setIsAnalyzing, setApiError]);

  useEffect(() => {
    if (conversation.length > 0) {
      const lastMessage = conversation[conversation.length - 1];
      if (lastMessage.sender === 'user' && lastMessage.id !== lastProcessedUserMessageId && !isAiResponding && !isAiSpeaking && !isAnalyzing) { // Ne pas appeler si l'IA réfléchit/parle ou si l'analyse est en cours
        setLastProcessedUserMessageId(lastMessage.id);
        getAiResponseCb(lastMessage.text, conversation);
      }
    }
  }, [conversation, isAiResponding, isAiSpeaking, isAnalyzing, getAiResponseCb, lastProcessedUserMessageId, setLastProcessedUserMessageId]);

  const handleSelectScenario = (scenario: Scenario) => {
    setSelectedScenario(scenario);
    setConversation([]);
    setUserContext(''); // Réinitialiser le contexte
    if (isListening) stopListening();
    setCurrentStep('contextInput'); // Aller à la saisie du contexte
    setLastProcessedUserMessageId(null);
    setAnalysisResults(null);
    setApiError(null);
  };

  const handleSubmitContext = (context: string) => {
    setUserContext(context);
    setCurrentStep('simulation'); // Démarrer la simulation après la saisie du contexte
  };

  const toggleListening = () => {
    if (isAiSpeaking || isAnalyzing) return; // Ne rien faire si l'IA parle ou si l'analyse est en cours
    if (isListening) stopListening();
    else startListening();
  };

  const handleEndSimulation = () => {
    if (isListening) stopListening();
    // Ne pas changer d'étape ici, runAnalysis le fera après avoir obtenu les résultats
    runAnalysis(); 
  };
  
  useEffect(() => {
    if (!browserSupportsSpeechRecognition && !speechError) {
      alert("La reconnaissance vocale n'est pas supportée.");
    }
  }, [browserSupportsSpeechRecognition, speechError]);

  useEffect(() => {
    if (currentUser && currentStep === 'auth') {
      // Si l'utilisateur est connecté et qu'on est sur la page auth, rediriger vers scenarioSelection
      setCurrentStep('scenarioSelection');
    } else if (!currentUser && currentStep !== 'auth') {
      // Si l'utilisateur n'est pas connecté et qu'on n'est PAS sur la page auth,
      // (par exemple, il essaie d'accéder à dashboard ou history directement via URL)
      // alors rediriger vers la page auth.
      setCurrentStep('auth');
    }
    // Si l'utilisateur est connecté et n'est pas sur 'auth', ou
    // si l'utilisateur n'est pas connecté et est déjà sur 'auth', ne rien faire.
  }, [currentUser, currentStep, setCurrentStep]);


  // Logique de navigation pour la Navbar, en s'assurant que les routes protégées le sont
  const handleNavigation = (step: AppStep) => {
    if (!currentUser && (step === 'dashboard' || step === 'history')) {
      setCurrentStep('auth'); // Rediriger vers l'auth si non connecté et essaie d'accéder à une route protégée
    } else {
      setCurrentStep(step);
    }
  };

  return (
    <div className="app-layout">
      <HotjarTracking />
      <Navbar onNavigate={handleNavigation} currentStep={currentStep} /> {/* Passer currentStep */}
      <main className="main-content">
        <div className="app-container"> {/* Conteneur pour centrer le contenu des sections */}
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
            <>
              <section id="simulation-info" className="app-section">
                <h2>Simulation: {selectedScenario.title}</h2>
                <p style={{ fontStyle: 'italic', color: 'var(--color-text-secondary)', marginBottom: '10px', borderLeft: `4px solid var(--color-accent)`, paddingLeft: '10px' }}>Contexte: {userContext}</p>
                <p className="placeholder-text">{selectedScenario.description}</p>
              </section>
              <section id="simulation-controls" className="app-section">
                <h3>Votre tour :</h3>
                <SimulationControls 
                  onStartListening={startListening} 
                  onStopListening={stopListening} 
                  isListening={isListening} 
                  disabled={!browserSupportsSpeechRecognition || isAiResponding || isAiSpeaking || isAnalyzing} 
                />
                {isListening && !isAiResponding && !isAiSpeaking && !isAnalyzing && (
                  <p className="placeholder-text mic-icon-listening" style={{ textAlign: 'center', marginTop: '15px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                    🎤 Écoute en cours... Parlez clairement dans un environnement calme et près de votre microphone.
                  </p>
                )}
                {isAiResponding && !isAiSpeaking && !isAnalyzing && (
                  <div style={{ textAlign: 'center', marginTop: '10px' }}>
                    <div className="loader-ia"></div>
                    <p className="placeholder-text">🤖 L'IA réfléchit...</p>
                  </div>
                )}
                {isAiSpeaking && !isAnalyzing && <p className="placeholder-text" style={{textAlign: 'center', marginTop: '10px', color: 'var(--color-accent)'}}>🔊 L'IA parle...</p>}
                {isAnalyzing && (
                  <div style={{ textAlign: 'center', marginTop: '10px' }}>
                    <div className="loader-ia"></div>
                    <p className="placeholder-text" style={{color: 'var(--color-accent-hover)'}}>📊 Analyse en cours...</p>
                  </div>
                )}
              </section>
              <section id="conversation-display" className="app-section">
                <h3>Conversation :</h3>
                <ConversationView messages={conversation} interimTranscript={interimTranscript} onPlayAiAudio={playAiAudioCb} isMobile={IS_MOBILE_DEVICE} />
              </section>
              <button onClick={handleEndSimulation} style={{marginTop: '20px', backgroundColor: '#dc3545'}} disabled={isAiResponding || isAiSpeaking || isAnalyzing}>Terminer & Voir Résultats</button> {/* Désactiver pendant les processus IA */}
            </>
          )}
          {currentStep === 'results' && (
            <ResultsView 
              analysisResults={analysisResults}
              selectedScenarioTitle={selectedScenario?.title}
              conversation={conversation} // Passer la conversation pour le téléchargement
              userContext={userContext} // Passer le contexte utilisateur pour le téléchargement
              onNewSimulation={() => { setCurrentStep('scenarioSelection'); setLastProcessedUserMessageId(null); setAnalysisResults(null); setApiError(null); }}
              isAnalyzing={isAnalyzing}
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
              <AuthForm />
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
