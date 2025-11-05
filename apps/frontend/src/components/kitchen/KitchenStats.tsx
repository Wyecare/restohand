import React from 'react';
import {
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Timer,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Order } from '@/store/api/types';
import { cn } from '@/lib/utils';

interface KitchenStatsProps {
  orders: Order[];
}

export function KitchenStats({ orders }: KitchenStatsProps) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const todaysOrders = orders.filter(
    (order) => order.createdAt && new Date(order.createdAt) >= todayStart
  );

  const stats = React.useMemo(() => {
    const pending = orders.filter((order) => order.status === 'pending').length;
    const inProgress = orders.filter(
      (order) => order.status === 'in_progress'
    ).length;
    const ready = orders.filter((order) => order.status === 'ready').length;
    const completed = todaysOrders.filter(
      (order) => order.status === 'completed'
    ).length;

    const urgent = orders.filter((order) => {
      if (
        !order.createdAt ||
        order.status === 'ready' ||
        order.status === 'completed'
      )
        return false;
      const minutes = Math.floor(
        (Date.now() - new Date(order.createdAt).getTime()) / 60000
      );
      return minutes >= 15;
    }).length;

    const warning = orders.filter((order) => {
      if (
        !order.createdAt ||
        order.status === 'ready' ||
        order.status === 'completed'
      )
        return false;
      const minutes = Math.floor(
        (Date.now() - new Date(order.createdAt).getTime()) / 60000
      );
      return minutes >= 10 && minutes < 15;
    }).length;

    // Calculate average prep time for completed orders today
    const completedWithTimes = todaysOrders.filter(
      (order) => order.status === 'completed' && order.createdAt && order.paidAt
    );

    const avgPrepTime =
      completedWithTimes.length > 0
        ? completedWithTimes.reduce((acc, order) => {
            const created = new Date(order.createdAt!).getTime();
            const finished = new Date(order.paidAt!).getTime();
            return acc + (finished - created);
          }, 0) /
          completedWithTimes.length /
          60000
        : 0;

    // Calculate kitchen efficiency (orders completed vs started)
    const startedToday = todaysOrders.filter((order) =>
      ['accepted', 'in_progress', 'ready', 'completed'].includes(order.status)
    ).length;

    const efficiency = startedToday > 0 ? (completed / startedToday) * 100 : 0;

    // Calculate rush hour detection
    const currentHour = now.getHours();
    const isRushHour =
      (currentHour >= 12 && currentHour <= 14) ||
      (currentHour >= 19 && currentHour <= 21);

    return {
      pending,
      inProgress,
      ready,
      completed,
      urgent,
      warning,
      avgPrepTime: Math.round(avgPrepTime),
      efficiency: Math.round(efficiency),
      isRushHour,
      totalActive: pending + inProgress + ready,
    };
  }, [orders, todaysOrders]);

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 90) return 'text-green-600 dark:text-green-400';
    if (efficiency >= 70) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getPrepTimeColor = (minutes: number) => {
    if (minutes <= 15) return 'text-green-600 dark:text-green-400';
    if (minutes <= 25) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
      {/* Active Orders */}
      <Card className="border border-border/60 bg-card/95 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
          <CardTitle className="text-xs font-medium">Active</CardTitle>
          <BarChart3 className="h-3.5 w-3.5 text-primary" />
        </CardHeader>
        <CardContent className="pb-2">
          <div className="text-xl font-bold text-primary">
            {stats.totalActive}
          </div>
          <p className="text-[10px] text-muted-foreground leading-tight">
            {stats.pending}P • {stats.inProgress}C • {stats.ready}R
          </p>
        </CardContent>
      </Card>

      {/* Urgent Orders */}
      <Card
        className={cn(
          'border border-border/60 bg-card/95 backdrop-blur-sm',
          stats.urgent > 0 &&
            'border-rose-200 bg-rose-50/70 dark:border-rose-900/50 dark:bg-rose-950/20'
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
          <CardTitle className="text-xs font-medium">Urgent</CardTitle>
          <AlertTriangle
            className={cn(
              'h-3.5 w-3.5',
              stats.urgent > 0
                ? 'text-rose-600 dark:text-rose-300'
                : 'text-muted-foreground'
            )}
          />
        </CardHeader>
        <CardContent className="pb-2">
          <div
            className={cn(
              'text-xl font-bold',
              stats.urgent > 0
                ? 'text-rose-600 dark:text-rose-300'
                : 'text-muted-foreground'
            )}
          >
            {stats.urgent}
          </div>
          <p className="text-[10px] text-muted-foreground leading-tight">
            {stats.warning} warn • 15min+
          </p>
        </CardContent>
      </Card>

      {/* Average Prep Time */}
      <Card className="border border-border/60 bg-card/95 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
          <CardTitle className="text-xs font-medium">Avg Time</CardTitle>
          <Timer className="h-3.5 w-3.5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="pb-2">
          <div
            className={cn(
              'text-xl font-bold',
              getPrepTimeColor(stats.avgPrepTime)
            )}
          >
            {stats.avgPrepTime}m
          </div>
          <p className="text-[10px] text-muted-foreground leading-tight">
            Today's avg
          </p>
        </CardContent>
      </Card>

      {/* Completed Today */}
      <Card className="border border-border/60 bg-card/95 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
          <CardTitle className="text-xs font-medium">Done</CardTitle>
          <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
        </CardHeader>
        <CardContent className="pb-2">
          <div className="text-xl font-bold text-green-600 dark:text-green-400">
            {stats.completed}
          </div>
          <p className="text-[10px] text-muted-foreground leading-tight">
            Today
          </p>
        </CardContent>
      </Card>

      {/* Kitchen Efficiency */}
      <Card className="border border-border/60 bg-card/95 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
          <CardTitle className="text-xs font-medium">Efficiency</CardTitle>
          <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="pb-2">
          <div
            className={cn(
              'text-xl font-bold',
              getEfficiencyColor(stats.efficiency)
            )}
          >
            {stats.efficiency}%
          </div>
          <Progress value={stats.efficiency} className="mt-1 h-1" />
        </CardContent>
      </Card>

      {/* Rush Hour Indicator */}
      <Card className="border border-border/60 bg-card/95 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
          <CardTitle className="text-xs font-medium">Status</CardTitle>
          <Clock
            className={cn(
              'h-3.5 w-3.5',
              stats.isRushHour
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-muted-foreground'
            )}
          />
        </CardHeader>
        <CardContent className="pb-2">
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] h-5 px-2 mb-1 border border-border/60',
              stats.isRushHour
                ? 'text-orange-600 border-orange-300 bg-orange-50/70 dark:bg-orange-950/30 dark:text-orange-300'
                : 'text-muted-foreground'
            )}
          >
            {stats.isRushHour ? 'Rush' : 'Normal'}
          </Badge>
          <p className="text-[10px] text-muted-foreground leading-tight">
            {stats.isRushHour ? 'Peak time' : 'Regular'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
