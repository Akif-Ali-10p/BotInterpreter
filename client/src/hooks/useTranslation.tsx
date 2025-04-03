import { useState, useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { DetectionResponse, TranslationResponse } from '@/types';
import { getLibreTranslateCode } from '@/lib/languageUtils';

interface TranslationState {
  isTranslating: boolean;
  error: string | null;
}

interface TranslationHook {
  state: TranslationState;
  translateText: (text: string, source: string | null, target: string) => Promise<TranslationResponse>;
  detectLanguage: (text: string) => Promise<DetectionResponse>;
}

export function useTranslation(): TranslationHook {
  const [state, setState] = useState<TranslationState>({
    isTranslating: false,
    error: null
  });

  // Translate text from source to target language
  const translateText = useCallback(async (
    text: string, 
    source: string | null, 
    target: string
  ): Promise<TranslationResponse> => {
    if (!text || !target) {
      throw new Error("Text and target language are required for translation");
    }

    setState({ isTranslating: true, error: null });

    try {
      // Convert language codes to the format expected by LibreTranslate
      const sourceCode = source ? getLibreTranslateCode(source) : null;
      const targetCode = getLibreTranslateCode(target);

      // Call the backend translation endpoint
      const response = await apiRequest('POST', '/api/translate', {
        text,
        source: sourceCode,
        target: targetCode
      });

      const data = await response.json();
      setState({ isTranslating: false, error: null });
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setState({ isTranslating: false, error: errorMessage });
      throw error;
    }
  }, []);

  // Detect the language of a text
  const detectLanguage = useCallback(async (text: string): Promise<DetectionResponse> => {
    if (!text) {
      throw new Error("Text is required for language detection");
    }

    setState({ isTranslating: true, error: null });

    try {
      // Call the backend detection endpoint
      const response = await apiRequest('POST', '/api/detect', { text });
      const data = await response.json();
      
      setState({ isTranslating: false, error: null });
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setState({ isTranslating: false, error: errorMessage });
      throw error;
    }
  }, []);

  return {
    state,
    translateText,
    detectLanguage
  };
}

export default useTranslation;
