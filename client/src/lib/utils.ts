import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Utility to format a language code to a human-readable name
export function formatLanguageName(code: string): string {
  const languages: Record<string, string> = {
    "en-US": "English",
    "es-ES": "Spanish",
    "fr-FR": "French",
    "de-DE": "German",
    "it-IT": "Italian",
    "pt-PT": "Portuguese",
    "nl-NL": "Dutch",
    "ru-RU": "Russian",
    "zh-CN": "Chinese (Simplified)",
    "ja-JP": "Japanese",
    "ko-KR": "Korean",
    "ar-SA": "Arabic",
    "hi-IN": "Hindi",
    "tr-TR": "Turkish",
    "pl-PL": "Polish",
    "uk-UA": "Ukrainian",
    "sv-SE": "Swedish",
    "da-DK": "Danish",
    "fi-FI": "Finnish",
    "no-NO": "Norwegian",
    "cs-CZ": "Czech",
    "el-GR": "Greek",
    "he-IL": "Hebrew",
    "th-TH": "Thai",
    "vi-VN": "Vietnamese",
    "id-ID": "Indonesian",
    "ms-MY": "Malay",
    "ro-RO": "Romanian",
    "hu-HU": "Hungarian",
  };

  return languages[code] || code;
}

// Format date for messages
export function formatMessageTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
}

// Get BCP-47 language code for speech synthesis from our language code
export function getSpeechLanguageCode(languageCode: string): string {
  // Most modern browser speech synthesis APIs use BCP-47 format
  // Our codes are already in this format, but this function allows
  // for future conversion if needed
  return languageCode;
}

// Get a simple locale code for translation API from our language code
export function getTranslationLanguageCode(languageCode: string): string {
  // LibreTranslate uses 2-letter language codes
  return languageCode.split('-')[0];
}

// Utility to get browser-supported voices for a language
export function getVoicesForLanguage(languageCode: string): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return [];
  }
  
  const voices = window.speechSynthesis.getVoices();
  return voices.filter(voice => voice.lang.startsWith(languageCode.split('-')[0]));
}

// Utility to get a default voice for a language
export function getDefaultVoice(languageCode: string, preferFemale = true): SpeechSynthesisVoice | null {
  const voices = getVoicesForLanguage(languageCode);
  
  if (voices.length === 0) return null;
  
  // Try to find a voice with the requested gender preference
  const preferredVoice = voices.find(voice => 
    preferFemale ? voice.name.includes('female') : voice.name.includes('male')
  );
  
  // Return preferred voice or first available
  return preferredVoice || voices[0];
}

// Sleep for a specified time (used for delaying animations)
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
