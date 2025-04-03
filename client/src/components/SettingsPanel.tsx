import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Settings } from '@/types';
import { X } from 'lucide-react';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Partial<Settings>;
  onSettingsChange: (newSettings: Partial<Settings>) => void;
  darkMode: boolean;
  onDarkModeChange: (isDark: boolean) => void;
}

export default function SettingsPanel({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  darkMode,
  onDarkModeChange
}: SettingsPanelProps) {
  // Local state for form values
  const [formValues, setFormValues] = useState<Partial<Settings>>(settings);
  const [localDarkMode, setLocalDarkMode] = useState(darkMode);
  
  // Update form values when settings change
  useEffect(() => {
    setFormValues(settings);
    setLocalDarkMode(darkMode);
  }, [settings, darkMode, isOpen]);
  
  const handleSave = () => {
    onSettingsChange(formValues);
    onDarkModeChange(localDarkMode);
    onClose();
  };
  
  // Handle changes to form fields
  const handleSwitchChange = (field: keyof Settings) => (checked: boolean) => {
    setFormValues(prev => ({ ...prev, [field]: checked }));
  };
  
  const handleDarkModeChange = (checked: boolean) => {
    setLocalDarkMode(checked);
  };
  
  const handleSpeechRateChange = (value: number[]) => {
    setFormValues(prev => ({ ...prev, speechRate: String(value[0]) }));
  };
  
  const handleVoiceSelectionChange = (value: string) => {
    setFormValues(prev => ({ ...prev, voiceSelection: value }));
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-medium flex items-center justify-between">
            Settings
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <h3 className="font-medium text-lg">Speech Settings</h3>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="autoDetect" className="flex items-center space-x-2">
                <span>Auto-detect language</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-primary">
                  <path d="m12 2 5 5" />
                  <path d="m5 7 5 5" />
                  <path d="m7 22-5-5" />
                  <path d="m17 12-5 5" />
                  <path d="m12 7 5 5-5 5-5-5Z" />
                </svg>
              </Label>
              <Switch 
                id="autoDetect" 
                checked={formValues.autoDetect ?? true}
                onCheckedChange={handleSwitchChange('autoDetect')}
              />
            </div>
            
            <div>
              <Label htmlFor="speechRate" className="block mb-2">Speech rate</Label>
              <Slider
                id="speechRate"
                min={0.5}
                max={2}
                step={0.1}
                value={[parseFloat(formValues.speechRate || '1.0')]}
                onValueChange={handleSpeechRateChange}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Slow</span>
                <span>Normal</span>
                <span>Fast</span>
              </div>
            </div>
            
            <div>
              <Label htmlFor="voiceSelector" className="block mb-2">Voice selection</Label>
              <Select 
                value={formValues.voiceSelection || 'default'} 
                onValueChange={handleVoiceSelectionChange}
              >
                <SelectTrigger id="voiceSelector">
                  <SelectValue placeholder="Select voice" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default female voice</SelectItem>
                  <SelectItem value="male">Default male voice</SelectItem>
                  <SelectItem value="enhanced_female">Enhanced female voice</SelectItem>
                  <SelectItem value="enhanced_male">Enhanced male voice</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="font-medium text-lg">Interface Settings</h3>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="darkMode" className="flex items-center space-x-2">
                <span>Dark mode</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
              </Label>
              <Switch 
                id="darkMode" 
                checked={localDarkMode}
                onCheckedChange={handleDarkModeChange}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="saveHistory" className="flex items-center space-x-2">
                <span>Save conversation history</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M12 8v4l3 3" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
              </Label>
              <Switch 
                id="saveHistory" 
                checked={formValues.saveHistory ?? true}
                onCheckedChange={handleSwitchChange('saveHistory')}
              />
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button type="submit" onClick={handleSave}>
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
