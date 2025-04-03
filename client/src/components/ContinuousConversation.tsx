import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Mic, MicOff, Loader2, Languages, ArrowDownUp, Settings, Trash2, HelpCircle, Volume2, History } from "lucide-react";
import { Message, SpeakerId, Speaker } from '@/types';
import { cn, generatePhoneticGuide } from '@/lib/utils';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { useWebSocket } from '@/hooks/useWebSocket';
import { getDefaultVoice } from '@/lib/utils';
import { getLibreTranslateCode } from '@/lib/languageUtils';

interface ContinuousConversationProps {
  sessionId: string;
  speaker1: Speaker;
  speaker2: Speaker;
  activeSpeakerId: SpeakerId;
  onSpeakerToggle: () => void;
  onClearConversation: () => void;
  onOpenReplay?: () => void;
  messages: Message[];
  onNewMessage: (message: Message) => void;
  autoPlay?: boolean;
}

export default function ContinuousConversation({
  sessionId,
  speaker1,
  speaker2,
  activeSpeakerId,
  onSpeakerToggle,
  onClearConversation,
  onOpenReplay,
  messages,
  onNewMessage,
  autoPlay = true
}: ContinuousConversationProps) {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [activeSpeaker, setActiveSpeaker] = useState(activeSpeakerId === 1 ? speaker1 : speaker2);
  const [passiveSpeaker, setPassiveSpeaker] = useState(activeSpeakerId === 1 ? speaker2 : speaker1);
  const [continuousMode, setContinuousMode] = useState(true);
  
  // Initialize hooks
  const speechRecognition = useSpeechRecognition();
  const speechSynthesis = useSpeechSynthesis();
  
  // WebSocket for real-time communication
  const { isConnected, sendSpeech, sendContinuousSpeech } = useWebSocket({
    sessionId,
    onTranslation: (message) => {
      // Handle incoming translation message
      onNewMessage(message);
      
      // Auto-play translated text if enabled
      if (autoPlay) {
        playTranslation(message);
      }
    },
    onInterim: (speakerId, text) => {
      // Only update interim text if it's from the other speaker
      if (speakerId !== activeSpeakerId) {
        setInterimText(text);
      }
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
    }
  });

  // Update active and passive speakers when activeSpeakerId changes
  useEffect(() => {
    setActiveSpeaker(activeSpeakerId === 1 ? speaker1 : speaker2);
    setPassiveSpeaker(activeSpeakerId === 1 ? speaker2 : speaker1);
  }, [activeSpeakerId, speaker1, speaker2]);

  // Play translation audio with emotion
  const playTranslation = useCallback((message: Message) => {
    if (!message) return;
    
    const text = message.translatedText;
    const languageCode = message.targetLanguage;
    
    // Find an appropriate voice for the target language
    const voice = getDefaultVoice(languageCode);
    
    // Prepare speech options
    const speechOptions: any = {
      lang: languageCode,
      voice: voice || undefined,
      rate: 1.0
    };
    
    // Add emotion data if available
    if (message.emotion) {
      speechOptions.emotion = message.emotion;
      speechOptions.emotionConfidence = typeof message.emotionConfidence === 'string' 
        ? parseFloat(message.emotionConfidence) 
        : message.emotionConfidence;
      
      console.log(`Playing translation with emotion: ${message.emotion} (confidence: ${speechOptions.emotionConfidence})`);
    }
    
    // Speak the translated text with emotion
    speechSynthesis.speak(text, speechOptions);
  }, [speechSynthesis]);

  // Start continuous recognition
  const startContinuousRecognition = useCallback(() => {
    if (!isConnected) {
      console.warn('WebSocket not connected. Cannot start continuous recognition.');
      return;
    }
    
    setIsListening(true);
    
    // Start speech recognition with callbacks for interim and final results
    speechRecognition.startListening(
      activeSpeaker.languageCode,
      true,
      // Interim result callback
      (text) => {
        setInterimText(text);
        
        // Send interim text via WebSocket
        sendContinuousSpeech(text, activeSpeakerId, passiveSpeaker.languageCode);
      },
      // Final result callback
      (text) => {
        if (text.trim()) {
          // Send final speech for translation via WebSocket
          sendSpeech(
            text, 
            activeSpeakerId, 
            getLibreTranslateCode(activeSpeaker.languageCode),
            getLibreTranslateCode(passiveSpeaker.languageCode)
          );
          
          // Clear interim text
          setInterimText('');
        }
      }
    );
  }, [
    activeSpeaker, 
    passiveSpeaker, 
    activeSpeakerId, 
    speechRecognition, 
    isConnected, 
    sendSpeech, 
    sendContinuousSpeech
  ]);

  // Stop continuous recognition
  const stopContinuousRecognition = useCallback(() => {
    speechRecognition.stopListening();
    setIsListening(false);
    setInterimText('');
  }, [speechRecognition]);

  // Toggle continuous mode
  const toggleContinuousMode = useCallback(() => {
    if (isListening) {
      stopContinuousRecognition();
    }
    setContinuousMode(!continuousMode);
  }, [continuousMode, isListening, stopContinuousRecognition]);

  // Toggle the listening state
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopContinuousRecognition();
    } else {
      startContinuousRecognition();
    }
  }, [isListening, startContinuousRecognition, stopContinuousRecognition]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (isListening) {
        speechRecognition.stopListening();
      }
      // Cancel any ongoing speech synthesis
      speechSynthesis.cancel();
    };
  }, [isListening, speechRecognition, speechSynthesis]);

  return (
    <div className="flex flex-col h-full">
      {/* Control panel */}
      <div className="flex justify-between items-center p-3 bg-muted/20 rounded-t-lg mb-2">
        <div className="flex items-center space-x-2">
          <Button 
            variant={isListening ? "destructive" : "default"} 
            size="sm"
            onClick={toggleListening}
            disabled={!isConnected}
            className="flex items-center gap-1"
          >
            {isListening ? (
              <>
                <MicOff className="h-4 w-4" />
                Stop
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" />
                Start
              </>
            )}
          </Button>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={onSpeakerToggle}
                >
                  <ArrowDownUp className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Switch active speaker</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={onClearConversation}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Clear conversation</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {onOpenReplay && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={onOpenReplay}
                  >
                    <History className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Replay conversation history</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="continuous-mode"
              checked={continuousMode}
              onCheckedChange={toggleContinuousMode}
            />
            <Label htmlFor="continuous-mode">Continuous</Label>
          </div>
          
          <Badge 
            variant={isConnected ? "default" : "destructive"}
            className="flex items-center gap-1"
          >
            {isConnected ? (
              <>Connected</>
            ) : (
              <>Disconnected</>
            )}
          </Badge>
        </div>
      </div>

      {/* Active speaker indicator */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Mic className="h-3 w-3" />
            Speaking: {activeSpeaker.name}
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Languages className="h-3 w-3" />
            {activeSpeaker.languageCode}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Languages className="h-3 w-3" />
            Translating to: {passiveSpeaker.languageCode}
          </Badge>
        </div>
      </div>

      {/* Conversation messages */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-muted/10 rounded-lg">
        {messages.map((message) => (
          <div 
            key={message.id}
            className={cn(
              "flex flex-col max-w-[80%] rounded-lg p-3",
              message.speakerId === activeSpeakerId 
                ? "ml-auto bg-primary text-primary-foreground" 
                : "mr-auto bg-muted"
            )}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium">
                {message.speakerId === speaker1.id ? speaker1.name : speaker2.name}
              </span>
              <span className="text-xs opacity-70">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p>{message.originalText}</p>
            <div className="mt-2 pt-2 border-t border-muted-foreground/20">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium">Translated</span>
                <div className="flex items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                          }}
                        >
                          <HelpCircle className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
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
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 flex items-center gap-1 px-2 text-xs"
                    onClick={() => playTranslation(message)}
                  >
                    <Volume2 className="h-3 w-3" />
                    Play
                  </Button>
                </div>
              </div>
              <p>{message.translatedText}</p>
              
              {/* Display phonetic guide for languages with different writing systems */}
              {(message.targetLanguage?.startsWith('zh') || 
                message.targetLanguage?.startsWith('ja') || 
                message.targetLanguage?.startsWith('ko') || 
                message.targetLanguage?.startsWith('ar') || 
                message.targetLanguage?.startsWith('ru')) && (
                <p className="mt-1 text-xs opacity-75 font-mono">
                  {generatePhoneticGuide(message.translatedText, message.targetLanguage) || 
                  "[Pronunciation guide]"}
                </p>
              )}
            </div>
          </div>
        ))}
        
        {/* Interim text bubble */}
        {interimText && (
          <div 
            className={cn(
              "flex flex-col max-w-[80%] rounded-lg p-3 animate-pulse",
              activeSpeakerId === 1 ? "ml-auto bg-primary/80 text-primary-foreground" : "mr-auto bg-muted/80"
            )}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium">
                {activeSpeakerId === speaker1.id ? speaker1.name : speaker2.name}
              </span>
              <Loader2 className="h-3 w-3 animate-spin" />
            </div>
            <p>{interimText}</p>
          </div>
        )}
      </div>
    </div>
  );
}