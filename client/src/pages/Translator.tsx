import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import LanguageSelector from '@/components/LanguageSelector';
import ConversationContainer from '@/components/ConversationContainer';
import ContinuousConversation from '@/components/ContinuousConversation';
import ConversationReplay from '@/components/ConversationReplay';
import ControlsPanel from '@/components/ControlsPanel';
import useSpeechRecognition from '@/hooks/useSpeechRecognition';
import useSpeechSynthesis from '@/hooks/useSpeechSynthesis';
import useTranslation from '@/hooks/useTranslation';
import { Message, SpeakerId, Speaker, Settings } from '@/types';
import { SUPPORTED_LANGUAGES, getBrowserLanguage } from '@/lib/languageUtils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeftRight, History } from 'lucide-react';
import { formatLanguageName, sleep } from '@/lib/utils';

export default function Translator() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get sessionId from localStorage
  const sessionId = localStorage.getItem('sessionId') || 'default-session';

  // State for active speaker
  const [activeSpeakerId, setActiveSpeakerId] = useState<SpeakerId>(1);
  
  // State for dark mode
  const [darkMode, setDarkMode] = useState(false);
  
  // State for settings
  const [settings, setSettings] = useState<Partial<Settings>>({
    userId: sessionId,
    autoDetect: true,
    speechRate: '1.0',
    voiceSelection: 'default',
    darkMode: false,
    saveHistory: true,
    person1Language: getBrowserLanguage(),
    person2Language: 'es-ES'
  });
  
  // Setup speakers based on settings
  const [speakers, setSpeakers] = useState<Speaker[]>([
    { id: 1, languageCode: settings.person1Language || 'en-US', name: 'Person 1' },
    { id: 2, languageCode: settings.person2Language || 'es-ES', name: 'Person 2' }
  ]);
  
  // State for UI flags
  const [isTranslating, setIsTranslating] = useState(false);
  const [isReplayOpen, setIsReplayOpen] = useState(false);
  
  // Get custom hooks
  const speechRecognition = useSpeechRecognition();
  const speechSynthesis = useSpeechSynthesis();
  const translation = useTranslation();
  
  // Fetch messages from the server
  const { data: messages = [] } = useQuery({
    queryKey: [`/api/messages/${sessionId}`],
    queryFn: async () => {
      const res = await fetch(`/api/messages/${sessionId}`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      return res.json();
    }
  });
  
  // Fetch settings from the server
  const { data: serverSettings } = useQuery({
    queryKey: [`/api/settings/${sessionId}`],
    queryFn: async () => {
      const res = await fetch(`/api/settings/${sessionId}`);
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    }
  });
  
  // Update local settings when serverSettings change
  useEffect(() => {
    if (serverSettings) {
      // Update local settings with server settings
      setSettings(serverSettings);
      setDarkMode(serverSettings.darkMode || false);
      
      // Update speakers with language settings
      setSpeakers([
        { id: 1, languageCode: serverSettings.person1Language || 'en-US', name: 'Person 1' },
        { id: 2, languageCode: serverSettings.person2Language || 'es-ES', name: 'Person 2' }
      ]);
    }
  }, [serverSettings]);
  
  // Create mutation for saving messages
  const createMessageMutation = useMutation({
    mutationFn: async (newMessage: Omit<Message, 'id' | 'timestamp'>) => {
      const res = await apiRequest('POST', '/api/messages', newMessage);
      return res.json();
    },
    onSuccess: () => {
      // Invalidate and refetch messages
      queryClient.invalidateQueries({ queryKey: [`/api/messages/${sessionId}`] });
    }
  });
  
  // Create mutation for saving settings
  const saveSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<Settings>) => {
      const res = await apiRequest('POST', '/api/settings', newSettings);
      return res.json();
    },
    onSuccess: () => {
      // Invalidate and refetch settings
      queryClient.invalidateQueries({ queryKey: [`/api/settings/${sessionId}`] });
    }
  });
  
  // Create mutation for clearing messages
  const clearMessagesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('DELETE', `/api/messages/${sessionId}`);
      return res.json();
    },
    onSuccess: () => {
      // Invalidate and refetch messages
      queryClient.invalidateQueries({ queryKey: [`/api/messages/${sessionId}`] });
      toast({
        title: "Conversation cleared",
        description: "All messages have been deleted."
      });
    }
  });

  // Apply dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  
  // Get active and target speakers
  const activeSpeaker = speakers.find(s => s.id === activeSpeakerId) || speakers[0];
  const targetSpeaker = speakers.find(s => s.id !== activeSpeakerId) || speakers[1];
  
  // Handle starting listening
  const handleStartListening = useCallback(() => {
    speechRecognition.resetTranscript();
    speechRecognition.startListening(activeSpeaker.languageCode);
  }, [speechRecognition, activeSpeaker]);
  
  // Handle stopping listening
  const handleStopListening = useCallback(() => {
    speechRecognition.stopListening();
  }, [speechRecognition]);
  
  // Handle toggling speaker
  const handleSpeakerToggle = useCallback(() => {
    setActiveSpeakerId(prev => prev === 1 ? 2 : 1);
  }, []);
  
  // Handle changing language
  const handleLanguageChange = useCallback((personIndex: 1 | 2, languageCode: string) => {
    setSpeakers(prev => prev.map(speaker => 
      speaker.id === personIndex ? { ...speaker, languageCode } : speaker
    ));
    
    // Save to settings
    saveSettingsMutation.mutate({
      userId: sessionId,
      ...(personIndex === 1 ? { person1Language: languageCode } : { person2Language: languageCode })
    });
  }, [sessionId, saveSettingsMutation]);
  
  // Handle settings change
  const handleSettingsChange = useCallback((newSettings: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    saveSettingsMutation.mutate({
      userId: sessionId,
      ...newSettings
    });
  }, [sessionId, saveSettingsMutation]);
  
  // Handle clear conversation
  const handleClearConversation = useCallback(() => {
    clearMessagesMutation.mutate();
  }, [clearMessagesMutation]);
  
  // Process speech recognition results
  useEffect(() => {
    const { transcript, isListening } = speechRecognition.state;
    
    // If we have a transcript and we're not listening anymore, process it
    if (transcript && !isListening && !isTranslating) {
      const processTranscript = async () => {
        try {
          setIsTranslating(true);
          
          // First detect language if auto-detect is enabled
          let detectedLanguage = activeSpeaker.languageCode;
          if (settings.autoDetect) {
            try {
              const detection = await translation.detectLanguage(transcript);
              detectedLanguage = detection.language + '-' + detectedLanguage.split('-')[1];
            } catch (error) {
              console.error('Language detection error:', error);
              // Continue with default language on detection error
            }
          }
          
          // Then translate
          const translationResponse = await translation.translateText(
            transcript,
            detectedLanguage,
            targetSpeaker.languageCode
          );
          
          // Create message
          const newMessage = {
            sessionId,
            speakerId: activeSpeakerId,
            originalText: transcript,
            translatedText: translationResponse.translatedText,
            originalLanguage: detectedLanguage,
            targetLanguage: targetSpeaker.languageCode
          };
          
          // Save message
          const savedMessage = await createMessageMutation.mutateAsync(newMessage);
          
          // Prepare speech options
          const speechOptions: any = {
            lang: targetSpeaker.languageCode,
            rate: parseFloat(settings.speechRate || '1.0')
          };
          
          // Speak the translation
          speechSynthesis.speak(translationResponse.translatedText, speechOptions);
          
          // Reset transcript
          speechRecognition.resetTranscript();
        } catch (error) {
          console.error('Translation error:', error);
          toast({
            title: "Translation failed",
            description: error instanceof Error ? error.message : "Failed to translate text",
            variant: "destructive"
          });
        } finally {
          setIsTranslating(false);
        }
      };
      
      processTranscript();
    }
  }, [
    speechRecognition.state, 
    isTranslating, 
    activeSpeaker, 
    targetSpeaker, 
    sessionId, 
    activeSpeakerId, 
    translation, 
    createMessageMutation, 
    speechSynthesis, 
    settings.autoDetect,
    settings.speechRate,
    speechRecognition,
    toast
  ]);
  
  // Switch languages handler
  const handleSwitchLanguages = () => {
    const person1Lang = speakers[0].languageCode;
    const person2Lang = speakers[1].languageCode;
    
    // Swap languages
    setSpeakers([
      { id: 1, languageCode: person2Lang, name: 'Person 1' },
      { id: 2, languageCode: person1Lang, name: 'Person 2' }
    ]);
    
    // Save to settings
    saveSettingsMutation.mutate({
      userId: sessionId,
      person1Language: person2Lang,
      person2Language: person1Lang
    });
    
    toast({
      title: "Languages switched",
      description: `${formatLanguageName(person2Lang)} ↔ ${formatLanguageName(person1Lang)}`
    });
  };

  // Handle new message from continuous conversation
  const handleNewMessage = useCallback((message: Message) => {
    createMessageMutation.mutate(message);
  }, [createMessageMutation]);
  
  // Handle opening and closing the replay modal
  const handleOpenReplay = useCallback(() => {
    if (messages.length > 0) {
      setIsReplayOpen(true);
      toast({
        title: "Conversation Replay",
        description: "Replay the entire conversation with audio playback"
      });
    } else {
      toast({
        title: "No conversation to replay",
        description: "Start a conversation first before using replay",
        variant: "destructive"
      });
    }
  }, [messages.length, toast]);
  
  const handleCloseReplay = useCallback(() => {
    setIsReplayOpen(false);
  }, []);

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Conversation Replay Modal */}
      <ConversationReplay
        messages={messages}
        speaker1={speakers[0]}
        speaker2={speakers[1]}
        isOpen={isReplayOpen}
        onClose={handleCloseReplay}
      />
      
      {/* Header - reduced padding */}
      <Header 
        darkMode={darkMode}
        onDarkModeChange={setDarkMode}
        settings={settings}
        onSettingsChange={handleSettingsChange}
      />
      
      {/* Main content with reduced padding */}
      <main className="flex-1 overflow-hidden">
        <div className="container mx-auto px-2 py-2 h-full flex flex-col">
          {/* Language Selection with reduced margin */}
          <div className="flex justify-between items-center mb-2 px-1 flex-wrap gap-2">
            <LanguageSelector
              personIndex={1}
              selectedLanguage={speakers[0].languageCode}
              onLanguageChange={(lang) => handleLanguageChange(1, lang)}
            />
            
            {/* Switch button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSwitchLanguages}
              className="rounded-full"
              aria-label="Switch languages"
            >
              <ArrowLeftRight className="h-5 w-5 text-gray-500" />
            </Button>
            
            <LanguageSelector
              personIndex={2}
              selectedLanguage={speakers[1].languageCode}
              onLanguageChange={(lang) => handleLanguageChange(2, lang)}
            />
          </div>
          
          {/* Conversation mode tabs with reduced margin */}
          <Tabs defaultValue="standard" className="flex-1 flex flex-col">
            <TabsList className="grid grid-cols-2 w-[300px] mx-auto mb-2">
              <TabsTrigger value="standard">Standard Mode</TabsTrigger>
              <TabsTrigger value="continuous">Continuous Mode</TabsTrigger>
            </TabsList>
            
            {/* Standard mode */}
            <TabsContent value="standard" className="flex-1 flex flex-col">
              {/* Adjust the flex to ensure controls are always visible */}
              <div className="flex-1 min-h-0 mb-2">
                <ConversationContainer
                  messages={messages}
                  activeSpeakerId={activeSpeakerId}
                  isListening={speechRecognition.state.isListening}
                  isRecognizing={speechRecognition.state.isRecognizing}
                  isTranslating={isTranslating || translation.state.isTranslating}
                  recognitionState={speechRecognition.state}
                  activePersonLanguage={activeSpeaker.languageCode}
                  activePersonName={activeSpeaker.name}
                  onStopListening={handleStopListening}
                />
              </div>
              
              {/* Controls panel - always visible */}
              <div className="flex-shrink-0">
                <ControlsPanel
                  activeSpeakerId={activeSpeakerId}
                  onSpeakerToggle={handleSpeakerToggle}
                  onStartListening={handleStartListening}
                  onClearConversation={handleClearConversation}
                  onOpenReplay={handleOpenReplay}
                  isListening={speechRecognition.state.isListening}
                />
              </div>
            </TabsContent>
            
            {/* Continuous mode */}
            <TabsContent value="continuous" className="flex-1 flex flex-col overflow-hidden">
              <ContinuousConversation
                sessionId={sessionId}
                speaker1={speakers[0]}
                speaker2={speakers[1]}
                activeSpeakerId={activeSpeakerId}
                onSpeakerToggle={handleSpeakerToggle}
                onClearConversation={handleClearConversation}
                onOpenReplay={handleOpenReplay}
                messages={messages}
                onNewMessage={handleNewMessage}
                autoPlay={settings.voiceSelection !== 'none'}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
