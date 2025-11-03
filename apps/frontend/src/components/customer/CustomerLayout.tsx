import { useEffect, useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
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

      {/* Footer with policy links */}
      <footer className="border-t border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <div className="flex flex-col items-center justify-center space-y-3 text-center">
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
              <Link to="/about-us" className="hover:text-foreground transition-colors">
                About Us
              </Link>
              <span>•</span>
              <Link to="/privacy-policy" className="hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <span>•</span>
              <Link to="/terms-conditions" className="hover:text-foreground transition-colors">
                Terms & Conditions
              </Link>
              <span>•</span>
              <Link to="/refund-policy" className="hover:text-foreground transition-colors">
                Refund Policy
              </Link>
              <span>•</span>
              <Link to="/contact-us" className="hover:text-foreground transition-colors">
                Contact Us
              </Link>
            </div>
            <div className="text-xs text-muted-foreground">
              © 2024 Restohand by Wyecare Solutions. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
