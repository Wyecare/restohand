import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FloorPlanStatusOverview,
  TableStatus,
  TableStatusType,
  TablePriority,
} from '@/store/api/floorPlansApi';
import {
  Users,
  DollarSign,
  Clock,
  TrendingUp,
  AlertTriangle,
  Calendar,
  ChefHat,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface FloorPlanOverviewProps {
  overview: FloorPlanStatusOverview;
  tableStatuses: TableStatus[];
  onTableSelect: (tableId: string) => void;
}

export const FloorPlanOverview: React.FC<FloorPlanOverviewProps> = ({
  overview,
  tableStatuses,
  onTableSelect,
}) => {
  const occupancyRate = (overview.occupiedSeats / overview.totalSeats) * 100;
  const tableUtilization = (overview.occupiedTables / overview.totalTables) * 100;

  const urgentTables = tableStatuses.filter(
    (table) => table.priority === TablePriority.Urgent || table.status === TableStatusType.NeedsAttention
  );

  const longWaitingTables = tableStatuses.filter(
    (table) =>
      table.occupiedSince &&
      Date.now() - new Date(table.occupiedSince).getTime() > 2 * 60 * 60 * 1000 // 2+ hours
  );

  const getStatusIcon = (status: TableStatusType) => {
    switch (status) {
      case TableStatusType.Available:
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case TableStatusType.Occupied:
        return <Users className="w-4 h-4 text-red-600" />;
      case TableStatusType.Reserved:
        return <Calendar className="w-4 h-4 text-yellow-600" />;
      case TableStatusType.NeedsAttention:
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case TableStatusType.Cleaning:
        return <ChefHat className="w-4 h-4 text-blue-600" />;
      case TableStatusType.OutOfOrder:
        return <XCircle className="w-4 h-4 text-gray-600" />;
      default:
        return <CheckCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: TablePriority) => {
    switch (priority) {
      case TablePriority.Urgent:
        return 'bg-red-100 text-red-800 border-red-200';
      case TablePriority.High:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case TablePriority.Normal:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case TablePriority.Low:
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-blue-100">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overview.occupiedTables}/{overview.totalTables}</p>
                <p className="text-sm text-muted-foreground">Tables Occupied</p>
              </div>
            </div>
            <Progress value={tableUtilization} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-green-100">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">${overview.todayRevenue.toFixed(0)}</p>
                <p className="text-sm text-muted-foreground">Today's Revenue</p>
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {overview.todayOrders} orders completed
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-purple-100">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overview.averageTurnover.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">Avg Turnover</p>
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Tables per day
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-orange-100">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{urgentTables.length}</p>
                <p className="text-sm text-muted-foreground">Needs Attention</p>
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Urgent tables
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seat Utilization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Seat Utilization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {overview.occupiedSeats} of {overview.totalSeats} seats occupied
              </span>
              <Badge variant={occupancyRate > 80 ? 'destructive' : occupancyRate > 60 ? 'default' : 'secondary'}>
                {occupancyRate.toFixed(0)}%
              </Badge>
            </div>
            <Progress value={occupancyRate} className="h-2" />
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-green-600">{overview.availableTables}</div>
                <div className="text-muted-foreground">Available</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-yellow-600">{overview.reservedTables}</div>
                <div className="text-muted-foreground">Reserved</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-red-600">{overview.occupiedTables}</div>
                <div className="text-muted-foreground">Occupied</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tables Needing Attention */}
        {urgentTables.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                Urgent Attention Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {urgentTables.map((table) => (
                    <div
                      key={table.id}
                      className="p-3 rounded-lg border bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => onTableSelect(table.tableId)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(table.status)}
                          <span className="font-medium">Table {table.tableLabel}</span>
                        </div>
                        <Badge className={cn('text-xs', getPriorityColor(table.priority))}>
                          {table.priority}
                        </Badge>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {table.statusNote || `Status: ${table.status.replace('_', ' ')}`}
                      </div>
                      {table.occupiedSince && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Occupied {formatDistanceToNow(new Date(table.occupiedSince), { addSuffix: true })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Long Waiting Tables */}
        {longWaitingTables.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Long Wait Times
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {longWaitingTables.map((table) => (
                    <div
                      key={table.id}
                      className="p-3 rounded-lg border bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => onTableSelect(table.tableId)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-600" />
                          <span className="font-medium">Table {table.tableLabel}</span>
                        </div>
                        {table.currentPartySize && (
                          <Badge variant="outline">
                            {table.currentPartySize} guests
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Occupied {formatDistanceToNow(new Date(table.occupiedSince!), { addSuffix: true })}
                      </div>
                      {table.currentOrders.length > 0 && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {table.currentOrders.length} active order(s)
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* All Tables Quick View */}
        <Card className={longWaitingTables.length === 0 ? 'lg:col-span-2' : ''}>
          <CardHeader>
            <CardTitle className="text-lg">All Tables</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {tableStatuses.map((table) => (
                  <div
                    key={table.id}
                    className="p-2 rounded-md border bg-muted/30 cursor-pointer hover:bg-muted/60 transition-colors"
                    onClick={() => onTableSelect(table.tableId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(table.status)}
                        <span className="text-sm font-medium">Table {table.tableLabel}</span>
                      </div>
                      {table.currentPartySize && (
                        <Badge variant="outline" className="text-xs">
                          {table.currentPartySize}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {table.status.replace('_', ' ')} • ${table.dailyMetrics.totalRevenue.toFixed(0)} today
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};