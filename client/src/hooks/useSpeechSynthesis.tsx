import { useState, useEffect, useCallback, useRef } from 'react';
import { isSpeechSynthesisSupported } from '@/lib/languageUtils';
import { Emotion } from '@/types';

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
  emotion?: Emotion;
  emotionConfidence?: number;
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

  // Speak function with emotion support
  const speak = useCallback((text: string, options: SpeechOptions = {}) => {
    if (!state.isSupported) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Create a new utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    // Apply emotion-based adjustments if emotion is provided
    if (options.emotion && options.emotionConfidence && options.emotionConfidence > 0.6) {
      // Default base values
      let basePitch = options.pitch || 1.0;
      let baseRate = options.rate || 1.0;
      let baseVolume = options.volume || 1.0;
      
      // Adjust speech parameters based on emotion
      switch (options.emotion) {
        case Emotion.HAPPY:
          // Happier tone: higher pitch, slightly faster
          basePitch = Math.min(basePitch * 1.15, 2.0);
          baseRate = Math.min(baseRate * 1.1, 1.5);
          break;
          
        case Emotion.SAD:
          // Sadder tone: lower pitch, slower
          basePitch = Math.max(basePitch * 0.9, 0.7);
          baseRate = Math.max(baseRate * 0.9, 0.8);
          break;
          
        case Emotion.ANGRY:
          // Angry tone: lower pitch, louder, slightly faster
          basePitch = Math.max(basePitch * 0.9, 0.8);
          baseVolume = Math.min(baseVolume * 1.2, 1.0);
          baseRate = Math.min(baseRate * 1.15, 1.4);
          break;
          
        case Emotion.SURPRISED:
          // Surprised tone: higher pitch, faster
          basePitch = Math.min(basePitch * 1.2, 2.0);
          baseRate = Math.min(baseRate * 1.15, 1.5);
          break;
          
        case Emotion.QUESTIONING:
          // Questioning tone: slightly higher pitch
          basePitch = Math.min(basePitch * 1.1, 1.5);
          break;
          
        case Emotion.EXCITED:
          // Excited tone: higher pitch, faster, louder
          basePitch = Math.min(basePitch * 1.2, 2.0);
          baseRate = Math.min(baseRate * 1.2, 1.5);
          baseVolume = Math.min(baseVolume * 1.1, 1.0);
          break;
      }
      
      // Apply the emotion-adjusted values
      options.pitch = basePitch;
      options.rate = baseRate;
      options.volume = baseVolume;
      
      console.log(`Applying emotion ${options.emotion} to speech (confidence: ${options.emotionConfidence.toFixed(2)}): pitch=${options.pitch.toFixed(2)}, rate=${options.rate.toFixed(2)}, volume=${options.volume.toFixed(2)}`);
    }

    // Set options
    if (options.voice) utterance.voice = options.voice;
    if (options.rate !== undefined) utterance.rate = options.rate;
    if (options.pitch !== undefined) utterance.pitch = options.pitch;
    if (options.volume !== undefined) utterance.volume = options.volume;
    if (options.lang) utterance.lang = options.lang;

    // Set up event handlers
    utterance.onstart = () => {
      setState(prev => ({ ...prev, isSpeaking: true, isPaused: false }));
    };

    utterance.onend = () => {
      setState(prev => ({ ...prev, isSpeaking: false, isPaused: false }));
    };

    utterance.onerror = (event) => {
      setState(prev => ({ 
        ...prev, 
        error: event.error || "Speech synthesis error",
        isSpeaking: false,
        isPaused: false
      }));
    };

    // Start speaking
    window.speechSynthesis.speak(utterance);
  }, [state.isSupported]);

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
