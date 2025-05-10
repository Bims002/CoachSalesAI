import { useState, useEffect, useCallback, useRef } from 'react'; // Ajout de useRef

// Vérifier la compatibilité du navigateur avec Web Speech API
// Ces variables sont maintenant potentiellement typées grâce à @types/dom-speech-recognition
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
const browserSupportsSpeechRecognition = !!SpeechRecognitionAPI;

interface UseSpeechRecognitionOptions {
  onResult?: (transcript: string) => void;
  onError?: (event: SpeechRecognitionErrorEvent) => void; // Utilisation du type spécifique
  onEnd?: () => void;
}

interface SpeechRecognitionState {
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
  error: string | null;
  browserSupportsSpeechRecognition: boolean;
}

const useSpeechRecognition = (options: UseSpeechRecognitionOptions = {}) => {
  const { onResult, onError, onEnd } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Instance de SpeechRecognition, sera initialisée plus tard
  // Le type SpeechRecognition (instance) devrait être globalement disponible maintenant
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (!browserSupportsSpeechRecognition) {
      setError('La reconnaissance vocale n\'est pas supportée par ce navigateur.');
      return;
    }

    // Utiliser SpeechRecognitionAPI qui a été vérifié
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true; // Continue la reconnaissance jusqu'à arrêt explicite
    recognition.interimResults = true; // Permet d'avoir des résultats intermédiaires
    recognition.lang = 'fr-FR'; // Langue de reconnaissance, à rendre configurable plus tard

    recognition.onresult = (event: SpeechRecognitionEvent) => { // Typage de l'événement
      let finalTranscript = '';
      let currentInterim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          currentInterim += result[0].transcript;
        }
      }
      
      // Mettre à jour la transcription finale seulement si elle change pour éviter des re-render inutiles
      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
      }
      setInterimTranscript(currentInterim);

      if (onResult && finalTranscript) {
        onResult(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => { // Typage de l'événement
      console.error('Speech recognition error:', event.error, event.message);
      let errorMessage = `Erreur de reconnaissance vocale: ${event.error}`;
      if (event.message) {
        errorMessage += ` (${event.message})`;
      }
      // Fournir des conseils plus spécifiques pour les erreurs courantes
      if (event.error === 'no-speech') {
        errorMessage = "Aucune parole n'a été détectée. Veuillez vérifier votre microphone et parler clairement.";
      } else if (event.error === 'audio-capture') {
        errorMessage = "Problème de capture audio. Vérifiez que votre microphone est bien connecté et non utilisé par une autre application.";
      } else if (event.error === 'not-allowed') {
        errorMessage = "Permission d'utiliser le microphone refusée ou non accordée.";
      }
      setError(errorMessage);
      if (onError) {
        onError(event);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript(''); // Nettoyer la transcription intermédiaire
      if (onEnd) {
        onEnd();
      }
    };
    
    recognitionRef.current = recognition;

    // Nettoyage au démontage du composant
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onResult, onError, onEnd]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setTranscript(''); // Réinitialiser la transcription à chaque démarrage
      setInterimTranscript('');
      setError(null);
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Erreur au démarrage de la reconnaissance:", e);
        setError("Impossible de démarrer la reconnaissance vocale.");
        setIsListening(false);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  return {
    transcript,
    interimTranscript,
    isListening,
    error,
    startListening,
    stopListening,
    browserSupportsSpeechRecognition,
  } as const; // as const pour des types plus précis
};

export default useSpeechRecognition;
