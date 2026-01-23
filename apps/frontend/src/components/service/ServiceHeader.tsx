import React, { useState, useEffect } from 'react';
import {
  Settings,
  Clock,
  Users,
  Receipt,
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
import { useJwtAuth } from '@/contexts/JwtAuthProvider';
import { useAppSelector } from '@/store/hooks';
import { selectAuthSession } from '@/store/slices/authSlice';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import type { RestaurantTable, ServiceTablesStats } from '@/store/api/types';

interface ServiceHeaderProps {
  tables: RestaurantTable[];
  stats?: ServiceTablesStats;
  restaurant?: {
    name?: string;
    logoUrl?: string;
  };
}

export function ServiceHeader({
  tables,
  stats,
  restaurant,
}: ServiceHeaderProps) {
  const { user, logout } = useJwtAuth();
  const session = useAppSelector(selectAuthSession);
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate service stats
  const derivedStats = React.useMemo(() => {
    const occupiedTables = tables.filter((table) => !!table.activeOrder).length;
    const readyOrders = tables.filter(
      (table) => table.activeOrder?.status === 'ready'
    ).length;
    const unpaidOrders = tables.filter(
      (table) =>
        table.activeOrder &&
        table.activeOrder.paymentStatus !== 'paid' &&
        table.activeOrder.status !== 'cancelled'
    ).length;

    return {
      totalTables: tables.length,
      occupiedTables,
      activeOrders: occupiedTables,
      readyOrders,
      unpaidOrders,
    };
  }, [tables]);

  const activeOrders = stats?.activeOrders ?? derivedStats.activeOrders;
  const occupiedTables = stats?.occupiedTables ?? derivedStats.occupiedTables;
  const readyOrders = stats?.readyOrders ?? derivedStats.readyOrders;
  const unpaidOrders = stats?.unpaidOrders ?? derivedStats.unpaidOrders;
  const todaysRevenue = stats?.todaysRevenue ?? 0;

  const derivedUser = React.useMemo(() => {
    const nameParts = (session?.displayName ?? '').split(' ');
    return {
      firstName: nameParts[0] || 'Waiter',
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
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-semibold tracking-tight truncate">
                {restaurant?.name || 'Service'}
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
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              <span className="text-xs font-semibold">{occupiedTables}</span>
              <span className="text-[10px] text-muted-foreground">
                occupied
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
              <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
              <span className="text-xs font-semibold">{activeOrders}</span>
              <span className="text-[10px] text-muted-foreground">active</span>
            </div>

            {readyOrders > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                  {readyOrders}
                </span>
                <span className="text-[10px] text-green-600/80 dark:text-green-400/80">
                  ready
                </span>
              </div>
            )}

            {unpaidOrders > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                  {unpaidOrders}
                </span>
                <span className="text-[10px] text-red-600/80 dark:text-red-400/80">
                  unpaid
                </span>
              </div>
            )}

            {todaysRevenue > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
                <Receipt className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-semibold">
                  ₹{Math.round(todaysRevenue)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right side - Controls & User Menu */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Mobile: Show ready orders badge */}
          {readyOrders > 0 && (
            <Badge
              variant="default"
              className="lg:hidden text-xs h-6 px-2 bg-green-600"
            >
              {readyOrders} ready
            </Badge>
          )}

          {/* Mobile: Show unpaid orders badge */}
          {unpaidOrders > 0 && (
            <Badge variant="destructive" className="lg:hidden text-xs h-6 px-2">
              {unpaidOrders} unpaid
            </Badge>
          )}

          {/* Theme Toggle */}
          <div className="hidden sm:block">
            <ThemeSwitch />
          </div>

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
                    {derivedUser.firstName?.[0]?.toUpperCase() || 'W'}
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
                    Service Staff
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
