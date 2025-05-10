import { useState, useEffect, useCallback, useRef } from 'react';

const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const browserSupportsSpeechRecognition = !!SpeechRecognitionAPI;

interface UseSpeechRecognitionOptions {
  onResult?: (transcript: string) => void;
  onError?: (event: any) => void;
  onEnd?: () => void;
}

const useSpeechRecognition = (options: UseSpeechRecognitionOptions = {}) => {
  const { onResult, onError, onEnd } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any | null>(null);
  const manualStopRef = useRef(false);

  // Refs pour les callbacks et états pour éviter les stale closures dans les handlers d'événements
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const onEndRef = useRef(onEnd);
  const isListeningRef = useRef(isListening);

  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
    onEndRef.current = onEnd;
  }, [onResult, onError, onEnd]);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    if (!browserSupportsSpeechRecognition) {
      setError('La reconnaissance vocale n\'est pas supportée par ce navigateur.');
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognitionRef.current = recognition;

    recognition.continuous = true; // Mode continu pour une écoute plus longue
    recognition.interimResults = true;
    recognition.lang = 'fr-FR';

    recognition.onresult = (event: any) => {
      let finalTranscriptSegment = '';
      let currentInterim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscriptSegment += event.results[i][0].transcript;
        } else {
          currentInterim += event.results[i][0].transcript;
        }
      }
      
      if (finalTranscriptSegment) {
        setTranscript(prev => prev + finalTranscriptSegment);
      }
      setInterimTranscript(currentInterim);

      if (onResultRef.current && finalTranscriptSegment) {
        onResultRef.current(finalTranscriptSegment.trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error, event.message);
      let errorMessage = `Erreur de reconnaissance vocale: ${event.error || 'inconnue'}`;
      if (event.message) errorMessage += ` (${event.message})`;
      
      const errorType = event.error || '';
      if (errorType === 'no-speech') errorMessage = "Aucune parole détectée. Vérifiez micro/parlez clairement.";
      else if (errorType === 'audio-capture') errorMessage = "Problème capture audio. Vérifiez micro.";
      else if (errorType === 'not-allowed') errorMessage = "Permission micro refusée.";
      
      setError(errorMessage);
      if (onErrorRef.current) onErrorRef.current(event);
      setIsListening(false); // Toujours arrêter l'écoute en cas d'erreur
    };

    recognition.onend = () => {
      setInterimTranscript('');
      const listeningBeforeEnd = isListeningRef.current; // Lire la valeur de la ref

      if (manualStopRef.current) {
        setIsListening(false);
        manualStopRef.current = false; // Réinitialiser pour la prochaine session
      } else if (listeningBeforeEnd) {
        // L'écoute s'est arrêtée de manière inattendue (ex: pause de l'utilisateur)
        // On essaie de la redémarrer pour simuler une écoute "vraiment" continue
        console.log("Reconnaissance terminée inopinément, tentative de redémarrage...");
        if (recognitionRef.current) {
          try {
            recognitionRef.current.start();
            // Ne pas changer isListening ici; start() devrait le faire via onstart implicitement
            // ou si start() échoue, onerror mettra isListening à false.
          } catch (e) {
            console.error("Échec du redémarrage de la reconnaissance:", e);
            setIsListening(false); // Si le redémarrage échoue, on n'écoute plus.
          }
        } else {
          setIsListening(false); // Pas de ref de reconnaissance, donc on n'écoute plus.
        }
      } else {
        // Si on n'écoutait pas (isListening était déjà false) et onend est appelé, s'assurer que l'état est false.
        setIsListening(false);
      }

      if (onEndRef.current) onEndRef.current();
    };
    
    return () => {
      if (recognitionRef.current) {
        manualStopRef.current = true; // Indiquer un arrêt manuel pour le nettoyage
        recognitionRef.current.stop();
      }
    };
  }, []); // Dépendances vides pour que ce useEffect ne s'exécute qu'au montage/démontage

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListeningRef.current) { // Utiliser la ref pour la condition
      setTranscript('');
      setInterimTranscript('');
      setError(null);
      manualStopRef.current = false; // S'assurer que ce n'est pas considéré comme un arrêt manuel
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Erreur au démarrage de la reconnaissance:", e);
        setError("Impossible de démarrer la reconnaissance vocale.");
        setIsListening(false);
      }
    }
  }, []); // Pas de dépendance à isListening (état) pour éviter recréation

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListeningRef.current) { // Utiliser la ref pour la condition
      manualStopRef.current = true;
      recognitionRef.current.stop();
      // setIsListening(false); // Sera géré par onend
    }
  }, []); // Pas de dépendance à isListening (état)

  return {
    transcript,
    interimTranscript,
    isListening,
    error,
    startListening,
    stopListening,
    browserSupportsSpeechRecognition,
  } as const;
};

export default useSpeechRecognition;
