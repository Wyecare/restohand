import React, { useState, useEffect } from 'react';
import {
  Bell,
  Settings,
  Volume2,
  VolumeX,
  Clock,
  TrendingUp,
  ChefHat,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ThemeSwitch from '@/components/layout/header/theme-switch';
import { useAuth } from '@/contexts/AuthProvider';
import { useAppSelector } from '@/store/hooks';
import { selectAuthSession } from '@/store/slices/authSlice';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import type { Order } from '@/store/api/types';

interface KitchenHeaderProps {
  orders: Order[];
  restaurant?: {
    name?: string;
    logoUrl?: string;
  };
  soundEnabled: boolean;
  onSoundToggle: (enabled: boolean) => void;
}

export function KitchenHeader({
  orders,
  restaurant,
  soundEnabled,
  onSoundToggle,
}: KitchenHeaderProps) {
  const { user, logout } = useAuth();
  const session = useAppSelector(selectAuthSession);
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const pendingOrders = orders.filter(
    (order) => order.status === 'pending'
  ).length;
  const inProgressOrders = orders.filter(
    (order) => order.status === 'in_progress'
  ).length;
  const urgentOrders = orders.filter((order) => {
    if (!order.createdAt) return false;
    const minutes = Math.floor(
      (Date.now() - new Date(order.createdAt).getTime()) / 60000
    );
    return minutes >= 15;
  }).length;

  const avgPrepTime = React.useMemo(() => {
    const completedToday = orders.filter(
      (order) =>
        order.status === 'ready' &&
        order.createdAt &&
        new Date(order.createdAt).toDateString() === new Date().toDateString()
    );

    if (completedToday.length === 0) return 0;

    const totalTime = completedToday.reduce((acc, order) => {
      if (!order.createdAt) return acc;
      const created = new Date(order.createdAt).getTime();
      const completed = Date.now();
      return acc + (completed - created);
    }, 0);

    return Math.round(totalTime / completedToday.length / 60000);
  }, [orders]);

  const derivedUser = React.useMemo(() => {
    const nameParts = (session?.displayName ?? '').split(' ');
    return {
      firstName: nameParts[0] || 'Chef',
      lastName: nameParts[1],
      email: session?.email ?? user?.email ?? undefined,
      avatarUrl: user?.photoURL ?? undefined,
    };
  }, [session, user]);

  const handleLogout = async () => {
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
  };

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="flex h-14 items-center justify-between px-3 sm:px-4 lg:px-6 gap-3">
        {/* Left side - Restaurant Info */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            {restaurant?.logoUrl ? (
              <img
                src={restaurant.logoUrl}
                alt={restaurant.name}
                className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-primary flex-shrink-0">
                <ChefHat className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-semibold tracking-tight truncate">
                {restaurant?.name || 'Kitchen'}
              </h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
                {currentTime.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          {/* Inline Quick Stats - Desktop Only */}
          <div className="hidden lg:flex items-center gap-2 ml-2">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/40">
              <div className="h-1.5 w-1.5 rounded-full bg-sky-500" />
              <span className="text-xs font-semibold">{pendingOrders}</span>
              <span className="text-[10px] text-sky-700/80 dark:text-sky-300/80">
                new
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40">
              <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span className="text-xs font-semibold">{inProgressOrders}</span>
              <span className="text-[10px] text-amber-700/80 dark:text-amber-300/80">
                cooking
              </span>
            </div>

            {urgentOrders > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40">
                <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                <span className="text-xs font-semibold text-rose-600 dark:text-rose-300">
                  {urgentOrders}
                </span>
                <span className="text-[10px] text-rose-600/80 dark:text-rose-300/80">
                  urgent
                </span>
              </div>
            )}

            {avgPrepTime > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 border border-border/50">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground">
                  {avgPrepTime}m
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right side - Controls & User Menu */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Mobile: Show urgent count badge */}
          {urgentOrders > 0 && (
            <Badge
              variant="secondary"
              className="lg:hidden text-xs h-6 px-2 bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
            >
              {urgentOrders} urgent
            </Badge>
          )}

          {/* Sound Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onSoundToggle(!soundEnabled)}
          className={cn(
            'h-8 w-8 sm:h-9 sm:w-9',
            soundEnabled
                ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                : 'text-muted-foreground hover:text-foreground'
          )}
            title={soundEnabled ? 'Sound enabled' : 'Sound disabled'}
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </Button>

          {/* Theme Toggle */}
          <div className="hidden sm:block">
            <ThemeSwitch />
          </div>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8 sm:h-9 sm:w-9 hidden sm:flex"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            {urgentOrders > 0 && (
              <Badge
                variant="destructive"
                className="absolute -right-1 -top-1 h-4 w-4 rounded-full p-0 text-[9px] flex items-center justify-center"
              >
                {urgentOrders}
              </Badge>
            )}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-8 w-8 rounded-full p-0"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={derivedUser.avatarUrl}
                    alt={derivedUser.firstName}
                  />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {derivedUser.firstName?.[0]?.toUpperCase() || 'C'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium text-sm">
                    {derivedUser.firstName} {derivedUser.lastName}
                  </p>
                  {derivedUser.email && (
                    <p className="w-[200px] truncate text-xs text-muted-foreground">
                      {derivedUser.email}
                    </p>
                  )}
                  <Badge variant="secondary" className="w-fit text-xs mt-1">
                    Kitchen Staff
                  </Badge>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-sm">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-sm sm:hidden">
                <span>Theme</span>
                <div className="ml-auto">
                  <ThemeSwitch />
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-sm">
                <TrendingUp className="mr-2 h-4 w-4" />
                <span>Performance</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-sm text-destructive focus:text-destructive"
              >
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
