import { Clock } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export interface TimezoneOption {
  value: string;
  label: string;
  flag?: string;
}

export const COMMON_TIMEZONES: TimezoneOption[] = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'Europe/London', label: '🇬🇧 London (GMT/BST)', flag: '🇬🇧' },
  { value: 'Europe/Dublin', label: '🇮🇪 Dublin (GMT/IST)', flag: '🇮🇪' },
  { value: 'Asia/Kolkata', label: '🇮🇳 India (IST)', flag: '🇮🇳' },
  { value: 'America/New_York', label: '🇺🇸 Eastern Time', flag: '🇺🇸' },
  { value: 'America/Chicago', label: '🇺🇸 Central Time', flag: '🇺🇸' },
  { value: 'America/Denver', label: '🇺🇸 Mountain Time', flag: '🇺🇸' },
  { value: 'America/Los_Angeles', label: '🇺🇸 Pacific Time', flag: '🇺🇸' },
  { value: 'Australia/Sydney', label: '🇦🇺 Sydney (AEST/AEDT)', flag: '🇦🇺' },
  { value: 'Europe/Paris', label: '🇫🇷 Paris (CET/CEST)', flag: '🇫🇷' },
  { value: 'Asia/Tokyo', label: '🇯🇵 Tokyo (JST)', flag: '🇯🇵' },
  { value: 'Asia/Shanghai', label: '🇨🇳 Shanghai (CST)', flag: '🇨🇳' },
  { value: 'Europe/Berlin', label: '🇩🇪 Berlin (CET/CEST)', flag: '🇩🇪' },
  { value: 'Asia/Dubai', label: '🇦🇪 Dubai (GST)', flag: '🇦🇪' },
];

export interface TimezoneSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  showDetected?: boolean;
  disabled?: boolean;
  className?: string;
}

export function detectUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

export const TimezoneSelect = ({
  value,
  onValueChange,
  label = 'Timezone',
  placeholder = 'Select timezone',
  showDetected = true,
  disabled = false,
  className,
}: TimezoneSelectProps) => {
  const detectedTimezone = detectUserTimezone();
  const isDetectedTimezone = value === detectedTimezone;

  return (
    <div className={`space-y-2 ${className || ''}`}>
      {label && (
        <Label className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {label}
        </Label>
      )}

      {showDetected && detectedTimezone && (
        <div className="text-sm text-muted-foreground">
          <p>
            Detected timezone: <strong>{detectedTimezone}</strong>
          </p>
        </div>
      )}

      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {COMMON_TIMEZONES.map((tz) => (
            <SelectItem key={tz.value} value={tz.value}>
              {tz.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value && value !== detectedTimezone && !isDetectedTimezone && (
        <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-800">
          <strong>Note:</strong> You selected {value} instead of your detected timezone ({detectedTimezone}).
          This will be used for your organization's scheduling.
        </div>
      )}
    </div>
  );
};