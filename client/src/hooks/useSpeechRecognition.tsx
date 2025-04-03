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
        console.error('Speech recognition error:', event.error);
        
        // Different error handling based on error type
        switch (event.error) {
          case 'not-allowed':
            setState(prev => ({ 
              ...prev, 
              error: "Microphone access denied. Please check your browser permissions.",
              isListening: false
            }));
            break;
          case 'no-speech':
            setState(prev => ({ 
              ...prev, 
              error: "No speech detected. Please try speaking again.",
              isListening: true // Keep listening for continuous mode
            }));
            
            // Auto-restart for continuous mode after brief delay
            if (continuous) {
              setTimeout(() => {
                try {
                  recognitionRef.current?.start();
                } catch (e) {
                  // Ignore
                }
              }, 300);
            }
            break;
          case 'network':
            setState(prev => ({ 
              ...prev, 
              error: "Network error. Please check your connection.",
              isListening: false
            }));
            break;
          case 'aborted':
            // This is expected when stopListening is called, so we don't show an error
            setState(prev => ({ 
              ...prev, 
              error: null,
              isListening: false
            }));
            break;
          default:
            setState(prev => ({ 
              ...prev, 
              error: event.error || "Speech recognition error",
              isListening: false
            }));
        }
      };

      recognitionRef.current.onend = () => {
        // If we're in continuous mode and there was no error, try to restart
        const wasListening = state.isListening;
        
        setState(prev => ({ 
          ...prev, 
          isListening: false,
          isRecognizing: false,
          interimTranscript: '' 
        }));
        
        // Auto-restart speech recognition if it ended unexpectedly in continuous mode
        if (continuous && wasListening && !state.error) {
          try {
            setTimeout(() => {
              if (recognitionRef.current) {
                recognitionRef.current.start();
              }
            }, 500);
          } catch (error) {
            console.error('Error restarting speech recognition:', error);
          }
        }
      };
    }

    // Set language and start
    recognitionRef.current.lang = language;
    
    try {
      // Check if we need to reset the recognition instance
      if (recognitionRef.current.grammars && recognitionRef.current.grammars.length > 0) {
        // Sometimes the SpeechRecognition instance can get into a bad state
        // Create a new instance to avoid issues
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = continuous;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = language;
      }
      
      recognitionRef.current.start();
      
      // Add a safety timeout to check if recognition actually started
      setTimeout(() => {
        if (!state.isListening) {
          console.warn('Speech recognition failed to start within timeout');
          
          // Try to recreate and restart
          try {
            if (recognitionRef.current) {
              recognitionRef.current.stop();
            }
            
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = continuous;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = language;
            recognitionRef.current.start();
            
            setState(prev => ({ 
              ...prev, 
              isListening: true,
              error: null
            }));
          } catch (e) {
            console.error('Failed to restart speech recognition:', e);
            setState(prev => ({ 
              ...prev, 
              error: "Failed to start speech recognition after multiple attempts. Please try again."
            }));
          }
        }
      }, 3000);
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      
      // Handle case where recognition is already started
      if (error instanceof DOMException && error.name === 'InvalidStateError') {
        // Recognition already running - stop and restart
        try {
          recognitionRef.current.stop();
          setTimeout(() => {
            try {
              recognitionRef.current.start();
            } catch (e) {
              setState(prev => ({ 
                ...prev, 
                error: "Could not restart speech recognition." 
              }));
            }
          }, 300);
        } catch (e) {
          // Critical error - create new instance
          recognitionRef.current = new SpeechRecognition();
          recognitionRef.current.continuous = continuous;
          recognitionRef.current.interimResults = true;
          recognitionRef.current.lang = language;
          
          try {
            recognitionRef.current.start();
          } catch (e2) {
            setState(prev => ({ 
              ...prev, 
              error: "Critical error with speech recognition. Please reload the page." 
            }));
          }
        }
      } else {
        // Other errors
        setState(prev => ({ 
          ...prev, 
          error: "Could not start speech recognition. Please check your microphone access." 
        }));
      }
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
