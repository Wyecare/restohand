'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext'; // Import your custom hook
import { MoonIcon, SunIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ThemeSwitch() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme(); // This now uses your custom hook

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <Button
      size="icon"
      variant="outline"
      className="relative ml-auto"
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
    >
      {theme === 'light' ? <SunIcon /> : <MoonIcon />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
