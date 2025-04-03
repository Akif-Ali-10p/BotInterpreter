/**
 * Mock Translation Service
 * 
 * This module provides simulated translation and language detection services
 * for development and testing purposes without relying on external APIs.
 */

import { getLibreTranslateCode } from '../client/src/lib/languageUtils';

// Common prefixes for different languages to simulate translation
const languagePrefixes: Record<string, string> = {
  en: "English: ",
  es: "Spanish: ",
  fr: "French: ",
  de: "German: ",
  it: "Italian: ",
  pt: "Portuguese: ",
  nl: "Dutch: ",
  ru: "Russian: ",
  zh: "Chinese: ",
  ja: "Japanese: ",
  ko: "Korean: ",
  ar: "Arabic: ",
  hi: "Hindi: ",
  tr: "Turkish: ",
  pl: "Polish: ",
  uk: "Ukrainian: ",
  sv: "Swedish: ",
  da: "Danish: ",
  fi: "Finnish: ",
  no: "Norwegian: ",
  cs: "Czech: ",
  el: "Greek: ",
  he: "Hebrew: ",
  th: "Thai: ",
  vi: "Vietnamese: ",
  id: "Indonesian: ",
  ms: "Malay: ",
  ro: "Romanian: ",
  hu: "Hungarian: ",
};

/**
 * Creates a simulated translation of the text
 * For demonstration purposes, this prefixes the text with the target language
 * and adds some language-specific characters to make it look like a translation
 */
function createMockTranslation(text: string, target: string): string {
  // Get the base language code (e.g., 'en' from 'en-US')
  const targetCode = target.split('-')[0];
  
  // Get prefix for the target language
  const prefix = languagePrefixes[targetCode] || `${targetCode}: `;
  
  // Simple transformation based on target language
  let translatedText = text;
  let baseTranslation = "";
  
  // Add language-specific characters or modifications
  switch (targetCode) {
    case 'zh':
      // Add some Chinese-like characters
      baseTranslation = `${prefix}${translatedText} 你好世界`;
      break;
    case 'ja':
      // Add some Japanese-like characters
      baseTranslation = `${prefix}${translatedText} こんにちは`;
      break;
    case 'ko':
      // Add some Korean-like characters
      baseTranslation = `${prefix}${translatedText} 안녕하세요`;
      break;
    case 'ru':
      // Add some Cyrillic-like characters
      baseTranslation = `${prefix}${translatedText} Привет`;
      break;
    case 'ar':
      // Add some Arabic-like characters
      baseTranslation = `${prefix}${translatedText} مرحبا`;
      break;
    case 'de':
      // Add German structure
      baseTranslation = `${prefix}${translatedText} (übersetzt)`;
      break;
    case 'fr':
      // Add French structure
      baseTranslation = `${prefix}${translatedText} (traduit)`;
      break;
    case 'es':
      // Add Spanish structure
      baseTranslation = `${prefix}${translatedText} (traducido)`;
      break;
    case 'it':
      // Add Italian structure
      baseTranslation = `${prefix}${translatedText} (tradotto)`;
      break;
    default:
      // Default mock translation
      baseTranslation = `${prefix}${translatedText} (translated)`;
      break;
  }
  
  return baseTranslation;
}

/**
 * Simulates language detection by looking at the text and making a guess
 * based on common words or patterns in different languages
 */
function detectLanguage(text: string): { language: string; confidence: number } {
  const lowerText = text.toLowerCase();
  
  // Simple keyword-based detection
  if (lowerText.match(/^(the|a|is|and|in|to|have|for|this|with|you|that)\b/)) {
    return { language: "en", confidence: 0.85 };
  } else if (lowerText.match(/^(el|la|los|las|es|y|en|para|con|que|su)\b/)) {
    return { language: "es", confidence: 0.82 };
  } else if (lowerText.match(/^(le|la|les|un|une|et|dans|pour|avec|ce|qui)\b/)) {
    return { language: "fr", confidence: 0.83 };
  } else if (lowerText.match(/^(der|die|das|und|in|ist|für|mit|zu|dem|den)\b/)) {
    return { language: "de", confidence: 0.87 };
  } else if (lowerText.match(/^(il|la|e|in|che|di|per|con|su|anche|sono)\b/)) {
    return { language: "it", confidence: 0.81 };
  } else if (lowerText.match(/^(o|a|os|as|e|em|para|com|que|um|uma)\b/)) {
    return { language: "pt", confidence: 0.79 };
  }
  
  // Default to English with low confidence if we can't determine
  return { language: "en", confidence: 0.55 };
}

/**
 * Mock translation function
 */
export async function mockTranslate(text: string, source: string | null, target: string) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Detect language if not provided
  const detectedLanguage = source ? 
    source : 
    getLibreTranslateCode(detectLanguage(text).language);
  
  // Create translation
  const translatedText = createMockTranslation(text, target);
  
  // Return translation response
  return {
    translatedText,
    detectedLanguage
  };
}

/**
 * Mock language detection
 */
export async function mockDetect(text: string) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Detect language
  const languageResult = detectLanguage(text);
  
  // Return language detection results
  return languageResult;
}