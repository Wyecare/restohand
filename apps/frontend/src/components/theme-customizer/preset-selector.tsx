'use client';

import { DEFAULT_THEME, THEMES } from '@/lib/themes';
import { useThemeConfig } from '@/contexts/ThemeContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';

export function PresetSelector() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until component is mounted
  if (!mounted) {
    return (
      <div className="flex flex-col gap-4">
        <Label>Theme preset:</Label>
        <div className="w-full h-10 bg-muted animate-pulse rounded-md" />
      </div>
    );
  }

  return <PresetSelectorContent />;
}

function PresetSelectorContent() {
  const { theme, setTheme } = useThemeConfig();

  const handlePreset = (value: string) => {
    setTheme({ ...theme, preset: value as any });
  };

  return (
    <div className="flex flex-col gap-4">
      <Label>Theme preset:</Label>
      <Select
        value={theme.preset}
        onValueChange={(value) => handlePreset(value)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a theme" />
        </SelectTrigger>
        <SelectContent align="end">
          {THEMES.map((theme) => (
            <SelectItem key={theme.name} value={theme.value}>
              <div className="flex shrink-0 gap-1">
                {theme.colors.map((color, key) => (
                  <span
                    key={key}
                    className="size-2 rounded-full"
                    style={{ backgroundColor: color }}
                  ></span>
                ))}
              </div>
              {theme.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
