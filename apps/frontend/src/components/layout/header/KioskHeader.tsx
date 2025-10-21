'use client';

import * as React from 'react';
import { PanelLeftIcon } from 'lucide-react';
import UserMenu from '@/components/layout/header/user-menu';
import ThemeSwitch from '@/components/layout/header/theme-switch';
import Notifications from '@/components/layout/header/notifications';
import { Button } from '@/components/ui/button';
import { ThemeCustomizerPanel } from '@/components/theme-customizer';
import { ReloadIcon } from '@radix-ui/react-icons';
import { useSmartRefresh } from '@/hooks/useSmartRefresh';
import { useToast } from '@/components/ui/use-toast';

export default function Header() {
  const { refresh, currentPath } = useSmartRefresh();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);

    try {
      const result = refresh();

      // Show success toast with details
      toast({
        title: 'Page Refreshed',
        description: result.description,
        duration: 2000,
      });

      console.log('🔄 Refresh completed:', result);
    } catch (error) {
      console.error('❌ Refresh failed:', error);
      toast({
        title: 'Refresh Failed',
        description: 'Unable to refresh page data',
        variant: 'destructive',
      });
    } finally {
      // Add a small delay to show the spinning animation
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  return (
    <div className="sticky top-0 z-50 flex flex-col">
      <header className="bg-background/50 flex h-14 items-center gap-3 px-4 backdrop-blur-xl lg:h-[60px]">
        {/* <Button
          onClick={}
          size="icon"
          variant="outline"
          className="flex md:hidden lg:flex"
        >
          <PanelLeftIcon />
        </Button> */}
        <div className="flex md:hidden lg:flex">KIOSK</div>
        <Button
          onClick={handleRefresh}
          size="icon"
          variant="outline"
          className="ml-auto"
          disabled={isRefreshing}
          title={`Refresh data for ${currentPath}`}
        >
          <ReloadIcon className={isRefreshing ? 'animate-spin' : ''} />
        </Button>
        {/* <Search /> */}
        <Notifications />
        <ThemeCustomizerPanel />
        <ThemeSwitch />
        <UserMenu />
      </header>
    </div>
  );
}
