import { useState, useEffect, useCallback } from 'react';
import './App.css';
import ScenarioSelection from './components/ScenarioSelection';
import SimulationControls from './components/SimulationControls';
import ConversationView from './components/ConversationView';
import ResultsView from './components/ResultsView';
import HotjarTracking from './components/HotjarTracking';
import HistoryView from './components/HistoryView';
import type { SimulationRecord } from './components/HistoryView';
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
const MAX_HISTORY_MESSAGES = 2; // Réduit à 2 messages (1 tour) pour tester

function App() {
  type AppStep = 'scenarioSelection' | 'simulation' | 'results' | 'history';

  const [currentStep, setCurrentStep] = useState<AppStep>('scenarioSelection');
  const [scenarios] = useState<Scenario[]>(scenariosData);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastProcessedUserMessageId, setLastProcessedUserMessageId] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<any | null>(null); // Nouvel état pour les résultats d'analyse
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Nouvel état pour l'historique des simulations
  const [history, setHistory] = useState<SimulationRecord[]>([]);

  // Charger l'historique depuis localStorage au montage
  useEffect(() => {
    const storedHistory = localStorage.getItem('coachSalesHistory');
    if (storedHistory) {
      setHistory(JSON.parse(storedHistory));
    }
  }, []);
  
  // Fonction pour ajouter une simulation à l'historique
  const addToHistory = (record: SimulationRecord) => {
    const newHistory = [record, ...history].slice(0, 20); // Garder max 20 enregistrements
    setHistory(newHistory);
    localStorage.setItem('coachSalesHistory', JSON.stringify(newHistory));
  };
  
  // Mettre à jour l'historique après analyse réussie
  useEffect(() => {
    if (analysisResults && selectedScenario) {
      const record: SimulationRecord = {
        id: Date.now().toString(),
        date: new Date().toLocaleString(),
        scenarioTitle: selectedScenario.title,
        score: analysisResults.score ?? null,
        summary: analysisResults.ameliorations?.join(', ') ?? '',
      };
      addToHistory(record);
    }
  }, [analysisResults, selectedScenario]);

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
    if (!selectedScenario) return;
    setIsAiResponding(true);
    setApiError(null);
    try {
      // Envoyer seulement les N derniers messages de l'historique, sans leur contenu audio
      const historyForApi = currentConvHistory
        .slice(0, -1) // Exclure le dernier message utilisateur (actuel), qui est envoyé via userTranscript
        .slice(-MAX_HISTORY_MESSAGES) // Prendre les N derniers messages de cet historique
        .map(msg => ({ // Ne garder que les champs nécessaires pour l'API Gemini
          id: msg.id, // L'ID peut être utile pour le débogage, mais pas essentiel pour Gemini
          text: msg.text,
          sender: msg.sender
        }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userTranscript: userMessageText, scenario: selectedScenario, conversationHistory: historyForApi }),
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
    if (isListening) stopListening();
    setCurrentStep('simulation');
    setLastProcessedUserMessageId(null);
    setAnalysisResults(null); // Réinitialiser les résultats d'analyse
    setApiError(null); // Réinitialiser les erreurs API
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

  return (
    <>
      <HotjarTracking />
      <div className="app-container">
        {apiError && <p style={{color: 'orange', textAlign: 'center'}}>Erreur API: {apiError}</p>}
        {speechError && <p style={{color: 'red', textAlign: 'center'}}>{speechError}</p>}
        {IS_MOBILE_DEVICE && currentStep === 'simulation' && !isAnalyzing && <p style={{textAlign: 'center', padding: '10px', backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffeeba', borderRadius: '4px'}}>Note: Sur mobile, cliquez sur ▶️ à côté du message de l'IA pour l'entendre.</p>}
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
                <SimulationControls 
                onStartListening={startListening} 
                onPauseListening={stopListening} 
                onStopListening={stopListening} 
                isListening={isListening} 
                isPaused={false} 
                disabled={!browserSupportsSpeechRecognition || isAiResponding || isAiSpeaking || isAnalyzing} 
              /> {/* Désactiver pendant l'analyse aussi */}
                {isAiResponding && !isAiSpeaking && !isAnalyzing && <p className="placeholder-text" style={{textAlign: 'center', marginTop: '10px'}}>🤖 L'IA réfléchit...</p>}
                {isAiSpeaking && !isAnalyzing && <p className="placeholder-text" style={{textAlign: 'center', marginTop: '10px', color: 'purple'}}>🔊 L'IA parle...</p>}
                {isAnalyzing && <p className="placeholder-text" style={{textAlign: 'center', marginTop: '10px', color: 'blue'}}>📊 Analyse en cours...</p>} {/* Indicateur d'analyse */}
              </section>
              <section id="conversation-display" className="app-section">
                <h3>Conversation :</h3>
                <ConversationView messages={conversation} interimTranscript={interimTranscript} onPlayAiAudio={playAiAudioCb} isMobile={IS_MOBILE_DEVICE} />
              </section>
              <button onClick={handleEndSimulation} style={{marginTop: '20px', backgroundColor: '#dc3545'}} disabled={isAiResponding || isAiSpeaking || isAnalyzing}>Terminer & Voir Résultats</button> {/* Désactiver pendant les processus IA */}
            </>
          )}
          {currentStep === 'results' && (
            <section id="results-display" className="app-section">
              <h2>Étape 3: Résultats</h2>
              {selectedScenario && <p>Scénario: {selectedScenario.title}</p>}
              {isAnalyzing && <p className="placeholder-text" style={{textAlign: 'center'}}>📊 Analyse en cours...</p>} {/* Indicateur d'analyse sur la page de résultats si on arrive ici pendant l'analyse */}
              {!isAnalyzing && analysisResults && (
                <>
                  <h4>Score Global :</h4>
                  <p>{analysisResults.score !== undefined ? analysisResults.score : '(Score non disponible)'}</p>
                  <h4>Conseils personnalisés :</h4>
                  <ul>
                    {analysisResults.conseils && analysisResults.conseils.length > 0 ? analysisResults.conseils.map((item: string, index: number) => <li key={index}>{item}</li>) : <li>(Aucun conseil)</li>}
                  </ul>
                  <h4>Points à améliorer :</h4>
                  <ul>
                    {analysisResults.ameliorations && analysisResults.ameliorations.length > 0 ? analysisResults.ameliorations.map((item: string, index: number) => <li key={index}>{item}</li>) : <li>(Aucun point spécifique)</li>}
                  </ul>
                </>
              )}
              {!isAnalyzing && !analysisResults && !apiError && <p className="placeholder-text" style={{textAlign: 'center'}}>(Aucun résultat d'analyse disponible)</p>} {/* Message si pas de résultats et pas d'erreur */}
              <button onClick={() => { setCurrentStep('scenarioSelection'); setLastProcessedUserMessageId(null); setAnalysisResults(null); setApiError(null); }}>Nouvelle simulation</button> {/* Réinitialiser les états */}
            </section>
          )}
        </main>
        <footer><p>&copy; {new Date().getFullYear()} CoachSales AI</p></footer>
      </div>
    </>
  );
}
export default App;
