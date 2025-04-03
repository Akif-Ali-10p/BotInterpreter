/**
 * Emotion Detection Service
 * 
 * This module provides functionality to analyze text and detect emotions
 * to enhance the translation with emotional context.
 */

// Types of emotions we can detect
export enum Emotion {
  NEUTRAL = 'neutral',
  HAPPY = 'happy',
  SAD = 'sad',
  ANGRY = 'angry',
  SURPRISED = 'surprised',
  QUESTIONING = 'questioning',
  EXCITED = 'excited'
}

// Result of emotion detection
export interface EmotionDetectionResult {
  primaryEmotion: Emotion;
  confidence: number;
  secondaryEmotion?: Emotion;
}

// Keywords associated with different emotions
const emotionKeywords = {
  [Emotion.HAPPY]: [
    'happy', 'glad', 'joy', 'delighted', 'pleased', 'smile', 'great', 'wonderful',
    'love', 'amazing', 'excellent', 'fantastic', 'awesome', 'yay', 'hurray', 'congratulations'
  ],
  [Emotion.SAD]: [
    'sad', 'unhappy', 'depressed', 'sorry', 'regret', 'miss', 'disappointed',
    'unfortunately', 'cry', 'tear', 'grief', 'heartbroken', 'miserable'
  ],
  [Emotion.ANGRY]: [
    'angry', 'mad', 'furious', 'upset', 'annoyed', 'frustrated', 'hate',
    'damn', 'terrible', 'awful', 'horrible', 'outrageous'
  ],
  [Emotion.SURPRISED]: [
    'surprised', 'shocked', 'wow', 'omg', 'oh my', 'unbelievable', 'incredible',
    'astonishing', 'unexpected', 'amazing'
  ],
  [Emotion.QUESTIONING]: [
    'why', 'how', 'what', 'when', 'where', 'who', 'which', 'whose',
    'question', 'wondering', 'curious', 'confused', 'unclear'
  ],
  [Emotion.EXCITED]: [
    'excited', 'thrilled', 'eager', 'enthusiastic', 'looking forward',
    'can\'t wait', 'stoked', 'pumped'
  ]
};

// Punctuation that indicates emotions
const emotionPunctuation = {
  [Emotion.HAPPY]: ['!', ':)', ':-)', ':D', '😊', '😃', '😄'],
  [Emotion.SAD]: [':(', ':-(', '😢', '😭', '😞', '😔'],
  [Emotion.ANGRY]: ['!!', '😠', '😡', '🤬'],
  [Emotion.SURPRISED]: ['!?', '?!', '😲', '😮', '😯', '😳'],
  [Emotion.QUESTIONING]: ['?', '🤔'],
  [Emotion.EXCITED]: ['!!!', '!!!!', '😁', '🎉', '🥳']
};

/**
 * Detect emotion from text
 * 
 * This function analyzes text content to determine the emotional context
 * 
 * @param text Text to analyze
 * @returns Object containing the detected emotion and confidence
 */
export function detectEmotion(text: string): EmotionDetectionResult {
  // Default to neutral emotion
  let result: EmotionDetectionResult = {
    primaryEmotion: Emotion.NEUTRAL,
    confidence: 0.5
  };
  
  if (!text || text.trim().length === 0) {
    return result;
  }
  
  // Normalize text: lowercase and remove extra spaces
  const normalizedText = text.toLowerCase().trim();
  
  // Scores for each emotion
  const scores: Record<Emotion, number> = {
    [Emotion.NEUTRAL]: 0.1, // Small baseline for neutral
    [Emotion.HAPPY]: 0,
    [Emotion.SAD]: 0,
    [Emotion.ANGRY]: 0,
    [Emotion.SURPRISED]: 0,
    [Emotion.QUESTIONING]: 0,
    [Emotion.EXCITED]: 0
  };
  
  // Check for keywords
  for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
    for (const keyword of keywords) {
      if (normalizedText.includes(keyword)) {
        // Word boundary check to ensure we're not matching partial words
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (regex.test(normalizedText)) {
          scores[emotion as Emotion] += 0.2;
        }
      }
    }
  }
  
  // Check for punctuation
  for (const [emotion, punctuations] of Object.entries(emotionPunctuation)) {
    for (const punctuation of punctuations) {
      if (normalizedText.includes(punctuation)) {
        scores[emotion as Emotion] += 0.3;
      }
    }
  }
  
  // Check for repetition of punctuation (enthusiasm/intensity)
  if (normalizedText.includes('!!!')) {
    scores[Emotion.EXCITED] += 0.3;
  } else if (normalizedText.includes('!!')) {
    scores[Emotion.ANGRY] += 0.2;
    scores[Emotion.EXCITED] += 0.2;
  }
  
  // Check for capitalization (shouting)
  if (text === text.toUpperCase() && text.length > 3) {
    scores[Emotion.ANGRY] += 0.3;
    scores[Emotion.EXCITED] += 0.2;
  }
  
  // Find the emotion with the highest score
  let maxScore = 0;
  let secondMaxScore = 0;
  let secondaryEmotion: Emotion | undefined;
  
  for (const [emotion, score] of Object.entries(scores)) {
    if (score > maxScore) {
      secondMaxScore = maxScore;
      secondaryEmotion = result.primaryEmotion;
      maxScore = score;
      result.primaryEmotion = emotion as Emotion;
    } else if (score > secondMaxScore) {
      secondMaxScore = score;
      secondaryEmotion = emotion as Emotion;
    }
  }
  
  // Calculate confidence (normalize between 0.5 and 1)
  result.confidence = Math.min(0.5 + (maxScore / 2), 1);
  
  // Add secondary emotion if its score is significant
  if (secondMaxScore > 0.2) {
    result.secondaryEmotion = secondaryEmotion;
  }
  
  return result;
}

/**
 * Enhance translated text with emotional markers
 * 
 * This function adapts the translation to reflect the detected emotion
 * 
 * @param translatedText The already translated text
 * @param emotion The detected emotion
 * @param targetLanguage The language of the translation
 * @returns Enhanced translation with appropriate emotional markers
 */
export function enhanceTranslationWithEmotion(
  translatedText: string,
  emotion: EmotionDetectionResult,
  targetLanguage: string
): string {
  // If emotion is neutral or low confidence, return unchanged
  if (emotion.primaryEmotion === Emotion.NEUTRAL || emotion.confidence < 0.6) {
    return translatedText;
  }
  
  // Get appropriate emotional markers based on target language
  const emotionalEnhancers = getEmotionalEnhancers(targetLanguage);
  const primaryEmotion = emotion.primaryEmotion;
  
  if (!emotionalEnhancers[primaryEmotion]) {
    return translatedText;
  }
  
  // Select a random enhancer from the list
  const enhancers = emotionalEnhancers[primaryEmotion];
  const randomEnhancer = enhancers[Math.floor(Math.random() * enhancers.length)];
  
  // Apply the enhancer based on its position
  if (randomEnhancer.position === 'prefix') {
    return `${randomEnhancer.text} ${translatedText}`;
  } else if (randomEnhancer.position === 'suffix') {
    return `${translatedText} ${randomEnhancer.text}`;
  } else if (randomEnhancer.position === 'punctuation') {
    // Replace ending punctuation or add if none exists
    return translatedText.replace(/[.!?]?$/, randomEnhancer.text);
  }
  
  return translatedText;
}

/**
 * Get language-specific emotional enhancers
 * 
 * @param languageCode The target language code
 * @returns Object with emotion enhancers for the specified language
 */
function getEmotionalEnhancers(languageCode: string): Record<Emotion, Array<{text: string, position: 'prefix' | 'suffix' | 'punctuation'}>> {
  // Default to English
  const lang = languageCode.split('-')[0].toLowerCase();
  
  // Define enhancers for different languages
  const languageEnhancers: Record<string, Record<Emotion, Array<{text: string, position: 'prefix' | 'suffix' | 'punctuation'}>>> = {
    // English enhancers
    en: {
      [Emotion.HAPPY]: [
        { text: '!', position: 'punctuation' },
        { text: 'Happily,', position: 'prefix' },
        { text: 'Gladly,', position: 'prefix' },
        { text: 'with joy', position: 'suffix' }
      ],
      [Emotion.SAD]: [
        { text: 'Unfortunately,', position: 'prefix' },
        { text: 'Sadly,', position: 'prefix' },
        { text: 'with regret', position: 'suffix' },
        { text: '...', position: 'punctuation' }
      ],
      [Emotion.ANGRY]: [
        { text: '!', position: 'punctuation' },
        { text: 'Angrily,', position: 'prefix' },
        { text: 'Furiously,', position: 'prefix' },
        { text: 'with frustration', position: 'suffix' }
      ],
      [Emotion.SURPRISED]: [
        { text: '!', position: 'punctuation' },
        { text: 'Surprisingly,', position: 'prefix' },
        { text: 'Astonishingly,', position: 'prefix' },
        { text: 'with amazement', position: 'suffix' }
      ],
      [Emotion.QUESTIONING]: [
        { text: '?', position: 'punctuation' },
        { text: 'I wonder,', position: 'prefix' },
        { text: 'Curiously,', position: 'prefix' }
      ],
      [Emotion.EXCITED]: [
        { text: '!', position: 'punctuation' },
        { text: 'Excitedly,', position: 'prefix' },
        { text: 'Enthusiastically,', position: 'prefix' },
        { text: 'with excitement', position: 'suffix' }
      ],
      [Emotion.NEUTRAL]: [
        { text: '.', position: 'punctuation' }
      ]
    },
    
    // Spanish enhancers
    es: {
      [Emotion.HAPPY]: [
        { text: '!', position: 'punctuation' },
        { text: '¡Felizmente,', position: 'prefix' },
        { text: 'Con alegría,', position: 'prefix' },
        { text: 'con felicidad', position: 'suffix' }
      ],
      [Emotion.SAD]: [
        { text: 'Desafortunadamente,', position: 'prefix' },
        { text: 'Tristemente,', position: 'prefix' },
        { text: 'con pesar', position: 'suffix' },
        { text: '...', position: 'punctuation' }
      ],
      [Emotion.ANGRY]: [
        { text: '!', position: 'punctuation' },
        { text: '¡Con enfado,', position: 'prefix' },
        { text: '¡Furiosamente,', position: 'prefix' },
        { text: 'con frustración', position: 'suffix' }
      ],
      [Emotion.SURPRISED]: [
        { text: '!', position: 'punctuation' },
        { text: '¡Sorprendentemente,', position: 'prefix' },
        { text: '¡Asombrosamente,', position: 'prefix' },
        { text: 'con asombro', position: 'suffix' }
      ],
      [Emotion.QUESTIONING]: [
        { text: '?', position: 'punctuation' },
        { text: '¿Me pregunto,', position: 'prefix' },
        { text: 'Con curiosidad,', position: 'prefix' }
      ],
      [Emotion.EXCITED]: [
        { text: '!', position: 'punctuation' },
        { text: '¡Con entusiasmo,', position: 'prefix' },
        { text: '¡Emocionadamente,', position: 'prefix' },
        { text: 'con emoción', position: 'suffix' }
      ],
      [Emotion.NEUTRAL]: [
        { text: '.', position: 'punctuation' }
      ]
    },
    
    // French enhancers
    fr: {
      [Emotion.HAPPY]: [
        { text: '!', position: 'punctuation' },
        { text: 'Joyeusement,', position: 'prefix' },
        { text: 'Avec plaisir,', position: 'prefix' },
        { text: 'avec joie', position: 'suffix' }
      ],
      [Emotion.SAD]: [
        { text: 'Malheureusement,', position: 'prefix' },
        { text: 'Tristement,', position: 'prefix' },
        { text: 'avec regret', position: 'suffix' },
        { text: '...', position: 'punctuation' }
      ],
      [Emotion.ANGRY]: [
        { text: '!', position: 'punctuation' },
        { text: 'Avec colère,', position: 'prefix' },
        { text: 'Furieusement,', position: 'prefix' },
        { text: 'avec frustration', position: 'suffix' }
      ],
      [Emotion.SURPRISED]: [
        { text: '!', position: 'punctuation' },
        { text: 'Étonnamment,', position: 'prefix' },
        { text: 'Avec surprise,', position: 'prefix' },
        { text: 'avec étonnement', position: 'suffix' }
      ],
      [Emotion.QUESTIONING]: [
        { text: '?', position: 'punctuation' },
        { text: 'Je me demande,', position: 'prefix' },
        { text: 'Avec curiosité,', position: 'prefix' }
      ],
      [Emotion.EXCITED]: [
        { text: '!', position: 'punctuation' },
        { text: 'Avec enthousiasme,', position: 'prefix' },
        { text: 'Avec excitation,', position: 'prefix' },
        { text: 'avec entrain', position: 'suffix' }
      ],
      [Emotion.NEUTRAL]: [
        { text: '.', position: 'punctuation' }
      ]
    },
    
    // German enhancers
    de: {
      [Emotion.HAPPY]: [
        { text: '!', position: 'punctuation' },
        { text: 'Glücklich,', position: 'prefix' },
        { text: 'Freudig,', position: 'prefix' },
        { text: 'mit Freude', position: 'suffix' }
      ],
      [Emotion.SAD]: [
        { text: 'Unglücklicherweise,', position: 'prefix' },
        { text: 'Traurigerweise,', position: 'prefix' },
        { text: 'mit Bedauern', position: 'suffix' },
        { text: '...', position: 'punctuation' }
      ],
      [Emotion.ANGRY]: [
        { text: '!', position: 'punctuation' },
        { text: 'Wütend,', position: 'prefix' },
        { text: 'Verärgert,', position: 'prefix' },
        { text: 'mit Frustration', position: 'suffix' }
      ],
      [Emotion.SURPRISED]: [
        { text: '!', position: 'punctuation' },
        { text: 'Überraschenderweise,', position: 'prefix' },
        { text: 'Erstaunlicherweise,', position: 'prefix' },
        { text: 'mit Erstaunen', position: 'suffix' }
      ],
      [Emotion.QUESTIONING]: [
        { text: '?', position: 'punctuation' },
        { text: 'Ich frage mich,', position: 'prefix' },
        { text: 'Neugierig,', position: 'prefix' }
      ],
      [Emotion.EXCITED]: [
        { text: '!', position: 'punctuation' },
        { text: 'Aufgeregt,', position: 'prefix' },
        { text: 'Begeistert,', position: 'prefix' },
        { text: 'mit Begeisterung', position: 'suffix' }
      ],
      [Emotion.NEUTRAL]: [
        { text: '.', position: 'punctuation' }
      ]
    },
    
    // Chinese enhancers (simplified)
    zh: {
      [Emotion.HAPPY]: [
        { text: '!', position: 'punctuation' },
        { text: '高兴地,', position: 'prefix' },
        { text: '快乐地,', position: 'prefix' },
        { text: '充满喜悦', position: 'suffix' }
      ],
      [Emotion.SAD]: [
        { text: '不幸的是,', position: 'prefix' },
        { text: '悲伤地,', position: 'prefix' },
        { text: '带着遗憾', position: 'suffix' },
        { text: '...', position: 'punctuation' }
      ],
      [Emotion.ANGRY]: [
        { text: '!', position: 'punctuation' },
        { text: '生气地,', position: 'prefix' },
        { text: '愤怒地,', position: 'prefix' },
        { text: '充满挫折', position: 'suffix' }
      ],
      [Emotion.SURPRISED]: [
        { text: '!', position: 'punctuation' },
        { text: '令人惊讶的是,', position: 'prefix' },
        { text: '惊奇地,', position: 'prefix' },
        { text: '带着惊讶', position: 'suffix' }
      ],
      [Emotion.QUESTIONING]: [
        { text: '?', position: 'punctuation' },
        { text: '我想知道,', position: 'prefix' },
        { text: '好奇地,', position: 'prefix' }
      ],
      [Emotion.EXCITED]: [
        { text: '!', position: 'punctuation' },
        { text: '兴奋地,', position: 'prefix' },
        { text: '热情地,', position: 'prefix' },
        { text: '充满激动', position: 'suffix' }
      ],
      [Emotion.NEUTRAL]: [
        { text: '。', position: 'punctuation' }
      ]
    },
    
    // Japanese enhancers
    ja: {
      [Emotion.HAPPY]: [
        { text: '!', position: 'punctuation' },
        { text: '嬉しそうに、', position: 'prefix' },
        { text: '喜んで、', position: 'prefix' },
        { text: '楽しげに', position: 'suffix' }
      ],
      [Emotion.SAD]: [
        { text: '残念ながら、', position: 'prefix' },
        { text: '悲しげに、', position: 'prefix' },
        { text: '後悔しながら', position: 'suffix' },
        { text: '...', position: 'punctuation' }
      ],
      [Emotion.ANGRY]: [
        { text: '!', position: 'punctuation' },
        { text: '怒って、', position: 'prefix' },
        { text: '腹立たしげに、', position: 'prefix' },
        { text: '不満そうに', position: 'suffix' }
      ],
      [Emotion.SURPRISED]: [
        { text: '!', position: 'punctuation' },
        { text: '驚いたことに、', position: 'prefix' },
        { text: '驚きながら、', position: 'prefix' },
        { text: '驚愕して', position: 'suffix' }
      ],
      [Emotion.QUESTIONING]: [
        { text: '?', position: 'punctuation' },
        { text: '不思議に思いながら、', position: 'prefix' },
        { text: '好奇心をもって、', position: 'prefix' }
      ],
      [Emotion.EXCITED]: [
        { text: '!', position: 'punctuation' },
        { text: '興奮して、', position: 'prefix' },
        { text: '熱心に、', position: 'prefix' },
        { text: 'わくわくしながら', position: 'suffix' }
      ],
      [Emotion.NEUTRAL]: [
        { text: '。', position: 'punctuation' }
      ]
    }
  };
  
  // Return enhancers for requested language or fall back to English
  return languageEnhancers[lang] || languageEnhancers.en;
}