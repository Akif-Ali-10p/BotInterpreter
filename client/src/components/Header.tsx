import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Settings, Moon, Sun } from 'lucide-react';
import SettingsPanel from './SettingsPanel';

interface HeaderProps {
  darkMode: boolean;
  onDarkModeChange: (isDark: boolean) => void;
  settings: any;  // Settings are passed to the settings panel
  onSettingsChange: (newSettings: any) => void;
}

export default function Header({ 
  darkMode, 
  onDarkModeChange, 
  settings,
  onSettingsChange
}: HeaderProps) {
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);

  return (
    <>
      <header className="bg-white dark:bg-gray-900 border-b border-neutral-300 dark:border-gray-700 shadow-sm">
        <div className="container mx-auto px-2 py-2 flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <span className="text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                <path d="m5 8 6 6" />
                <path d="m4 14 6-6 2-3" />
                <path d="M2 5h12" />
                <path d="M7 2h1" />
                <path d="m22 22-5-10-5 10" />
                <path d="M14 18h6" />
              </svg>
            </span>
            <h1 className="text-xl font-medium text-gray-900 dark:text-gray-100">Babel</h1>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-full"
              aria-label="Settings"
              onClick={() => setIsSettingsPanelOpen(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-full"
              aria-label="Toggle dark mode"
              onClick={() => onDarkModeChange(!darkMode)}
            >
              {darkMode ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </header>

      <SettingsPanel
        isOpen={isSettingsPanelOpen}
        onClose={() => setIsSettingsPanelOpen(false)}
        settings={settings}
        onSettingsChange={onSettingsChange}
        darkMode={darkMode}
        onDarkModeChange={onDarkModeChange}
      />
    </>
  );
}
