/**
 * Azure AI Translator Service
 * 
 * This module provides integration with the Azure AI Translator API for translation
 * and language detection services.
 * 
 * Required environment variables:
 * - AZURE_TRANSLATOR_KEY: The API key for Azure Translator service
 * - AZURE_TRANSLATOR_REGION: The Azure region where the Translator service is hosted
 */

import axios from 'axios';

// Azure Translator configuration
const AZURE_TRANSLATOR_KEY = process.env.AZURE_TRANSLATOR_KEY || '';
const AZURE_TRANSLATOR_REGION = process.env.AZURE_TRANSLATOR_REGION || 'eastus';
const AZURE_TRANSLATOR_ENDPOINT = 'https://api.cognitive.microsofttranslator.com';

interface AzureTranslateResponse {
  detectedLanguage?: {
    language: string;
    score: number;
  };
  translations: {
    text: string;
    to: string;
  }[];
}

interface AzureDetectResponse {
  language: string;
  score: number;
  isTranslationSupported: boolean;
  isTransliterationSupported: boolean;
  alternatives: {
    language: string;
    score: number;
    isTranslationSupported: boolean;
    isTransliterationSupported: boolean;
  }[];
}

/**
 * Translates text from one language to another using Azure Translator
 * 
 * @param text - The text to translate
 * @param source - The source language code (null for automatic detection)
 * @param target - The target language code
 * @returns The translated text and detected language if source is null
 */
export async function translate(
  text: string, 
  source: string | null, 
  target: string
): Promise<{ translatedText: string, detectedLanguage?: string }> {
  try {
    const requestData = [{ text }];
    
    const params: Record<string, string> = {
      'api-version': '3.0',
      'to': target
    };
    
    // Add source language if provided
    if (source !== null) {
      params['from'] = source;
    }
    
    const response = await axios.post<AzureTranslateResponse[]>(
      `${AZURE_TRANSLATOR_ENDPOINT}/translate`,
      requestData,
      {
        headers: {
          'Ocp-Apim-Subscription-Key': AZURE_TRANSLATOR_KEY,
          'Ocp-Apim-Subscription-Region': AZURE_TRANSLATOR_REGION,
          'Content-Type': 'application/json'
        },
        params,
        timeout: 5000 // 5 second timeout
      }
    );
    
    // Azure returns an array of results (one per input text)
    const result = response.data[0];
    return {
      translatedText: result.translations[0].text,
      detectedLanguage: result.detectedLanguage?.language
    };
  } catch (error) {
    console.error('Azure Translator error:', error);
    
    // Provide more helpful error messages
    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status;
      const message = error.response.data?.error?.message || error.message;
      
      if (status === 401 || status === 403) {
        throw new Error(`Azure Translator authentication failed: ${message}`);
      } else if (status === 429) {
        throw new Error(`Azure Translator rate limit exceeded: ${message}`);
      } else if (status === 400) {
        throw new Error(`Azure Translator bad request: ${message}`);
      } else {
        throw new Error(`Azure Translator error (${status}): ${message}`);
      }
    }
    
    // Fallback to a generic error message
    throw new Error(`Failed to translate text: ${(error as Error).message}`);
  }
}

/**
 * Detects the language of the provided text using Azure Translator
 * 
 * @param text - The text to analyze for language detection
 * @returns The detected language code and confidence score
 */
export async function detect(text: string): Promise<{ language: string, confidence: number }> {
  try {
    const requestData = [{ text }];
    
    const response = await axios.post<AzureDetectResponse[]>(
      `${AZURE_TRANSLATOR_ENDPOINT}/detect`,
      requestData,
      {
        headers: {
          'Ocp-Apim-Subscription-Key': AZURE_TRANSLATOR_KEY,
          'Ocp-Apim-Subscription-Region': AZURE_TRANSLATOR_REGION,
          'Content-Type': 'application/json'
        },
        params: {
          'api-version': '3.0'
        },
        timeout: 5000 // 5 second timeout
      }
    );
    
    // Azure returns an array of results (one per input text)
    const result = response.data[0];
    return {
      language: result.language,
      confidence: result.score
    };
  } catch (error) {
    console.error('Azure Translator language detection error:', error);
    
    // Provide more helpful error messages
    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status;
      const message = error.response.data?.error?.message || error.message;
      
      if (status === 401 || status === 403) {
        throw new Error(`Azure Translator authentication failed: ${message}`);
      } else if (status === 429) {
        throw new Error(`Azure Translator rate limit exceeded: ${message}`);
      } else {
        throw new Error(`Azure Translator error (${status}): ${message}`);
      }
    }
    
    // Fallback to a generic error message
    throw new Error(`Failed to detect language: ${(error as Error).message}`);
  }
}

/**
 * Retrieves the list of supported languages from Azure Translator
 */
export async function getSupportedLanguages(): Promise<{ code: string, name: string }[]> {
  try {
    const response = await axios.get(
      `${AZURE_TRANSLATOR_ENDPOINT}/languages`,
      {
        headers: {
          'Ocp-Apim-Subscription-Key': AZURE_TRANSLATOR_KEY,
          'Ocp-Apim-Subscription-Region': AZURE_TRANSLATOR_REGION,
          'Accept-Language': 'en'
        },
        params: {
          'api-version': '3.0',
          'scope': 'translation'
        },
        timeout: 5000 // 5 second timeout
      }
    );
    
    // Format the response to match our expected interface
    const languages = response.data.translation;
    return Object.entries(languages).map(([code, details]: [string, any]) => ({
      code,
      name: details.name
    }));
  } catch (error) {
    console.error('Error fetching supported languages:', error);
    throw new Error(`Failed to get supported languages: ${(error as Error).message}`);
  }
}

// Import fallback service
import { mockTranslate, mockDetect } from './mockTranslation';

/**
 * Translates text with Azure Translator with fallback to mock translation
 */
export async function translateWithFallback(
  text: string, 
  source: string | null, 
  target: string
): Promise<{ translatedText: string, detectedLanguage?: string }> {
  try {
    return await translate(text, source, target);
  } catch (error) {
    console.warn('Azure Translator failed, falling back to mock translation:', error);
    const result = await mockTranslate(text, source, target);
    return result;
  }
}

/**
 * Detects language with Azure Translator with fallback to mock detection
 */
export async function detectWithFallback(
  text: string
): Promise<{ language: string, confidence: number }> {
  try {
    return await detect(text);
  } catch (error) {
    console.warn('Azure Translator detection failed, falling back to mock detection:', error);
    const result = await mockDetect(text);
    return result;
  }
}