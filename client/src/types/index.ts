// Language types
export interface Language {
  code: string;
  name: string;
}

// Speaker types
export type SpeakerId = 1 | 2;

// Emotion types
export enum Emotion {
  NEUTRAL = 'neutral',
  HAPPY = 'happy',
  SAD = 'sad',
  ANGRY = 'angry',
  SURPRISED = 'surprised',
  QUESTIONING = 'questioning',
  EXCITED = 'excited'
}

// Message types
export interface Message {
  id: number;
  sessionId: string;
  speakerId: SpeakerId;
  originalText: string;
  translatedText: string;
  originalLanguage: string;
  targetLanguage: string;
  timestamp: Date;
  // Emotion detection fields
  emotion?: Emotion;
  emotionConfidence?: number;
}

// Settings types
export interface Settings {
  userId: string;
  autoDetect: boolean;
  speechRate: string;
  voiceSelection: string;
  darkMode: boolean;
  saveHistory: boolean;
  person1Language: string;
  person2Language: string;
}

// Translation response
export interface TranslationResponse {
  translatedText: string;
  detectedLanguage?: string;
  emotion?: Emotion;
  emotionConfidence?: number;
}

// Detection response
export interface DetectionResponse {
  language: string;
  confidence: number;
  emotion?: Emotion;
  emotionConfidence?: number;
}

// For speech recognition
export interface SpeechRecognitionState {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  isRecognizing: boolean;
}

// For each speaker
export interface Speaker {
  id: SpeakerId;
  languageCode: string;
  name: string;
}
