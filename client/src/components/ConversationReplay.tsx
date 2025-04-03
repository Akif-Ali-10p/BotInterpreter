import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Rewind,
  FastForward,
} from 'lucide-react';
import { Message, SpeakerId, Speaker } from '@/types';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { formatMessageTime, generatePhoneticGuide } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { sleep } from '@/lib/utils';

interface ConversationReplayProps {
  messages: Message[];
  speaker1: Speaker;
  speaker2: Speaker;
  isOpen: boolean;
  onClose: () => void;
}

export default function ConversationReplay({
  messages,
  speaker1,
  speaker2,
  isOpen,
  onClose
}: ConversationReplayProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x is normal speed
  const [isMuted, setIsMuted] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const highlightedMessageRef = useRef<HTMLDivElement>(null);
  const { speak, cancel, state: speechState } = useSpeechSynthesis();
  
  const sortedMessages = [...messages].sort((a, b) => {
    // Sort by timestamp to ensure chronological order
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });
  
  const currentMessage = sortedMessages[currentMessageIndex];
  const isLastMessage = currentMessageIndex >= sortedMessages.length - 1;
  const progress = sortedMessages.length > 0 ? (currentMessageIndex + 1) / sortedMessages.length : 0;
  
  // Reset state when messages change
  useEffect(() => {
    setCurrentMessageIndex(0);
    setIsPlaying(false);
    setHighlightedMessageId(null);
  }, [messages]);
  
  // Stop playback when component unmounts or closes
  useEffect(() => {
    return () => {
      cancel();
      setIsPlaying(false);
    };
  }, [cancel]);
  
  // Handle visibility changes
  useEffect(() => {
    if (!isOpen) {
      cancel();
      setIsPlaying(false);
    }
  }, [isOpen, cancel]);
  
  // Scroll to highlighted message
  useEffect(() => {
    if (highlightedMessageId && highlightedMessageRef.current && messagesContainerRef.current) {
      highlightedMessageRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  }, [highlightedMessageId]);
  
  // Play the current message
  const playCurrentMessage = useCallback(async () => {
    if (!currentMessage || !isPlaying) return;
    
    // Highlight the current message
    setHighlightedMessageId(currentMessage.id);
    
    if (!isMuted) {
      // Create speech options
      const speechOptions: any = {
        lang: currentMessage.targetLanguage,
        rate: playbackSpeed,
        onend: async () => {
          // Wait a short pause between messages
          await sleep(500 / playbackSpeed);
          
          // Auto-advance to next message if enabled and not the last message
          if (autoAdvance && currentMessageIndex < sortedMessages.length - 1) {
            setCurrentMessageIndex(prev => prev + 1);
          } else {
            // If it's the last message or auto-advance is off, stop playing
            if (currentMessageIndex >= sortedMessages.length - 1) {
              setIsPlaying(false);
            }
          }
        }
      };
      
      // No emotion data
      
      // Play the translated text
      speak(currentMessage.translatedText, speechOptions);
    } else {
      // If muted, just advance after a delay proportional to message length
      const delay = Math.max(1000, currentMessage.translatedText.length * 80) / playbackSpeed;
      await sleep(delay);
      
      if (autoAdvance && currentMessageIndex < sortedMessages.length - 1) {
        setCurrentMessageIndex(prev => prev + 1);
      } else {
        if (currentMessageIndex >= sortedMessages.length - 1) {
          setIsPlaying(false);
        }
      }
    }
  }, [
    currentMessage, 
    isPlaying, 
    isMuted, 
    playbackSpeed, 
    autoAdvance, 
    currentMessageIndex, 
    sortedMessages.length,
    speak
  ]);
  
  // Effect to handle playback
  useEffect(() => {
    if (isPlaying) {
      playCurrentMessage();
    }
  }, [isPlaying, currentMessageIndex, playCurrentMessage]);
  
  // Playback controls
  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      cancel();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, cancel]);
  
  const skipToPrevious = useCallback(() => {
    cancel();
    setCurrentMessageIndex(prev => Math.max(0, prev - 1));
    if (isPlaying) {
      // Short delay before playing the previous message
      setTimeout(() => playCurrentMessage(), 100);
    }
  }, [cancel, isPlaying, playCurrentMessage]);
  
  const skipToNext = useCallback(() => {
    cancel();
    setCurrentMessageIndex(prev => Math.min(sortedMessages.length - 1, prev + 1));
    if (isPlaying) {
      // Short delay before playing the next message
      setTimeout(() => playCurrentMessage(), 100);
    }
  }, [cancel, isPlaying, sortedMessages.length, playCurrentMessage]);
  
  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted);
    if (isPlaying && !isMuted) {
      // If turning on mute while playing, cancel current speech
      cancel();
      // Short delay before continuing in muted mode
      setTimeout(() => playCurrentMessage(), 100);
    }
  }, [isMuted, isPlaying, cancel, playCurrentMessage]);
  
  const changePlaybackSpeed = useCallback((newSpeed: number) => {
    setPlaybackSpeed(newSpeed);
    if (isPlaying) {
      // Restart current message with new speed
      cancel();
      // Short delay before continuing with new speed
      setTimeout(() => playCurrentMessage(), 100);
    }
  }, [isPlaying, cancel, playCurrentMessage]);
  
  const seekToPosition = useCallback((position: number) => {
    const newIndex = Math.min(Math.floor(position * sortedMessages.length), sortedMessages.length - 1);
    cancel();
    setCurrentMessageIndex(newIndex);
    if (isPlaying) {
      // Short delay before playing from new position
      setTimeout(() => playCurrentMessage(), 100);
    }
  }, [sortedMessages.length, cancel, isPlaying, playCurrentMessage]);
  
  // Don't render if not open or no messages
  if (!isOpen || sortedMessages.length === 0) return null;
  
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-4xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">Conversation Replay</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
        
        {/* Conversation display */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {sortedMessages.map((message) => {
            const isHighlighted = message.id === highlightedMessageId;
            return (
              <div 
                key={message.id}
                ref={isHighlighted ? highlightedMessageRef : null}
                className={cn(
                  "flex items-start space-x-3 p-3 rounded-lg transition-all",
                  message.speakerId === 2 && "flex-row-reverse space-x-reverse",
                  isHighlighted && "bg-primary/10 dark:bg-primary/20"
                )}
              >
                <div 
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    message.speakerId === 1 ? "bg-primary/10" : "bg-secondary/10"
                  )}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={cn(
                      "h-4 w-4",
                      message.speakerId === 1 ? "text-primary" : "text-secondary"
                    )}
                  >
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                
                <div className={cn("flex-1", message.speakerId === 2 && "text-right")}>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium">
                      {message.speakerId === 1 ? speaker1.name : speaker2.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatMessageTime(new Date(message.timestamp))}
                    </span>
                  </div>
                  
                  <div 
                    className={cn(
                      "rounded-2xl p-3 inline-block max-w-full mb-1",
                      message.speakerId === 1 
                        ? "bg-neutral-100 dark:bg-gray-700 rounded-tl-none text-left" 
                        : "bg-secondary/10 dark:bg-secondary/20 rounded-tr-none text-left"
                    )}
                  >
                    <p className="text-gray-800 dark:text-gray-200">{message.originalText}</p>
                  </div>
                  
                  <div
                    className={cn(
                      "rounded-2xl p-3 inline-block max-w-full",
                      message.speakerId === 1 
                        ? "bg-primary/10 dark:bg-primary/20 rounded-bl-none text-left" 
                        : "bg-neutral-100 dark:bg-gray-700 rounded-br-none text-left"
                    )}
                  >
                    <p className="text-gray-800 dark:text-gray-200">{message.translatedText}</p>
                    
                    {/* Phonetic spelling for selected languages */}
                    {(message.targetLanguage?.startsWith('zh') || 
                      message.targetLanguage?.startsWith('ja') || 
                      message.targetLanguage?.startsWith('ko') || 
                      message.targetLanguage?.startsWith('ar') || 
                      message.targetLanguage?.startsWith('ru')) && (
                      <p className="mt-1 text-xs text-primary/70 font-mono">
                        {generatePhoneticGuide(message.translatedText, message.targetLanguage) || 
                        "[Pronunciation guide]"}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Playback controls */}
        <div className="p-4 border-t">
          {/* Progress bar */}
          <div className="mb-4">
            <Slider
              value={[progress * 100]}
              min={0}
              max={100}
              step={1}
              onValueChange={(values) => seekToPosition(values[0] / 100)}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1/{sortedMessages.length}</span>
              <span>{currentMessageIndex + 1}/{sortedMessages.length}</span>
            </div>
          </div>
          
          {/* Control buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <Button 
                variant="outline" 
                size="icon"
                className="w-8 h-8"
                onClick={() => changePlaybackSpeed(playbackSpeed === 0.5 ? 1 : 0.5)}
                title={playbackSpeed === 0.5 ? "Switch to normal speed" : "Switch to slow speed"}
              >
                <Rewind className="h-4 w-4" />
              </Button>
              <div className="text-sm font-mono mx-1">{playbackSpeed}x</div>
              <Button 
                variant="outline" 
                size="icon" 
                className="w-8 h-8"
                onClick={() => changePlaybackSpeed(playbackSpeed === 2 ? 1 : 2)}
                title={playbackSpeed === 2 ? "Switch to normal speed" : "Switch to fast speed"}
              >
                <FastForward className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="w-9 h-9"
                onClick={skipToPrevious}
                disabled={currentMessageIndex === 0}
                title="Previous message"
              >
                <SkipBack className="h-5 w-5" />
              </Button>
              
              <Button 
                variant="default" 
                size="icon" 
                className="w-10 h-10 rounded-full"
                onClick={togglePlayPause}
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
              </Button>
              
              <Button 
                variant="outline" 
                size="icon" 
                className="w-9 h-9"
                onClick={skipToNext}
                disabled={isLastMessage}
                title="Next message"
              >
                <SkipForward className="h-5 w-5" />
              </Button>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-8 h-8"
              onClick={toggleMute}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}