import React, { useState, useEffect } from 'react';
import { Bell, Settings, Volume2, VolumeX, Clock, TrendingUp, Users, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
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

export function KitchenHeader({ orders, restaurant, soundEnabled, onSoundToggle }: KitchenHeaderProps) {
  const { user, logout } = useAuth();
  const session = useAppSelector(selectAuthSession);
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const pendingOrders = orders.filter(order => order.status === 'pending').length;
  const inProgressOrders = orders.filter(order => order.status === 'in_progress').length;
  const urgentOrders = orders.filter(order => {
    if (!order.createdAt) return false;
    const minutes = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
    return minutes >= 15;
  }).length;

  const avgPrepTime = React.useMemo(() => {
    const completedToday = orders.filter(order =>
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
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        {/* Left side - Restaurant Info & Stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            {restaurant?.logoUrl ? (
              <img
                src={restaurant.logoUrl}
                alt={restaurant.name}
                className="h-8 w-8 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <ChefHat className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
            <div>
              <h1 className="text-lg font-semibold tracking-tight">
                {restaurant?.name || 'Kitchen'}
              </h1>
              <p className="text-xs text-muted-foreground">
                {currentTime.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="hidden md:flex items-center gap-3">
            <Card className="border-0 shadow-none">
              <CardContent className="flex items-center gap-2 px-3 py-1.5">
                <div className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-medium">{pendingOrders}</span>
                <span className="text-xs text-muted-foreground">pending</span>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-none">
              <CardContent className="flex items-center gap-2 px-3 py-1.5">
                <div className="flex h-2 w-2 rounded-full bg-orange-500" />
                <span className="text-sm font-medium">{inProgressOrders}</span>
                <span className="text-xs text-muted-foreground">cooking</span>
              </CardContent>
            </Card>

            {urgentOrders > 0 && (
              <Card className="border-destructive/50 shadow-none">
                <CardContent className="flex items-center gap-2 px-3 py-1.5">
                  <div className="flex h-2 w-2 rounded-full bg-destructive animate-pulse" />
                  <span className="text-sm font-medium text-destructive">{urgentOrders}</span>
                  <span className="text-xs text-destructive/80">urgent</span>
                </CardContent>
              </Card>
            )}

            {avgPrepTime > 0 && (
              <Card className="border-0 shadow-none">
                <CardContent className="flex items-center gap-2 px-3 py-1.5">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm font-medium">{avgPrepTime}m</span>
                  <span className="text-xs text-muted-foreground">avg</span>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Right side - Controls & User Menu */}
        <div className="flex items-center gap-3">
          {/* Sound Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onSoundToggle(!soundEnabled)}
              className={soundEnabled ? "text-green-600" : "text-muted-foreground"}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
          </div>

          {/* Theme Toggle */}
          <ThemeSwitch />

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            {urgentOrders > 0 && (
              <Badge
                variant="destructive"
                className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs"
              >
                {urgentOrders}
              </Badge>
            )}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={derivedUser.avatarUrl} alt={derivedUser.firstName} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {derivedUser.firstName?.[0]?.toUpperCase() || 'C'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">{derivedUser.firstName} {derivedUser.lastName}</p>
                  {derivedUser.email && (
                    <p className="w-[200px] truncate text-sm text-muted-foreground">
                      {derivedUser.email}
                    </p>
                  )}
                  <Badge variant="secondary" className="w-fit text-xs">
                    Kitchen Staff
                  </Badge>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <TrendingUp className="mr-2 h-4 w-4" />
                <span>Performance</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:text-destructive"
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