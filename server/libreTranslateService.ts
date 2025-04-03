/**
 * LibreTranslate Service
 * 
 * This module provides integration with the LibreTranslate API for translation
 * and language detection services.
 * 
 * LibreTranslate is an open-source machine translation API.
 * 
 * Public instances of LibreTranslate can be found at:
 * - https://libretranslate.com/
 * - https://translate.argosopentech.com/
 * - https://translate.terraprint.co/
 * 
 * Note: Some instances may require an API key or have rate limits.
 */

import axios from 'axios';

// Default LibreTranslate endpoint - using a public instance
// You can change this to your preferred instance or self-hosted version
const LIBRE_TRANSLATE_API = 'https://translate.argosopentech.com';

// Optional API key if the instance requires one
const API_KEY = process.env.LIBRE_TRANSLATE_API_KEY || '';

interface TranslateResponse {
  translatedText: string;
  detectedLanguage?: {
    confidence: number;
    language: string;
  };
}

interface DetectResponse {
  confidence: number;
  language: string;
}

/**
 * Translates text from one language to another using LibreTranslate
 * 
 * @param text - The text to translate
 * @param source - The source language code (use 'auto' for automatic detection)
 * @param target - The target language code
 * @returns The translated text and detected language if source is 'auto'
 */
export async function translate(
  text: string, 
  source: string | null, 
  target: string
): Promise<{ translatedText: string, detectedLanguage?: string }> {
  try {
    const requestData: any = {
      q: text,
      target: target,
      format: 'text'
    };

    // If source is null, use 'auto' for language detection
    if (source === null) {
      requestData.source = 'auto';
    } else {
      requestData.source = source;
    }

    // Add API key if available
    if (API_KEY) {
      requestData.api_key = API_KEY;
    }

    const response = await axios.post<TranslateResponse>(
      `${LIBRE_TRANSLATE_API}/translate`,
      requestData,
      { timeout: 5000 } // 5 second timeout
    );

    return {
      translatedText: response.data.translatedText,
      detectedLanguage: response.data.detectedLanguage?.language
    };
  } catch (error) {
    console.error('LibreTranslate error:', error);
    
    // Provide more helpful error messages
    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status;
      const message = error.response.data?.error || error.message;
      
      if (status === 403) {
        throw new Error(`LibreTranslate API key required or invalid: ${message}`);
      } else if (status === 429) {
        throw new Error(`LibreTranslate rate limit exceeded: ${message}`);
      } else if (status === 400) {
        throw new Error(`LibreTranslate bad request: ${message}`);
      } else {
        throw new Error(`LibreTranslate error (${status}): ${message}`);
      }
    }
    
    // Fallback to a generic error message
    throw new Error(`Failed to translate text: ${(error as Error).message}`);
  }
}

/**
 * Detects the language of the provided text using LibreTranslate
 * 
 * @param text - The text to analyze for language detection
 * @returns The detected language code and confidence score
 */
export async function detect(text: string): Promise<{ language: string, confidence: number }> {
  try {
    const requestData: any = {
      q: text
    };

    // Add API key if available
    if (API_KEY) {
      requestData.api_key = API_KEY;
    }

    const response = await axios.post<DetectResponse[]>(
      `${LIBRE_TRANSLATE_API}/detect`,
      requestData,
      { timeout: 5000 } // 5 second timeout
    );

    // LibreTranslate returns an array of possible languages with confidence
    // We'll take the first/best result
    if (response.data && response.data.length > 0) {
      return {
        language: response.data[0].language,
        confidence: response.data[0].confidence
      };
    }

    throw new Error('No language detection results returned');
  } catch (error) {
    console.error('LibreTranslate language detection error:', error);
    
    // Provide more helpful error messages
    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status;
      const message = error.response.data?.error || error.message;
      
      if (status === 403) {
        throw new Error(`LibreTranslate API key required or invalid: ${message}`);
      } else if (status === 429) {
        throw new Error(`LibreTranslate rate limit exceeded: ${message}`);
      } else {
        throw new Error(`LibreTranslate error (${status}): ${message}`);
      }
    }
    
    // Fallback to a generic error message
    throw new Error(`Failed to detect language: ${(error as Error).message}`);
  }
}

/**
 * Retrieves the list of supported languages from LibreTranslate
 */
export async function getSupportedLanguages(): Promise<{ code: string, name: string }[]> {
  try {
    const response = await axios.get(`${LIBRE_TRANSLATE_API}/languages`, { timeout: 5000 });
    return response.data;
  } catch (error) {
    console.error('Error fetching supported languages:', error);
    throw new Error(`Failed to get supported languages: ${(error as Error).message}`);
  }
}

// Fallback to mock translation if LibreTranslate fails
import { mockTranslate, mockDetect } from './mockTranslation';

/**
 * Translates text with LibreTranslate with fallback to mock translation
 */
export async function translateWithFallback(
  text: string, 
  source: string | null, 
  target: string
): Promise<{ translatedText: string, detectedLanguage?: string }> {
  try {
    return await translate(text, source, target);
  } catch (error) {
    console.warn('LibreTranslate failed, falling back to mock translation:', error);
    const result = await mockTranslate(text, source, target);
    return result;
  }
}

/**
 * Detects language with LibreTranslate with fallback to mock detection
 */
export async function detectWithFallback(
  text: string
): Promise<{ language: string, confidence: number }> {
  try {
    return await detect(text);
  } catch (error) {
    console.warn('LibreTranslate detection failed, falling back to mock detection:', error);
    const result = await mockDetect(text);
    return result;
  }
}