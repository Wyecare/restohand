'use client';
import * as React from 'react';
import { PanelLeftIcon } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import UserMenu from '@/components/layout/header/user-menu';
import ThemeSwitch from '@/components/layout/header/theme-switch';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { useJwtAuth } from '@/contexts/JwtAuthProvider';
import { useAppSelector } from '@/store/hooks';
import { selectAuthSession } from '@/store/slices/authSlice';
import { useToast } from '@/components/ui/use-toast';
import { ThemeCustomizerPanel } from '@/components/theme-customizer';

export default function Header() {
  const { toggleSidebar } = useSidebar();
  const { user, logout } = useJwtAuth();
  const session = useAppSelector(selectAuthSession);
  const { toast } = useToast();

  const derivedUser = React.useMemo(() => {
    const displayName = session?.displayName ?? user?.displayName ?? '';
    const nameParts = displayName.split(' ');
    return {
      firstName: nameParts[0],
      lastName: nameParts[1],
      email: session?.email ?? user?.email ?? undefined,
      avatarUrl: user?.photoURL ?? undefined,
    };
  }, [session, user]);

  return (
    <div className="sticky top-0 z-50 flex flex-col">
      <header className="bg-background/50 flex h-14 items-center gap-3 px-4 backdrop-blur-xl lg:h-[60px]">
        <div className="flex flex-1 items-center gap-3">
          <Button
            onClick={toggleSidebar}
            size="icon"
            variant="outline"
            className="flex md:hidden lg:flex"
          >
            <PanelLeftIcon />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {/* Language switcher, theme switch and UserMenu */}
          <LanguageSwitcher />
          <ThemeSwitch />
          <ThemeCustomizerPanel />
          <UserMenu
            user={derivedUser}
            onLogout={async () => {
              try {
                await logout();
              } catch (error) {
                toast({
                  title: 'Failed to log out',
                  description:
                    error instanceof Error ? error.message : 'Please try again.',
                  variant: 'destructive',
                });
              }
            }}
          />
        </div>
      </header>
    </div>
  );
}
