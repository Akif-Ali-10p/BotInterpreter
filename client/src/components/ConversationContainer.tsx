import { useState, useRef, useEffect } from 'react';
import { Volume2, Loader2, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Message, 
  SpeakerId,
  SpeechRecognitionState 
} from '@/types';
import { formatLanguageName, generatePhoneticGuide } from '@/lib/utils';
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

  // Handle playing translated text
  const handlePlayTranslation = (message: Message) => {
    setPlayingMessageId(message.id);
    
    // Prepare speech options
    const speechOptions: any = {
      lang: message.targetLanguage,
      rate: 1.0,
      onend: () => setPlayingMessageId(null)
    };
    
    // Speak the translated text
    speak(message.translatedText, speechOptions);
  };

  return (
    <div className="flex-1 overflow-hidden bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-neutral-300 dark:border-gray-700 h-full">
      <div 
        ref={containerRef}
        className="conversation-container h-full overflow-y-auto p-3 space-y-3"
      >
        {/* Empty state when no conversation */}
        {messages.length === 0 && !isListening && !isRecognizing && !isTranslating && (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-primary">
                <path d="m5 8 6 6" />
                <path d="m4 14 6-6 2-3" />
                <path d="M2 5h12" />
                <path d="M7 2h1" />
                <path d="m22 22-5-10-5 10" />
                <path d="M14 18h6" />
              </svg>
            </div>
            <h2 className="text-lg font-medium mb-1 dark:text-gray-100">Start a conversation</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md">
              Tap the microphone button and start speaking. Your speech will be automatically detected and translated.
            </p>
          </div>
        )}

        {/* Conversation messages */}
        {messages.length > 0 && (
          <div className="space-y-3">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={cn(
                  "flex items-start gap-2",
                  message.speakerId === 2 && "flex-row-reverse"
                )}
              >
                <div 
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                    message.speakerId === 1 ? "bg-primary/10" : "bg-secondary/10"
                  )}
                >
                  <User className={cn(
                    "h-3.5 w-3.5",
                    message.speakerId === 1 ? "text-primary" : "text-secondary"
                  )} />
                </div>
                <div className={cn("flex-1 space-y-1", message.speakerId === 2 && "text-right")}>
                  <div 
                    className={cn(
                      "rounded-2xl p-2.5 inline-block max-w-full",
                      message.speakerId === 1 
                        ? "bg-neutral-100 dark:bg-gray-700 rounded-tl-none text-left" 
                        : "bg-secondary/10 dark:bg-secondary/20 rounded-tr-none text-left"
                    )}
                  >
                    <div className="text-gray-800 dark:text-gray-200 text-sm">
                      {message.translatedText}
                      
                      {/* Phonetic pronunciation guide */}
                      {message.translatedText && message.targetLanguage && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="inline-flex items-center ml-1 align-text-bottom">
                                <HelpCircle className="h-3 w-3 text-primary/60 cursor-help" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <div className="space-y-1">
                                <p className="font-medium text-xs">Pronunciation Guide</p>
                                <p className="text-xs font-mono">
                                  {generatePhoneticGuide(message.translatedText, message.targetLanguage) || 
                                   "No pronunciation guide available for this language."}
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    
                    {/* Display phonetic spelling directly below for selected languages */}
                    {message.targetLanguage?.startsWith('zh') || 
                     message.targetLanguage?.startsWith('ja') || 
                     message.targetLanguage?.startsWith('ko') || 
                     message.targetLanguage?.startsWith('ar') || 
                     message.targetLanguage?.startsWith('ru') ? (
                      <div className="mt-1 text-xs text-primary/70 font-mono">
                        {generatePhoneticGuide(message.translatedText, message.targetLanguage) || 
                         "[Pronunciation guide]"}
                      </div>
                    ) : null}
                  </div>
                  <div 
                    className={cn(
                      "text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5",
                      message.speakerId === 2 && "justify-end"
                    )}
                  >
                    <span className="truncate">From: {formatLanguageName(message.originalLanguage)}</span>
                    <span>•</span>
                    <span className="truncate">To: {formatLanguageName(message.targetLanguage)}</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-5 w-5 rounded-full" 
                            onClick={() => handlePlayTranslation(message)}
                            disabled={playingMessageId === message.id}
                          >
                            {playingMessageId === message.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Volume2 className="h-3 w-3" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p className="text-xs">Play pronunciation</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Listening state indicator */}
        {isListening && (
          <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary pulse flex items-center justify-center">
                <MicrophoneIcon className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="font-medium text-sm dark:text-gray-200">{activePersonName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Listening to {formatLanguageName(activePersonLanguage)}...
                </p>
              </div>
            </div>
            <Button 
              variant="destructive" 
              size="icon" 
              className="rounded-full h-7 w-7"
              onClick={onStopListening}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Speech recognition in progress */}
        {isRecognizing && (
          <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-3 w-3 text-primary" />
              </div>
              <p className="font-medium text-xs text-gray-500 dark:text-gray-400">Recognizing speech...</p>
            </div>
            <div className="bg-white dark:bg-gray-700 rounded-xl p-2.5">
              <p className="text-gray-800 dark:text-gray-200 text-sm">
                {recognitionState.transcript + recognitionState.interimTranscript}
              </p>
            </div>
          </div>
        )}

        {/* Translation in progress */}
        {isTranslating && (
          <div className="bg-secondary/5 dark:bg-secondary/10 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-secondary">
                  <path d="m5 8 6 6" />
                  <path d="m4 14 6-6 2-3" />
                  <path d="M2 5h12" />
                  <path d="M7 2h1" />
                  <path d="m22 22-5-10-5 10" />
                  <path d="M14 18h6" />
                </svg>
              </div>
              <p className="font-medium text-xs text-gray-500 dark:text-gray-400">
                Translating to {formatLanguageName(activeSpeakerId === 1 ? messages[0]?.targetLanguage : messages[0]?.originalLanguage)}...
              </p>
            </div>
            <div className="flex justify-center p-1.5">
              <div className="flex space-x-1 items-center">
                <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
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
