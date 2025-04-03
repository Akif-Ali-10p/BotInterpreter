import { useState, useEffect, useCallback, useRef } from 'react';
import { SpeechRecognitionState } from '@/types';
import { isSpeechRecognitionSupported } from '@/lib/languageUtils';

interface SpeechRecognitionHook {
  state: SpeechRecognitionState;
  startListening: (language?: string, continuous?: boolean, onInterimResult?: (text: string) => void, onFinalResult?: (text: string) => void) => void;
  stopListening: () => void;
  resetTranscript: () => void;
  isSupported: boolean;
}

// Using either the standard or webkit prefixed SpeechRecognition
// TypeScript definition for the Speech API
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export function useSpeechRecognition(): SpeechRecognitionHook {
  const [state, setState] = useState<SpeechRecognitionState>({
    isListening: false,
    transcript: '',
    interimTranscript: '',
    error: null,
    isRecognizing: false
  });

  const recognitionRef = useRef<any>(null);
  const isSupported = isSpeechRecognitionSupported();

  useEffect(() => {
    if (!isSupported) {
      setState(prev => ({ 
        ...prev, 
        error: "Speech recognition is not supported in this browser." 
      }));
      return;
    }

    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, [isSupported]);

  const startListening = useCallback((
    language = 'en-US', 
    continuous = true, 
    onInterimResult?: (text: string) => void,
    onFinalResult?: (text: string) => void
  ) => {
    if (!isSupported) return;
    
    // Initialize speech recognition
    if (!recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = continuous;
      recognitionRef.current.interimResults = true;
      
      // Set up event handlers
      recognitionRef.current.onstart = () => {
        setState(prev => ({ 
          ...prev, 
          isListening: true, 
          error: null 
        }));
      };

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        // Call the callback function for interim results if provided
        if (interimTranscript && onInterimResult) {
          onInterimResult(interimTranscript);
        }

        // Call the callback function for final results if provided
        if (finalTranscript && onFinalResult) {
          onFinalResult(finalTranscript);
        }

        setState(prev => ({ 
          ...prev, 
          transcript: prev.transcript + finalTranscript,
          interimTranscript,
          isRecognizing: interimTranscript.length > 0
        }));
      };

      recognitionRef.current.onerror = (event: any) => {
        setState(prev => ({ 
          ...prev, 
          error: event.error || "Speech recognition error" 
        }));
      };

      recognitionRef.current.onend = () => {
        setState(prev => ({ 
          ...prev, 
          isListening: false,
          isRecognizing: false,
          interimTranscript: '' 
        }));
      };
    }

    // Set language and start
    recognitionRef.current.lang = language;
    
    try {
      recognitionRef.current.start();
    } catch (error) {
      // Handle case where recognition is already started
      setState(prev => ({ 
        ...prev, 
        error: "Could not start speech recognition." 
      }));
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      transcript: '', 
      interimTranscript: '' 
    }));
  }, []);

  return {
    state,
    startListening,
    stopListening,
    resetTranscript,
    isSupported
  };
}

export default useSpeechRecognition;
