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
  
  // Add language-specific characters or modifications
  switch (targetCode) {
    case 'zh':
      // Add some Chinese-like characters
      return `${prefix}${translatedText} 你好世界`;
    case 'ja':
      // Add some Japanese-like characters
      return `${prefix}${translatedText} こんにちは`;
    case 'ko':
      // Add some Korean-like characters
      return `${prefix}${translatedText} 안녕하세요`;
    case 'ru':
      // Add some Cyrillic-like characters
      return `${prefix}${translatedText} Привет`;
    case 'ar':
      // Add some Arabic-like characters
      return `${prefix}${translatedText} مرحبا`;
    case 'de':
      // Add German structure
      return `${prefix}${translatedText} (übersetzt)`;
    case 'fr':
      // Add French structure
      return `${prefix}${translatedText} (traduit)`;
    case 'es':
      // Add Spanish structure
      return `${prefix}${translatedText} (traducido)`;
    case 'it':
      // Add Italian structure
      return `${prefix}${translatedText} (tradotto)`;
    default:
      // Default mock translation
      return `${prefix}${translatedText} (translated)`;
  }
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

export async function mockTranslate(text: string, source: string | null, target: string) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Return mock translation
  return {
    translatedText: createMockTranslation(text, target),
    detectedLanguage: source ? undefined : getLibreTranslateCode(detectLanguage(text).language)
  };
}

export async function mockDetect(text: string) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Return mock detection result
  return detectLanguage(text);
}