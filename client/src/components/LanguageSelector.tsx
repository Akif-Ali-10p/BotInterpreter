import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger 
} from '@/components/ui/popover';
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList 
} from '@/components/ui/command';
import { ChevronDown, Globe, User } from 'lucide-react';
import { Language } from '@/types';
import { SUPPORTED_LANGUAGES } from '@/lib/languageUtils';

interface LanguageSelectorProps {
  personIndex: 1 | 2;
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
}

export default function LanguageSelector({
  personIndex,
  selectedLanguage,
  onLanguageChange
}: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const selectedLanguageObj = SUPPORTED_LANGUAGES.find(
    lang => lang.code === selectedLanguage
  ) || { code: selectedLanguage, name: selectedLanguage };

  // Get name based on personIndex
  const personName = `Person ${personIndex}`;
  const isFirstPerson = personIndex === 1;

  return (
    <div className="flex items-center space-x-2">
      {isFirstPerson && (
        <div className={`w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center`}>
          <User className="h-5 w-5 text-primary" />
        </div>
      )}
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="flex items-center space-x-1 px-3 py-2"
          >
            <span className="font-medium">{selectedLanguageObj.name}</span>
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align={isFirstPerson ? "start" : "end"}>
          <Command>
            <CommandInput placeholder="Search language..." />
            <CommandList>
              <CommandEmpty>No language found.</CommandEmpty>
              <CommandGroup>
                {SUPPORTED_LANGUAGES.map((language) => (
                  <CommandItem
                    key={language.code}
                    value={language.code}
                    onSelect={(value) => {
                      onLanguageChange(value);
                      setOpen(false);
                    }}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <Globe className="h-4 w-4" />
                    <span>{language.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {!isFirstPerson && (
        <div className={`w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center`}>
          <User className="h-5 w-5 text-secondary" />
        </div>
      )}
    </div>
  );
}
