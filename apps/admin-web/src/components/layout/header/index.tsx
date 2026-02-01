'use client';
import * as React from 'react';
import { PanelLeftIcon } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import UserMenu from '@/components/layout/header/user-menu';
import ThemeSwitch from '@/components/layout/header/theme-switch';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectAuthUser, clearAuthState } from '@/store/slices/authSlice';
import { useLogoutMutation } from '@/store/api/authApi';
import { useToast } from '@/components/ui/use-toast';

export default function Header() {
  const { toggleSidebar } = useSidebar();
  const user = useAppSelector(selectAuthUser);
  const dispatch = useAppDispatch();
  const [logout] = useLogoutMutation();
  const { toast } = useToast();

  const derivedUser = React.useMemo(() => {
    if (!user) return null;
    const nameParts = user.name.split(' ');
    return {
      firstName: nameParts[0] || '',
      lastName: nameParts[1] || '',
      email: user.email,
      avatarUrl: undefined,
    };
  }, [user]);

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

          <div className="text-lg font-semibold text-foreground">
            Super Admin Dashboard
          </div>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <ThemeSwitch />
          <UserMenu
            user={derivedUser}
            onLogout={async () => {
              try {
                await logout().unwrap();
                dispatch(clearAuthState());
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
