import { useState, useEffect, useCallback, useRef } from 'react'; // Ajout de useRef

// Vérifier la compatibilité du navigateur avec Web Speech API
const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const browserSupportsSpeechRecognition = !!SpeechRecognitionAPI;

interface UseSpeechRecognitionOptions {
  onResult?: (transcript: string) => void;
  onError?: (event: any) => void; // Remplacé par any
  onEnd?: () => void;
}

// interface SpeechRecognitionState { // Supprimé car non utilisé
//   transcript: string;
//   interimTranscript: string;
//   isListening: boolean;
//   error: string | null;
//   browserSupportsSpeechRecognition: boolean;
// }

const useSpeechRecognition = (options: UseSpeechRecognitionOptions = {}) => {
  const { onResult, onError, onEnd } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Instance de SpeechRecognition, sera initialisée plus tard
  const recognitionRef = useRef<any | null>(null); // Remplacé par any

  useEffect(() => {
    if (!browserSupportsSpeechRecognition) {
      setError('La reconnaissance vocale n\'est pas supportée par ce navigateur.');
      return;
    }

    // Utiliser SpeechRecognitionAPI qui a été vérifié
    const recognition = new SpeechRecognitionAPI(); // Ceci est une instance de l'API SpeechRecognition
    recognitionRef.current = recognition; // Affecter l'instance à la ref

    recognition.continuous = false; // Changé à false pour un mode tour par tour
    recognition.interimResults = true;
    recognition.lang = 'fr-FR';

    recognition.onresult = (event: any) => { // Remplacé par any
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
      
      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
      }
      setInterimTranscript(currentInterim);

      if (onResult && finalTranscript) {
        onResult(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: any) => { // Remplacé par any
      console.error('Speech recognition error:', event.error, event.message);
      let errorMessage = `Erreur de reconnaissance vocale: ${event.error || 'inconnue'}`;
      if (event.message) {
        errorMessage += ` (${event.message})`;
      }
      
      const errorType = event.error || '';
      if (errorType === 'no-speech') {
        errorMessage = "Aucune parole n'a été détectée. Veuillez vérifier votre microphone et parler clairement.";
      } else if (errorType === 'audio-capture') {
        errorMessage = "Problème de capture audio. Vérifiez que votre microphone est bien connecté et non utilisé par une autre application.";
      } else if (errorType === 'not-allowed') {
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
