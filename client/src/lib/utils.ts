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

/**
 * Generate a phonetic pronunciation guide for the given text and language
 * This function creates a simplified phonetic representation to help with pronunciation
 * 
 * @param text The text to generate phonetic guide for
 * @param langCode The language code of the text
 * @returns Phonetic pronunciation guide
 */
export function generatePhoneticGuide(text: string, langCode: string): string {
  // Split the text into words
  const words = text.split(/\s+/);
  
  // Apply language-specific phonetic rules
  const primaryLang = langCode.split('-')[0];
  
  // For short texts or texts with few words, process the whole text
  // For longer texts, only process the first few words to avoid clutter
  const maxWords = words.length <= 5 ? words.length : Math.min(3, words.length);
  const wordsToProcess = words.slice(0, maxWords);
  
  let phoneticWords: string[] = [];
  
  wordsToProcess.forEach(word => {
    // Skip very short words, punctuation, or numbers
    if (word.length <= 1 || /^[0-9.,!?;:()[\]{}'"]+$/.test(word)) {
      return;
    }
    
    // Remove punctuation for processing
    const cleanWord = word.replace(/[.,!?;:()[\]{}'"]+/g, '');
    if (cleanWord.length <= 1) return;
    
    let phoneticWord = "";
    
    switch (primaryLang) {
      case 'fr': // French
        phoneticWord = generateFrenchPhonetic(cleanWord);
        break;
      case 'es': // Spanish
        phoneticWord = generateSpanishPhonetic(cleanWord);
        break;
      case 'de': // German
        phoneticWord = generateGermanPhonetic(cleanWord);
        break;
      case 'it': // Italian
        phoneticWord = generateItalianPhonetic(cleanWord);
        break;
      case 'ja': // Japanese
        phoneticWord = generateJapanesePhonetic(cleanWord);
        break;
      case 'zh': // Chinese
        phoneticWord = ""; // We'll handle this differently with pinyin
        break;
      case 'ru': // Russian
        phoneticWord = generateRussianPhonetic(cleanWord);
        break;
      case 'ar': // Arabic
        phoneticWord = generateArabicPhonetic(cleanWord);
        break;
      default:
        // For other languages or English, use a simple representation
        phoneticWord = cleanWord;
    }
    
    if (phoneticWord) {
      phoneticWords.push(phoneticWord);
    }
  });
  
  // If no phonetic words were generated, return an empty string
  if (phoneticWords.length === 0) {
    return "";
  }
  
  // For Chinese, add pinyin instead
  if (primaryLang === 'zh') {
    // This is a simplified approach, in a real app you would use a proper pinyin library
    return "[Pronunciation guide not available for this language]";
  }
  
  // Join the phonetic words with spacing
  return phoneticWords.join(' ');
}

// Language-specific phonetic guide generators
function generateFrenchPhonetic(word: string): string {
  let phonetic = word.toLowerCase()
    // Common French sounds
    .replace(/oi/g, 'wah')
    .replace(/eu/g, 'uh')
    .replace(/ou/g, 'oo')
    .replace(/au|eau/g, 'oh')
    .replace(/ai|è|ê|ei/g, 'eh')
    .replace(/ch/g, 'sh')
    .replace(/gn/g, 'ny')
    .replace(/qu/g, 'k')
    .replace(/ç/g, 's')
    .replace(/j/g, 'zh')
    .replace(/u/g, 'ü')
    .replace(/r/g, 'ʁ');
  
  // Handle silent letters at the end
  phonetic = phonetic.replace(/e$/, 'uh');
  
  return phonetic;
}

function generateSpanishPhonetic(word: string): string {
  let phonetic = word.toLowerCase()
    // Common Spanish sounds
    .replace(/ñ/g, 'ny')
    .replace(/ll/g, 'y')
    .replace(/j/g, 'h')
    .replace(/h/g, '') // Silent in Spanish
    .replace(/qu/g, 'k')
    .replace(/ce|ci/g, 'se')
    .replace(/ge|gi/g, 'he')
    .replace(/z/g, 's')
    .replace(/v/g, 'b');
  
  return phonetic;
}

function generateGermanPhonetic(word: string): string {
  let phonetic = word.toLowerCase()
    // Common German sounds
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/ch/g, 'kh')
    .replace(/sch/g, 'sh')
    .replace(/ei/g, 'eye')
    .replace(/ie/g, 'ee')
    .replace(/eu|äu/g, 'oy')
    .replace(/w/g, 'v')
    .replace(/v/g, 'f')
    .replace(/j/g, 'y')
    .replace(/z/g, 'ts');
  
  return phonetic;
}

function generateItalianPhonetic(word: string): string {
  let phonetic = word.toLowerCase()
    // Common Italian sounds
    .replace(/gli/g, 'lyee')
    .replace(/gn/g, 'ny')
    .replace(/sce|sci/g, 'sheh')
    .replace(/ce|ci/g, 'cheh')
    .replace(/ch/g, 'k')
    .replace(/c/g, 'k')
    .replace(/g/g, 'j')
    .replace(/z/g, 'dz');
  
  return phonetic;
}

function generateJapanesePhonetic(word: string): string {
  // For Japanese, we would typically use romaji or a simplified phonetic
  // This is a very simplified approach
  return "[Romaji guide]";
}

function generateRussianPhonetic(word: string): string {
  // For Cyrillic script, we would use transliteration
  // This is a very simplified approach
  return "[Transliteration guide]";
}

function generateArabicPhonetic(word: string): string {
  // For Arabic script, we would use transliteration
  // This is a very simplified approach
  return "[Transliteration guide]";
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
