import { useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff } from 'lucide-react';

export function useNetworkErrorHandler() {
  const { toast } = useToast();

  useEffect(() => {
    const handleOnline = () => {
      toast({
        title: 'Back online',
        description: 'Your connection has been restored.',
        action: (
          <div className="flex items-center gap-2">
            <Wifi className="h-4 w-4 text-green-500" />
            <span className="text-green-500">Connected</span>
          </div>
        ),
      });
    };

    const handleOffline = () => {
      toast({
        title: 'No internet connection',
        description: 'Some features may not work properly.',
        variant: 'destructive',
        action: (
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4" />
            <span>Offline</span>
          </div>
        ),
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  return {
    isOnline: navigator.onLine,
  };
}

export function NetworkStatus() {
  const { isOnline } = useNetworkErrorHandler();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground p-2 text-center text-sm">
      <div className="flex items-center justify-center gap-2">
        <WifiOff className="h-4 w-4" />
        <span>No internet connection - some features may not work</span>
      </div>
    </div>
  );
}