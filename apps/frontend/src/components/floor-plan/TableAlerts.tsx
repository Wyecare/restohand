import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TableStatusType } from '@/store/api/floorPlansApi';
import {
  AlertTriangle,
  Clock,
  DollarSign,
  Utensils,
  X,
  CheckCircle,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface TableAlert {
  tableId: string;
  tableLabel: string;
  type:
    | 'needs-attention'
    | 'order-ready'
    | 'payment-pending'
    | 'cleaning-required';
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  timestamp: Date;
}

interface TableAlertsProps {
  alerts: TableAlert[];
  onAlertAction: (tableId: string, status: TableStatusType) => Promise<void>;
}

export const TableAlerts: React.FC<TableAlertsProps> = ({
  alerts,
  onAlertAction,
}) => {
  const getAlertIcon = (type: TableAlert['type']) => {
    switch (type) {
      case 'needs-attention':
        return <AlertTriangle className="w-4 h-4" />;
      case 'order-ready':
        return <Bell className="w-4 h-4" />;
      case 'payment-pending':
        return <DollarSign className="w-4 h-4" />;
      case 'cleaning-required':
        return <Utensils className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getAlertColor = (priority: TableAlert['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'border-red-200 bg-red-50 text-red-800';
      case 'high':
        return 'border-orange-200 bg-orange-50 text-orange-800';
      case 'normal':
        return 'border-blue-200 bg-blue-50 ';
      case 'low':
        return 'border-gray-200 bg-gray-50 text-gray-800';
      default:
        return 'border-gray-200 bg-gray-50 text-gray-800';
    }
  };

  const getPriorityColor = (priority: TableAlert['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-blue-100 ';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleResolveAlert = async (alert: TableAlert) => {
    let newStatus: TableStatusType;

    switch (alert.type) {
      case 'needs-attention':
        newStatus = TableStatusType.Occupied;
        break;
      case 'order-ready':
        newStatus = TableStatusType.Occupied;
        break;
      case 'payment-pending':
        newStatus = TableStatusType.Available;
        break;
      case 'cleaning-required':
        newStatus = TableStatusType.Cleaning;
        break;
      default:
        newStatus = TableStatusType.Available;
    }

    await onAlertAction(alert.tableId, newStatus);
  };

  if (alerts.length === 0) {
    return null;
  }

  // Sort alerts by priority and timestamp
  const sortedAlerts = [...alerts].sort((a, b) => {
    const priorityOrder = { urgent: 3, high: 2, normal: 1, low: 0 };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return (
    <Card className="rounded-none border-x-0 border-b-0">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Active Alerts ({alerts.length})
          </h3>
        </div>

        <ScrollArea className="h-24">
          <div className="space-y-2">
            {sortedAlerts.map((alert, index) => (
              <div
                key={`${alert.tableId}-${index}`}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border',
                  getAlertColor(alert.priority)
                )}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center gap-2">
                    {getAlertIcon(alert.type)}
                    <span className="font-medium">
                      Table {alert.tableLabel}
                    </span>
                  </div>

                  <div className="flex-1">
                    <p className="text-sm">{alert.message}</p>
                    <p className="text-xs opacity-70">
                      {formatDistanceToNow(new Date(alert.timestamp), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>

                  <Badge
                    className={cn('text-xs', getPriorityColor(alert.priority))}
                  >
                    {alert.priority}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 ml-3">
                  <Button
                    size="sm"
                    onClick={() => handleResolveAlert(alert)}
                    className="h-7 px-2 text-xs"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Resolve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
