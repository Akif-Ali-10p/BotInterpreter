import { useState, useEffect, useCallback, useRef } from 'react';
import { isSpeechSynthesisSupported } from '@/lib/languageUtils';

interface SpeechSynthesisState {
  isSupported: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  voices: SpeechSynthesisVoice[];
  error: string | null;
}

interface SpeechSynthesisHook {
  state: SpeechSynthesisState;
  speak: (text: string, options?: SpeechOptions) => void;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  getVoicesForLanguage: (lang: string) => SpeechSynthesisVoice[];
}

interface SpeechOptions {
  voice?: SpeechSynthesisVoice;
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
}

export function useSpeechSynthesis(): SpeechSynthesisHook {
  const [state, setState] = useState<SpeechSynthesisState>({
    isSupported: isSpeechSynthesisSupported(),
    isSpeaking: false,
    isPaused: false,
    voices: [],
    error: null
  });

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize and load voices
  useEffect(() => {
    if (!state.isSupported) {
      setState(prev => ({ 
        ...prev, 
        error: "Speech synthesis is not supported in this browser." 
      }));
      return;
    }

    // Try to get initial voices
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setState(prev => ({ ...prev, voices }));
      }
    };

    loadVoices();

    // Set up event for when voices change
    window.speechSynthesis.onvoiceschanged = loadVoices;

    // Clean up any ongoing speech synthesis when component unmounts
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [state.isSupported]);

  // Speak function with retry mechanism
  const speak = useCallback((text: string, options: SpeechOptions = {}) => {
    if (!state.isSupported) return;

    // If text is empty, don't try to speak
    if (!text || text.trim() === '') {
      console.warn('Speech synthesis called with empty text');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Create a new utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    // Set options
    if (options.voice) utterance.voice = options.voice;
    if (options.rate !== undefined) utterance.rate = options.rate;
    if (options.pitch !== undefined) utterance.pitch = options.pitch;
    if (options.volume !== undefined) utterance.volume = options.volume;
    if (options.lang) utterance.lang = options.lang;

    // Attempt counter for retries
    let attempts = 0;
    const maxAttempts = 3;
    
    // Function to handle speech synthesis completion
    const handleSpeechComplete = () => {
      setState(prev => ({ ...prev, isSpeaking: false, isPaused: false, error: null }));
    };
    
    // Function to handle speech synthesis errors with retry
    const handleSpeechError = (event: SpeechSynthesisErrorEvent) => {
      console.error('Speech synthesis error:', event.error, 'Attempt:', attempts + 1);
      
      // Different handling based on error type
      if (attempts < maxAttempts) {
        attempts++;
        
        // Delay before retry (increasing with each attempt)
        const retryDelay = 300 * attempts;
        
        console.log(`Retrying speech synthesis in ${retryDelay}ms (attempt ${attempts} of ${maxAttempts})`);
        
        // Try again after delay
        setTimeout(() => {
          try {
            window.speechSynthesis.speak(utterance);
          } catch (e) {
            console.error('Error during speech synthesis retry:', e);
            setState(prev => ({ 
              ...prev, 
              error: `Failed to speak text after ${attempts} attempts`,
              isSpeaking: false,
              isPaused: false
            }));
          }
        }, retryDelay);
      } else {
        // Give up after max attempts
        setState(prev => ({ 
          ...prev, 
          error: `Speech synthesis failed after ${maxAttempts} attempts: ${event.error || "Unknown error"}`,
          isSpeaking: false,
          isPaused: false
        }));
        
        // Try to get more voices if that was the issue
        if (state.voices.length === 0) {
          // Force reload voices
          try {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
              setState(prev => ({ ...prev, voices }));
            }
          } catch (e) {
            console.error('Failed to reload voices:', e);
          }
        }
      }
    };

    // Set up event handlers
    utterance.onstart = () => {
      setState(prev => ({ ...prev, isSpeaking: true, isPaused: false, error: null }));
    };

    utterance.onend = handleSpeechComplete;
    utterance.onerror = handleSpeechError;
    
    // Safari/iOS browser specific issue - ensure utterance doesn't get garbage collected
    // by maintaining a global reference
    if (typeof window !== 'undefined') {
      (window as any).lastUtterance = utterance;
    }

    // Start speaking with timeout protection
    try {
      window.speechSynthesis.speak(utterance);
      
      // Set a timeout to check if speech actually started
      setTimeout(() => {
        if (state.isSpeaking === false && attempts === 0) {
          console.warn('Speech did not start within timeout, attempting restart');
          // Attempt to restart synthesis
          window.speechSynthesis.cancel();
          window.speechSynthesis.resume(); // Workaround for Chrome
          setTimeout(() => {
            try {
              window.speechSynthesis.speak(utterance);
            } catch (error: any) {
              console.error('Error during speech restart:', error);
            }
          }, 150);
        }
      }, 1000);
    } catch (error: any) {
      console.error('Error during initial speech synthesis:', error);
      setState(prev => ({ 
        ...prev, 
        error: "Failed to initialize speech: " + (error?.message || "Unknown error"),
        isSpeaking: false
      }));
    }
  }, [state.isSupported, state.voices.length, state.isSpeaking]);

  // Pause speaking
  const pause = useCallback(() => {
    if (state.isSupported && state.isSpeaking) {
      window.speechSynthesis.pause();
      setState(prev => ({ ...prev, isPaused: true }));
    }
  }, [state.isSupported, state.isSpeaking]);

  // Resume speaking
  const resume = useCallback(() => {
    if (state.isSupported && state.isPaused) {
      window.speechSynthesis.resume();
      setState(prev => ({ ...prev, isPaused: false }));
    }
  }, [state.isSupported, state.isPaused]);

  // Cancel speaking
  const cancel = useCallback(() => {
    if (state.isSupported) {
      window.speechSynthesis.cancel();
      setState(prev => ({ ...prev, isSpeaking: false, isPaused: false }));
    }
  }, [state.isSupported]);

  // Get voices for a specific language
  const getVoicesForLanguage = useCallback((lang: string) => {
    if (!state.isSupported) return [];
    
    // Filter voices for the given language
    return state.voices.filter(voice => voice.lang.startsWith(lang.split('-')[0]));
  }, [state.voices, state.isSupported]);

  return {
    state,
    speak,
    pause,
    resume,
    cancel,
    getVoicesForLanguage
  };
}

export default useSpeechSynthesis;
