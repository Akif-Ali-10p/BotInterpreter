import { Language } from "@/types";

// List of supported languages for translation
export const SUPPORTED_LANGUAGES: Language[] = [
  { code: "en-US", name: "English" },
  { code: "es-ES", name: "Spanish" },
  { code: "fr-FR", name: "French" },
  { code: "de-DE", name: "German" },
  { code: "it-IT", name: "Italian" },
  { code: "pt-PT", name: "Portuguese" },
  { code: "nl-NL", name: "Dutch" },
  { code: "ru-RU", name: "Russian" },
  { code: "zh-CN", name: "Chinese (Simplified)" },
  { code: "ja-JP", name: "Japanese" },
  { code: "ko-KR", name: "Korean" },
  { code: "ar-SA", name: "Arabic" },
  { code: "hi-IN", name: "Hindi" },
  { code: "tr-TR", name: "Turkish" },
  { code: "pl-PL", name: "Polish" }
];

// Function to get a language object by code
export function getLanguageByCode(code: string): Language {
  const language = SUPPORTED_LANGUAGES.find(lang => lang.code === code);
  return language || { code, name: code };
}

// Function to convert a browser language code to a supported language code
export function mapToSupportedLanguage(browserCode: string): string {
  // First try an exact match
  const exactMatch = SUPPORTED_LANGUAGES.find(lang => lang.code === browserCode);
  if (exactMatch) return exactMatch.code;
  
  // Try matching just the base language part
  const baseCode = browserCode.split('-')[0];
  const baseMatch = SUPPORTED_LANGUAGES.find(lang => lang.code.startsWith(baseCode + '-'));
  if (baseMatch) return baseMatch.code;
  
  // Default to English
  return "en-US";
}

// Function to get LibreTranslate language code format (2-letter code)
export function getLibreTranslateCode(languageCode: string): string {
  return languageCode.split('-')[0];
}

// Function to check if speech recognition is supported in browser
export function isSpeechRecognitionSupported(): boolean {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

// Function to check if speech synthesis is supported in browser
export function isSpeechSynthesisSupported(): boolean {
  return 'speechSynthesis' in window;
}

// Function to detect browser language
export function getBrowserLanguage(): string {
  const browserLang = navigator.language || (navigator as any).userLanguage || 'en-US';
  return mapToSupportedLanguage(browserLang);
}
