import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  PhoneCall,
  CreditCard,
  MessageCircle,
  ThumbsUp,
  Clock,
  CheckCircle,
  X,
  User,
  MapPin,
  MessageSquare,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface CallWaiterAlert {
  id: string;
  restaurantId: string;
  tableId: string;
  tableLabel: string;
  type: 'assistance' | 'emergency' | 'bill_request' | 'complaint' | 'feedback';
  urgency: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'acknowledged' | 'in_progress' | 'resolved' | 'ignored';
  message?: string;
  customerName?: string;
  customerPhone?: string;
  assignedWaiterName?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNote?: string;
  responseTimeMinutes?: number;
  createdAt: string;
  updatedAt: string;
}

interface CallWaiterAlertsProps {
  restaurantId: string;
  userId: string;
  userRole: string;
  onAlertsUpdate?: (alerts: CallWaiterAlert[]) => void;
}

const getAlertIcon = (type: string) => {
  switch (type) {
    case 'assistance':
      return <PhoneCall className="w-5 h-5" />;
    case 'emergency':
      return <AlertTriangle className="w-5 h-5" />;
    case 'bill_request':
      return <CreditCard className="w-5 h-5" />;
    case 'complaint':
      return <MessageCircle className="w-5 h-5" />;
    case 'feedback':
      return <ThumbsUp className="w-5 h-5" />;
    default:
      return <PhoneCall className="w-5 h-5" />;
  }
};

const getAlertColor = (type: string, urgency: string) => {
  if (type === 'emergency' || urgency === 'urgent') {
    return 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/20 dark:text-red-100';
  }
  if (urgency === 'high') {
    return 'border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-800 dark:bg-orange-950/20 dark:text-orange-100';
  }
  if (type === 'bill_request') {
    return 'border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950/20 dark:text-green-100';
  }
  return 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-100';
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'pending':
      return <Badge variant="destructive">Pending</Badge>;
    case 'acknowledged':
      return <Badge variant="secondary">Acknowledged</Badge>;
    case 'in_progress':
      return <Badge variant="default">In Progress</Badge>;
    case 'resolved':
      return (
        <Badge variant="outline" className="border-green-300 text-green-700">
          Resolved
        </Badge>
      );
    case 'ignored':
      return (
        <Badge variant="outline" className="border-gray-300 text-gray-700">
          Ignored
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'assistance':
      return 'General Assistance';
    case 'emergency':
      return 'EMERGENCY';
    case 'bill_request':
      return 'Bill Request';
    case 'complaint':
      return 'Complaint';
    case 'feedback':
      return 'Feedback';
    default:
      return type;
  }
};

export const CallWaiterAlerts: React.FC<CallWaiterAlertsProps> = ({
  restaurantId,
  userId,
  userRole,
  onAlertsUpdate,
}) => {
  const [alerts, setAlerts] = useState<CallWaiterAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<CallWaiterAlert | null>(
    null
  );
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');
  const { toast } = useToast();

  const fetchAlerts = async () => {
    try {
      const endpoint =
        userRole === 'waiter'
          ? `/api/call-waiter/waiter/my-calls?limit=50`
          : `/api/call-waiter/restaurant/${restaurantId}?limit=50`;

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch alerts');

      const data = await response.json();
      setAlerts(data);

      if (onAlertsUpdate) {
        onAlertsUpdate(data);
      }
    } catch (error) {
      console.error('Failed to fetch call waiter alerts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load alerts',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    setIsAcknowledging(true);
    try {
      const response = await fetch(`/api/call-waiter/${alertId}/acknowledge`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) throw new Error('Failed to acknowledge alert');

      toast({
        title: 'Alert Acknowledged',
        description: 'You have acknowledged this customer request.',
      });

      fetchAlerts();
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      toast({
        title: 'Error',
        description: 'Failed to acknowledge alert',
        variant: 'destructive',
      });
    } finally {
      setIsAcknowledging(false);
    }
  };

  const resolveAlert = async (alertId: string) => {
    if (!resolutionNote.trim()) {
      toast({
        title: 'Resolution Note Required',
        description: 'Please provide a note about how this was resolved.',
        variant: 'destructive',
      });
      return;
    }

    setIsResolving(true);
    try {
      const response = await fetch(`/api/call-waiter/${alertId}/resolve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          resolutionNote: resolutionNote.trim(),
        }),
      });

      if (!response.ok) throw new Error('Failed to resolve alert');

      toast({
        title: 'Alert Resolved',
        description: 'Customer request has been marked as resolved.',
      });

      setSelectedAlert(null);
      setResolutionNote('');
      fetchAlerts();
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      toast({
        title: 'Error',
        description: 'Failed to resolve alert',
        variant: 'destructive',
      });
    } finally {
      setIsResolving(false);
    }
  };

  useEffect(() => {
    fetchAlerts();

    // Set up polling for new alerts every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);

    return () => clearInterval(interval);
  }, [restaurantId, userId, userRole]);

  const pendingAlerts = alerts.filter((alert) => alert.status === 'pending');
  const activeAlerts = alerts.filter((alert) =>
    ['acknowledged', 'in_progress'].includes(alert.status)
  );
  const resolvedAlerts = alerts.filter((alert) => alert.status === 'resolved');

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Alerts - Highest Priority */}
      {pendingAlerts.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-red-600 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Urgent Alerts ({pendingAlerts.length})
          </h3>
          <div className="space-y-3">
            {pendingAlerts.map((alert, index) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <Card
                  className={`border-2 ${getAlertColor(
                    alert.type,
                    alert.urgency
                  )} shadow-lg`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-1">{getAlertIcon(alert.type)}</div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-base">
                              Table {alert.tableLabel}
                            </h4>
                            <Badge variant="outline">
                              {getTypeLabel(alert.type)}
                            </Badge>
                            {getStatusBadge(alert.status)}
                          </div>

                          {alert.message && (
                            <p className="text-sm bg-white/50 p-2 rounded border">
                              "{alert.message}"
                            </p>
                          )}

                          <div className="flex items-center gap-4 text-sm">
                            {alert.customerName && (
                              <div className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {alert.customerName}
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatDistanceToNow(new Date(alert.createdAt), {
                                addSuffix: true,
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={() => acknowledgeAlert(alert.id)}
                          disabled={isAcknowledging}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Acknowledge
                        </Button>
                        <Button
                          onClick={() => setSelectedAlert(alert)}
                          variant="outline"
                          size="sm"
                        >
                          <MessageSquare className="w-4 h-4 mr-1" />
                          Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Pulsing indicator for urgent alerts */}
                {(alert.type === 'emergency' || alert.urgency === 'urgent') && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div>
          <h3 className="text-lg font-bold  mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Active Alerts ({activeAlerts.length})
          </h3>
          <div className="space-y-3">
            {activeAlerts.map((alert) => (
              <Card key={alert.id} className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">{getAlertIcon(alert.type)}</div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-base">
                            Table {alert.tableLabel}
                          </h4>
                          <Badge variant="outline">
                            {getTypeLabel(alert.type)}
                          </Badge>
                          {getStatusBadge(alert.status)}
                        </div>

                        {alert.message && (
                          <p className="text-sm bg-white/50 p-2 rounded border">
                            "{alert.message}"
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-sm">
                          {alert.acknowledgedAt && (
                            <div className="text-green-600">
                              Acknowledged{' '}
                              {formatDistanceToNow(
                                new Date(alert.acknowledgedAt),
                                { addSuffix: true }
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => setSelectedAlert(alert)}
                      variant="outline"
                      size="sm"
                    >
                      Resolve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recent Resolved Alerts */}
      {resolvedAlerts.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-green-600 mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Recently Resolved ({resolvedAlerts.slice(0, 5).length})
          </h3>
          <div className="space-y-2">
            {resolvedAlerts.slice(0, 5).map((alert) => (
              <Card
                key={alert.id}
                className="border-green-200 bg-green-50/50 opacity-75"
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getAlertIcon(alert.type)}
                      <div>
                        <span className="font-medium">
                          Table {alert.tableLabel}
                        </span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {getTypeLabel(alert.type)}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-green-600">
                      Resolved{' '}
                      {alert.resolvedAt &&
                        formatDistanceToNow(new Date(alert.resolvedAt), {
                          addSuffix: true,
                        })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* No Alerts */}
      {alerts.length === 0 && (
        <Card className="p-8 text-center">
          <div className="text-6xl mb-4">✨</div>
          <h3 className="text-xl font-bold mb-2">All Clear!</h3>
          <p className="text-muted-foreground">
            No customer alerts at the moment.
          </p>
        </Card>
      )}

      {/* Alert Details Dialog */}
      <Dialog
        open={!!selectedAlert}
        onOpenChange={() => setSelectedAlert(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAlert && getAlertIcon(selectedAlert.type)}
              Table {selectedAlert?.tableLabel} -{' '}
              {selectedAlert && getTypeLabel(selectedAlert.type)}
            </DialogTitle>
          </DialogHeader>

          {selectedAlert && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {getTypeLabel(selectedAlert.type)}
                  </Badge>
                  {getStatusBadge(selectedAlert.status)}
                </div>

                {selectedAlert.message && (
                  <div>
                    <Label className="text-sm font-medium">
                      Customer Message:
                    </Label>
                    <p className="text-sm bg-muted p-2 rounded border">
                      "{selectedAlert.message}"
                    </p>
                  </div>
                )}

                {selectedAlert.customerName && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4" />
                    <span>{selectedAlert.customerName}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>
                    Created{' '}
                    {formatDistanceToNow(new Date(selectedAlert.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>

              {selectedAlert.status === 'pending' && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => acknowledgeAlert(selectedAlert.id)}
                    disabled={isAcknowledging}
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Acknowledge
                  </Button>
                </div>
              )}

              {['acknowledged', 'in_progress'].includes(
                selectedAlert.status
              ) && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="resolutionNote">Resolution Note *</Label>
                    <Textarea
                      id="resolutionNote"
                      placeholder="Describe how this was resolved..."
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                  <Button
                    onClick={() => resolveAlert(selectedAlert.id)}
                    disabled={isResolving || !resolutionNote.trim()}
                    className="w-full"
                  >
                    {isResolving ? 'Resolving...' : 'Mark as Resolved'}
                  </Button>
                </div>
              )}

              {selectedAlert.resolutionNote && (
                <div>
                  <Label className="text-sm font-medium">Resolution:</Label>
                  <p className="text-sm bg-green-50 p-2 rounded border">
                    {selectedAlert.resolutionNote}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
