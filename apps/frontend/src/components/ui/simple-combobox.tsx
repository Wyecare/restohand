import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface SimpleComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
}

export function SimpleCombobox({
  value,
  onValueChange,
  suggestions,
  placeholder = 'Select...',
  emptyMessage = 'No options found',
  className,
  disabled = false,
}: SimpleComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(value);

  // Update input value when prop value changes
  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleSelect = (selectedValue: string) => {
    // If it's from suggestions, use it directly
    if (suggestions.includes(selectedValue)) {
      onValueChange(selectedValue);
      setInputValue(selectedValue);
    } else {
      // If it's a custom input, use the input value
      onValueChange(inputValue);
    }
    setOpen(false);
  };

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    // If user is typing and it's not in suggestions, still update the value
    onValueChange(newValue);
  };

  const displayValue = value || inputValue;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('justify-between', className)}
          disabled={disabled}
        >
          <span
            className={cn('truncate', !displayValue && 'text-muted-foreground')}
          >
            {displayValue || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="min-w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Type to search or add new..."
            value={inputValue}
            onValueChange={handleInputChange}
          />
          <CommandList>
            <CommandEmpty>
              <div className="p-2 text-sm text-muted-foreground">
                {inputValue ? (
                  <div>
                    <p>{emptyMessage}</p>
                    <Button
                      variant="ghost"
                      className="mt-2 h-auto p-2 font-normal"
                      onClick={() => handleSelect(inputValue)}
                    >
                      Add "{inputValue}"
                    </Button>
                  </div>
                ) : (
                  emptyMessage
                )}
              </div>
            </CommandEmpty>
            <CommandGroup>
              {suggestions.map((suggestion) => (
                <CommandItem
                  key={suggestion}
                  value={suggestion}
                  onSelect={() => handleSelect(suggestion)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === suggestion ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {suggestion}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
