import React from 'react';
import { Clock, TrendingUp, AlertTriangle, CheckCircle, Timer, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Order } from '@/store/api/types';

interface KitchenStatsProps {
  orders: Order[];
}

export function KitchenStats({ orders }: KitchenStatsProps) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const todaysOrders = orders.filter(order =>
    order.createdAt && new Date(order.createdAt) >= todayStart
  );

  const stats = React.useMemo(() => {
    const pending = orders.filter(order => order.status === 'pending').length;
    const inProgress = orders.filter(order => order.status === 'in_progress').length;
    const ready = orders.filter(order => order.status === 'ready').length;
    const completed = todaysOrders.filter(order => order.status === 'completed').length;

    const urgent = orders.filter(order => {
      if (!order.createdAt || order.status === 'ready' || order.status === 'completed') return false;
      const minutes = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
      return minutes >= 15;
    }).length;

    const warning = orders.filter(order => {
      if (!order.createdAt || order.status === 'ready' || order.status === 'completed') return false;
      const minutes = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
      return minutes >= 10 && minutes < 15;
    }).length;

    // Calculate average prep time for completed orders today
    const completedWithTimes = todaysOrders.filter(order =>
      order.status === 'completed' && order.createdAt && order.paidAt
    );

    const avgPrepTime = completedWithTimes.length > 0
      ? completedWithTimes.reduce((acc, order) => {
          const created = new Date(order.createdAt!).getTime();
          const finished = new Date(order.paidAt!).getTime();
          return acc + (finished - created);
        }, 0) / completedWithTimes.length / 60000
      : 0;

    // Calculate kitchen efficiency (orders completed vs started)
    const startedToday = todaysOrders.filter(order =>
      ['accepted', 'in_progress', 'ready', 'completed'].includes(order.status)
    ).length;

    const efficiency = startedToday > 0 ? (completed / startedToday) * 100 : 0;

    // Calculate rush hour detection
    const currentHour = now.getHours();
    const isRushHour = currentHour >= 12 && currentHour <= 14 || currentHour >= 19 && currentHour <= 21;

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
      totalActive: pending + inProgress + ready
    };
  }, [orders, todaysOrders]);

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 90) return 'text-green-600';
    if (efficiency >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPrepTimeColor = (minutes: number) => {
    if (minutes <= 15) return 'text-green-600';
    if (minutes <= 25) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
      {/* Active Orders */}
      <Card className="border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
          <BarChart3 className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{stats.totalActive}</div>
          <p className="text-xs text-muted-foreground">
            {stats.pending} pending • {stats.inProgress} cooking • {stats.ready} ready
          </p>
        </CardContent>
      </Card>

      {/* Urgent Orders */}
      <Card className={stats.urgent > 0 ? "border-destructive/50 bg-destructive/5" : ""}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Urgent Orders</CardTitle>
          <AlertTriangle className={`h-4 w-4 ${stats.urgent > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${stats.urgent > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
            {stats.urgent}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.warning} warnings • over 15 min
          </p>
        </CardContent>
      </Card>

      {/* Average Prep Time */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Prep Time</CardTitle>
          <Timer className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getPrepTimeColor(stats.avgPrepTime)}`}>
            {stats.avgPrepTime}m
          </div>
          <p className="text-xs text-muted-foreground">
            Today's average
          </p>
        </CardContent>
      </Card>

      {/* Completed Today */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <p className="text-xs text-muted-foreground">
            Orders today
          </p>
        </CardContent>
      </Card>

      {/* Kitchen Efficiency */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Efficiency</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getEfficiencyColor(stats.efficiency)}`}>
            {stats.efficiency}%
          </div>
          <Progress value={stats.efficiency} className="mt-2 h-1" />
        </CardContent>
      </Card>

      {/* Rush Hour Indicator */}
      <Card className={stats.isRushHour ? "border-orange-500/50 bg-orange-50/50 dark:bg-orange-900/10" : ""}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Status</CardTitle>
          <Clock className={`h-4 w-4 ${stats.isRushHour ? 'text-orange-500' : 'text-muted-foreground'}`} />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge
              variant={stats.isRushHour ? "destructive" : "secondary"}
              className="text-xs"
            >
              {stats.isRushHour ? "Rush Hour" : "Normal"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.isRushHour ? "Peak dining time" : "Regular service"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}