// Language types
export interface Language {
  code: string;
  name: string;
}

// Speaker types
export type SpeakerId = 1 | 2;

// Note: Emotion enum removed

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
}

// Detection response
export interface DetectionResponse {
  language: string;
  confidence: number;
}

// For speech recognition
export interface SpeechRecognitionState {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  isRecognizing: boolean;
  language?: string; // Added language property for better restart handling
}

// For each speaker
export interface Speaker {
  id: SpeakerId;
  languageCode: string;
  name: string;
}
