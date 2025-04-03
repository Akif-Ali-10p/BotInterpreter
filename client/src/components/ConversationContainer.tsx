import { useState, useRef, useEffect } from 'react';
import { Volume2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Message, 
  SpeakerId,
  SpeechRecognitionState 
} from '@/types';
import { formatLanguageName } from '@/lib/utils';
import { cn } from '@/lib/utils';
import useSpeechSynthesis from '@/hooks/useSpeechSynthesis';

interface ConversationContainerProps {
  messages: Message[];
  activeSpeakerId: SpeakerId;
  isListening: boolean;
  isRecognizing: boolean;
  isTranslating: boolean;
  recognitionState: SpeechRecognitionState;
  activePersonLanguage: string;
  activePersonName: string;
  onStopListening: () => void;
}

export default function ConversationContainer({
  messages,
  activeSpeakerId,
  isListening,
  isRecognizing,
  isTranslating,
  recognitionState,
  activePersonLanguage,
  activePersonName,
  onStopListening
}: ConversationContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { speak, state: speechState } = useSpeechSynthesis();
  const [playingMessageId, setPlayingMessageId] = useState<number | null>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, isListening, isRecognizing, isTranslating, recognitionState.transcript]);

  // Handle playing translated text with emotion
  const handlePlayTranslation = (message: Message) => {
    setPlayingMessageId(message.id);
    
    // Prepare speech options
    const speechOptions: any = {
      lang: message.targetLanguage,
      rate: 1.0,
      onend: () => setPlayingMessageId(null)
    };
    
    // Add emotion data if available
    if (message.emotion) {
      speechOptions.emotion = message.emotion;
      speechOptions.emotionConfidence = typeof message.emotionConfidence === 'string' 
        ? parseFloat(message.emotionConfidence) 
        : message.emotionConfidence;
      
      console.log(`Playing translation with emotion: ${message.emotion} (confidence: ${speechOptions.emotionConfidence})`);
    }
    
    // Speak the translated text with emotional context
    speak(message.translatedText, speechOptions);
  };

  return (
    <div className="flex-1 overflow-hidden bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-neutral-300 dark:border-gray-700">
      <div 
        ref={containerRef}
        className="conversation-container h-full overflow-y-auto p-4 space-y-4"
      >
        {/* Empty state when no conversation */}
        {messages.length === 0 && !isListening && !isRecognizing && !isTranslating && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-primary">
                <path d="m5 8 6 6" />
                <path d="m4 14 6-6 2-3" />
                <path d="M2 5h12" />
                <path d="M7 2h1" />
                <path d="m22 22-5-10-5 10" />
                <path d="M14 18h6" />
              </svg>
            </div>
            <h2 className="text-xl font-medium mb-2 dark:text-gray-100">Start a conversation</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
              Tap the microphone button and start speaking. Babel will automatically detect and translate your speech.
            </p>
          </div>
        )}

        {/* Conversation messages */}
        {messages.length > 0 && (
          <div className="space-y-4">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={cn(
                  "flex items-start space-x-3",
                  message.speakerId === 2 && "flex-row-reverse"
                )}
              >
                <div 
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    message.speakerId === 1 ? "bg-primary/10" : "bg-secondary/10"
                  )}
                >
                  <User className={cn(
                    "h-4 w-4",
                    message.speakerId === 1 ? "text-primary" : "text-secondary"
                  )} />
                </div>
                <div className={cn("flex-1", message.speakerId === 2 && "text-right")}>
                  <div 
                    className={cn(
                      "rounded-2xl p-3 inline-block max-w-full",
                      message.speakerId === 1 
                        ? "bg-neutral-100 dark:bg-gray-700 rounded-tl-none text-left" 
                        : "bg-secondary/10 dark:bg-secondary/20 rounded-tr-none text-left"
                    )}
                  >
                    <p className="text-gray-800 dark:text-gray-200">{message.translatedText}</p>
                  </div>
                  <div 
                    className={cn(
                      "mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-2",
                      message.speakerId === 2 && "justify-end"
                    )}
                  >
                    <span>Detected: {formatLanguageName(message.originalLanguage)}</span>
                    <span>•</span>
                    <span>Translated to: {formatLanguageName(message.targetLanguage)}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 rounded-full" 
                      onClick={() => handlePlayTranslation(message)}
                      disabled={playingMessageId === message.id}
                    >
                      {playingMessageId === message.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Volume2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Listening state indicator */}
        {isListening && (
          <div className="bg-primary/5 dark:bg-primary/10 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-primary pulse flex items-center justify-center">
                <MicrophoneIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium dark:text-gray-200">{activePersonName}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Listening to {formatLanguageName(activePersonLanguage)}...
                </p>
              </div>
            </div>
            <Button 
              variant="destructive" 
              size="icon" 
              className="rounded-full"
              onClick={onStopListening}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Speech recognition in progress */}
        {isRecognizing && (
          <div className="bg-primary/5 dark:bg-primary/10 rounded-2xl p-4">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <p className="font-medium text-sm text-gray-500 dark:text-gray-400">Recognizing speech...</p>
            </div>
            <div className="bg-white dark:bg-gray-700 rounded-xl p-3">
              <p className="text-gray-800 dark:text-gray-200">
                {recognitionState.transcript + recognitionState.interimTranscript}
              </p>
            </div>
          </div>
        )}

        {/* Translation in progress */}
        {isTranslating && (
          <div className="bg-secondary/5 dark:bg-secondary/10 rounded-2xl p-4">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-secondary">
                  <path d="m5 8 6 6" />
                  <path d="m4 14 6-6 2-3" />
                  <path d="M2 5h12" />
                  <path d="M7 2h1" />
                  <path d="m22 22-5-10-5 10" />
                  <path d="M14 18h6" />
                </svg>
              </div>
              <p className="font-medium text-sm text-gray-500 dark:text-gray-400">
                Translating to {formatLanguageName(activeSpeakerId === 1 ? messages[0]?.targetLanguage : messages[0]?.originalLanguage)}...
              </p>
            </div>
            <div className="flex justify-center p-2">
              <div className="flex space-x-1 items-center">
                <div className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Icons
function User(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function MicrophoneIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function X(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
