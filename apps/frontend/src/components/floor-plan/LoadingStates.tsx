import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { cn } from '@/lib/utils';

// Floor Plan Canvas Loading
export const FloorPlanCanvasLoading: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('p-4', className)}>
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <Skeleton className="h-96 w-full rounded-lg" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <LoadingSpinner className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading floor plan...</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

// Table Status Panel Loading
export const TableStatusPanelLoading: React.FC<{ className?: string }> = ({ className }) => (
  <Card className={cn('h-full rounded-none border-0 border-l', className)}>
    <CardHeader className="pb-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-12" />
      </div>
    </CardHeader>
    <CardContent className="space-y-6">
      {/* Quick Actions */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>

      {/* Table Details */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Skeleton className="h-3 w-12 mb-1" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div>
            <Skeleton className="h-3 w-8 mb-1" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="text-center p-2 rounded-md bg-muted/50">
              <Skeleton className="h-5 w-8 mx-auto mb-1" />
              <Skeleton className="h-3 w-12 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </CardContent>
  </Card>
);

// Overview Stats Loading
export const OverviewStatsLoading: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
    {Array.from({ length: 4 }).map((_, i) => (
      <Card key={i}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-md" />
            <div className="flex-1">
              <Skeleton className="h-6 w-16 mb-1" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-3 w-20 mt-2" />
        </CardContent>
      </Card>
    ))}
  </div>
);

// Analytics Chart Loading
export const AnalyticsChartLoading: React.FC<{ className?: string; height?: number }> = ({
  className,
  height = 300
}) => (
  <Card className={className}>
    <CardHeader>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="relative">
        <Skeleton className={`w-full rounded-lg`} style={{ height }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner className="w-6 h-6 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Loading chart...</p>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Table List Loading
export const TableListLoading: React.FC<{ className?: string; count?: number }> = ({
  className,
  count = 6
}) => (
  <div className={cn('space-y-2', className)}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="p-3 rounded-lg border bg-muted/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-5 w-12" />
        </div>
        <Skeleton className="h-3 w-24 mt-1" />
      </div>
    ))}
  </div>
);

// Floor Plan List Loading
export const FloorPlanListLoading: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('space-y-2', className)}>
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="p-2 rounded-md border">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton className="h-3 w-16 mt-1" />
      </div>
    ))}
  </div>
);

// Heat Map Loading
export const HeatMapLoading: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('space-y-6', className)}>
    {/* Controls */}
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-48" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="text-center">
              <Skeleton className="h-5 w-12 mx-auto mb-1" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Heat Map Canvas */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Skeleton className="h-80 w-full rounded-lg" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <LoadingSpinner className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Generating heat map...</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Side Panel */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-6 h-6 rounded-full" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
);

// Connection Status Loading
export const ConnectionStatusLoading: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
    <LoadingSpinner className="w-4 h-4" />
    <span>Connecting...</span>
  </div>
);

// Alerts Loading
export const AlertsLoading: React.FC<{ className?: string }> = ({ className }) => (
  <Card className={cn('rounded-none border-x-0 border-b-0', className)}>
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3 flex-1">
              <Skeleton className="w-4 h-4" />
              <Skeleton className="h-4 w-20" />
              <div className="flex-1">
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

// Full Page Loading
export const FloorPlanFullPageLoading: React.FC = () => (
  <div className="h-screen flex flex-col bg-background">
    {/* Header */}
    <div className="flex items-center justify-between p-4 border-b bg-card">
      <div>
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>

    <div className="flex-1 flex overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 p-4">
        <div className="relative h-full">
          <Skeleton className="h-full w-full rounded-lg" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <LoadingSpinner className="w-12 h-12 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Loading Floor Plan Dashboard</h3>
              <p className="text-muted-foreground">Setting up your interactive floor plan...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);