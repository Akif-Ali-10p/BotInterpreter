import { Button } from '@/components/ui/button';
import { Trash2, ArrowUpDown, Mic } from 'lucide-react';
import { SpeakerId } from '@/types';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ControlsPanelProps {
  activeSpeakerId: SpeakerId;
  onSpeakerToggle: () => void;
  onStartListening: () => void;
  onClearConversation: () => void;
  isListening: boolean;
}

export default function ControlsPanel({
  activeSpeakerId,
  onSpeakerToggle,
  onStartListening,
  onClearConversation,
  isListening
}: ControlsPanelProps) {
  const [ripple, setRipple] = useState<{ active: boolean, x: number, y: number }>({
    active: false,
    x: 0,
    y: 0
  });

  // Clean up ripple effect after animation
  useEffect(() => {
    if (ripple.active) {
      const timer = setTimeout(() => {
        setRipple({ ...ripple, active: false });
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [ripple]);

  // Handle mic button click with ripple effect
  const handleMicClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    
    // Calculate ripple position relative to button
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    setRipple({ active: true, x, y });
    onStartListening();
  };

  return (
    <div className="mt-6 flex justify-center items-center space-x-4">
      <Button 
        variant="secondary"
        size="icon"
        className="rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
        onClick={onClearConversation}
        aria-label="Clear conversation"
      >
        <Trash2 className="h-5 w-5" />
      </Button>

      {/* Primary mic button */}
      <Button
        disabled={isListening}
        className={cn(
          "relative w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all",
          isListening && "opacity-50 cursor-not-allowed"
        )}
        onClick={handleMicClick}
        aria-label="Start speaking"
      >
        <Mic className="h-6 w-6" />
        {ripple.active && (
          <span 
            className="absolute rounded-full bg-white/30 animate-ripple"
            style={{
              width: '100%',
              height: '100%',
              left: 0,
              top: 0,
              transform: 'scale(0)',
            }}
          />
        )}
      </Button>

      <div className="relative">
        <Button
          variant="secondary"
          size="icon"
          className="rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
          onClick={onSpeakerToggle}
          aria-label="Switch active person"
        >
          <ArrowUpDown className="h-5 w-5" />
        </Button>
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 px-3 py-1 rounded-full shadow-md text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
          <span>Person {activeSpeakerId} is speaking</span>
        </div>
      </div>
    </div>
  );
}

// Define ripple animation for Tailwind
const tailwindConfig = {
  theme: {
    extend: {
      keyframes: {
        ripple: {
          to: {
            transform: 'scale(2.5)',
            opacity: '0'
          }
        }
      },
      animation: {
        ripple: 'ripple 0.8s linear'
      }
    }
  }
};
