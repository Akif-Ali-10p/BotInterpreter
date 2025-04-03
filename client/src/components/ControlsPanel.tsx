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
    <div className="flex justify-center items-center gap-2 py-2 bg-background/80 backdrop-blur-sm border-t">
      <Button 
        variant="secondary"
        size="icon"
        className="rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 h-10 w-10"
        onClick={onClearConversation}
        aria-label="Clear conversation"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      {/* Primary mic button - slightly smaller */}
      <Button
        disabled={isListening}
        className={cn(
          "relative w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all",
          isListening && "opacity-50 cursor-not-allowed",
          isListening && "pulse" // Added pulse animation class
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
          className="rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 h-10 w-10"
          onClick={onSpeakerToggle}
          aria-label="Switch active person"
        >
          <ArrowUpDown className="h-4 w-4" />
        </Button>
        {/* Changed to a more compact indicator */}
        <div className="absolute -top-1 -right-1 bg-primary text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
          {activeSpeakerId}
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
