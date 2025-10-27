import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Moon, MoonIcon, Sun, SunIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';

export default function CustomerLayout() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme(); // This now uses your custom hook

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <span className="text-base font-semibold tracking-tight">
            Restohand
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="relative ml-auto"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            {theme === 'light' ? <SunIcon /> : <MoonIcon />}
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
