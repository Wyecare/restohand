import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import {
  Clock,
  CheckCircle,
  ChefHat,
  Utensils,
  Receipt,
  Printer,
  Search,
  Filter,
  MoreVertical,
  Eye,
  DollarSign,
  Users,
  Timer,
  RefreshCw,
  Download,
  Play,
  Pause,
  Square,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Import API hooks and types
import {
  useListActiveSessionsQuery,
  useGetSessionDetailsQuery,
  useUpdateSessionStatusMutation,
  useUpdateOrderStatusMutation,
  usePrintSessionReceiptMutation,
  usePrintKitchenTicketMutation,
  useMarkSessionCompleteMutation,
  type TableSession,
  type SessionOrder,
  type SessionOrderItem,
} from '@/store/api/sessionsApi';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import { useBranchContext } from '@/contexts/BranchContext';
import { skipToken } from '@reduxjs/toolkit/query';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getSessionStatusDisplay = (session: TableSession) => {
  const { status, orders, paymentStatus } = session;

  if (status === 'completed') {
    return {
      icon: CheckCircle,
      text: 'Completed',
      color: 'text-green-600',
      bgColor: 'bg-green-50 border-green-200',
      badge: 'success',
    };
  }

  if (paymentStatus === 'paid') {
    return {
      icon: DollarSign,
      text: 'Paid',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-200',
      badge: 'info',
    };
  }

  const readyOrders = orders.filter((order) => order.status === 'ready');
  const preparingOrders = orders.filter(
    (order) => order.status === 'preparing'
  );

  if (readyOrders.length > 0) {
    return {
      icon: Utensils,
      text: `${readyOrders.length} Ready`,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 border-orange-200',
      badge: 'warning',
    };
  }

  if (preparingOrders.length > 0) {
    return {
      icon: ChefHat,
      text: 'Cooking',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 border-yellow-200',
      badge: 'secondary',
    };
  }

  return {
    icon: Clock,
    text: 'Ordered',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 border-gray-200',
    badge: 'outline',
  };
};

const getOrderStatusDisplay = (order: SessionOrder) => {
  switch (order.status) {
    case 'ready':
      return { icon: CheckCircle, text: 'Ready', color: 'text-green-600' };
    case 'preparing':
      return { icon: ChefHat, text: 'Cooking', color: 'text-orange-600' };
    case 'confirmed':
      return { icon: Clock, text: 'Confirmed', color: 'text-blue-600' };
    default:
      return { icon: Clock, text: 'Pending', color: 'text-gray-600' };
  }
};

export default function SessionOrdersPage() {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const { currentBranch } = useBranchContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('active');

  const branchId = currentBranch?._id;
  const queryArgs = restaurantId && branchId
    ? {
        restaurantId,
        branchId,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchTerm,
        page: 1,
        limit: 50,
      }
    : skipToken;

  // API hooks
  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    refetch: refetchSessions,
  } = useListActiveSessionsQuery(queryArgs, { pollingInterval: 30000 });

  const sessionDetailsArgs = restaurantId && branchId && selectedSession
    ? { restaurantId, branchId, sessionId: selectedSession }
    : skipToken;

  const { data: sessionDetails, isLoading: sessionDetailsLoading } =
    useGetSessionDetailsQuery(sessionDetailsArgs, { pollingInterval: 15000 });

  // Mutations
  const [updateSessionStatus] = useUpdateSessionStatusMutation();
  const [updateOrderStatus] = useUpdateOrderStatusMutation();
  const [printSessionReceipt] = usePrintSessionReceiptMutation();
  const [printKitchenTicket] = usePrintKitchenTicketMutation();
  const [markSessionComplete] = useMarkSessionCompleteMutation();

  const sessions = sessionsData?.sessions || [];

  // Filter sessions by tab
  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      switch (activeTab) {
        case 'active':
          return ['active', 'ready'].includes(session.status);
        case 'ready':
          return session.orders.some((order) => order.status === 'ready');
        case 'completed':
          return ['completed', 'paid'].includes(session.status);
        default:
          return true;
      }
    });
  }, [sessions, activeTab]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      refetchSessions();
    }, 15000);
    return () => clearInterval(interval);
  }, [refetchSessions]);

  const handleOrderStatusUpdate = async (orderId: string, status: string) => {
    if (!restaurantId) return;

    try {
      await updateOrderStatus({
        restaurantId,
        orderId,
        status: status as any,
      }).unwrap();
      toast({
        title: 'Status Updated',
        description: `Order status updated to ${status}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update order status',
        variant: 'destructive',
      });
    }
  };

  const handlePrintSessionReceipt = async (sessionId: string) => {
    if (!restaurantId) return;

    try {
      await printSessionReceipt({
        restaurantId,
        sessionId,
        type: 'customer',
      }).unwrap();
      toast({
        title: 'Receipt Printed',
        description: 'Session receipt sent to printer',
      });
    } catch (error) {
      toast({
        title: 'Print Error',
        description: 'Failed to print receipt',
        variant: 'destructive',
      });
    }
  };

  const handlePrintKitchenTicket = async (
    sessionId: string,
    orderId?: string
  ) => {
    if (!restaurantId) return;

    try {
      await printKitchenTicket({
        restaurantId,
        sessionId,
        type: 'kitchen',
        orderId,
      }).unwrap();
      toast({
        title: 'Kitchen Ticket Printed',
        description: 'Ticket sent to kitchen printer',
      });
    } catch (error) {
      toast({
        title: 'Print Error',
        description: 'Failed to print kitchen ticket',
        variant: 'destructive',
      });
    }
  };

  const handleCompleteSession = async (sessionId: string) => {
    if (!restaurantId) return;

    try {
      await markSessionComplete({
        restaurantId,
        sessionId,
      }).unwrap();
      toast({
        title: 'Session Completed',
        description: 'Table session marked as complete',
      });
      setSelectedSession(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to complete session',
        variant: 'destructive',
      });
    }
  };

  if (sessionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Table Sessions</h1>
          <p className="text-gray-600 mt-1">
            Manage active dining sessions and orders
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={() => refetchSessions()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by table number, customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">
            Active Sessions (
            {
              sessions.filter((s) => ['active', 'ready'].includes(s.status))
                .length
            }
            )
          </TabsTrigger>
          <TabsTrigger value="ready">
            Ready Orders (
            {
              sessions.filter((s) => s.orders.some((o) => o.status === 'ready'))
                .length
            }
            )
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed (
            {
              sessions.filter((s) => ['completed', 'paid'].includes(s.status))
                .length
            }
            )
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredSessions.map((session) => {
                const statusDisplay = getSessionStatusDisplay(session);
                const StatusIcon = statusDisplay.icon;

                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedSession === session.id
                          ? 'ring-2 ring-primary'
                          : ''
                      } ${statusDisplay.bgColor}`}
                      onClick={() =>
                        setSelectedSession(
                          selectedSession === session.id ? null : session.id
                        )
                      }
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <StatusIcon
                              className={`w-5 h-5 ${statusDisplay.color}`}
                            />
                            <div>
                              <CardTitle className="text-lg">
                                Table {session.tableNumber}
                              </CardTitle>
                              <p className="text-sm text-gray-500">
                                Started {formatTime(session.startTime)}
                              </p>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrintSessionReceipt(session.id);
                                }}
                              >
                                <Receipt className="w-4 h-4 mr-2" />
                                Print Receipt
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrintKitchenTicket(session.id);
                                }}
                              >
                                <Printer className="w-4 h-4 mr-2" />
                                Kitchen Ticket
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {session.status !== 'completed' && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCompleteSession(session.id);
                                  }}
                                >
                                  <Square className="w-4 h-4 mr-2" />
                                  Complete Session
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Customer Info */}
                        {session.customer.name && (
                          <div className="text-sm text-gray-600 mt-2">
                            <Users className="w-4 h-4 inline mr-1" />
                            {session.customer.name}
                            {session.customer.phone &&
                              ` • ${session.customer.phone}`}
                          </div>
                        )}
                      </CardHeader>

                      <CardContent>
                        {/* Session Summary */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-500">Orders</p>
                            <p className="font-semibold">
                              {session.totals.orderCount}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Total</p>
                            <p className="font-semibold">
                              {formatCurrency(session.totals.totalAmount)}
                            </p>
                          </div>
                        </div>

                        {/* Payment Status */}
                        <div className="flex items-center justify-between mb-4">
                          <Badge
                            variant={
                              session.paymentStatus === 'paid'
                                ? 'default'
                                : session.paymentStatus === 'partial'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {session.paymentStatus === 'paid'
                              ? 'Paid'
                              : session.paymentStatus === 'partial'
                              ? 'Partial'
                              : 'Pending'}
                          </Badge>
                          <Badge variant={statusDisplay.badge as any}>
                            {statusDisplay.text}
                          </Badge>
                        </div>

                        {/* Recent Orders Preview */}
                        {selectedSession === session.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="border-t pt-4 mt-4">
                              <h4 className="font-medium mb-3">
                                Orders in Session
                              </h4>
                              <div className="space-y-3 max-h-64 overflow-y-auto">
                                {session.orders.map((order) => {
                                  const orderStatus =
                                    getOrderStatusDisplay(order);
                                  const OrderIcon = orderStatus.icon;

                                  return (
                                    <div
                                      key={order.id}
                                      className="bg-white rounded-lg p-3 border"
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center space-x-2">
                                          <OrderIcon
                                            className={`w-4 h-4 ${orderStatus.color}`}
                                          />
                                          <span className="font-medium">
                                            #{order.orderNumber}
                                          </span>
                                          <span className="text-sm text-gray-500">
                                            {formatTime(order.createdAt)}
                                          </span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <span className="font-semibold text-sm">
                                            {formatCurrency(order.totalAmount)}
                                          </span>
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0"
                                              >
                                                <MoreVertical className="w-3 h-3" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                              <DropdownMenuItem
                                                onClick={() =>
                                                  handleOrderStatusUpdate(
                                                    order.id,
                                                    'preparing'
                                                  )
                                                }
                                                disabled={
                                                  order.status === 'preparing'
                                                }
                                              >
                                                <Play className="w-3 h-3 mr-1" />
                                                Start Preparing
                                              </DropdownMenuItem>
                                              <DropdownMenuItem
                                                onClick={() =>
                                                  handleOrderStatusUpdate(
                                                    order.id,
                                                    'ready'
                                                  )
                                                }
                                                disabled={
                                                  order.status === 'ready'
                                                }
                                              >
                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                Mark Ready
                                              </DropdownMenuItem>
                                              <DropdownMenuItem
                                                onClick={() =>
                                                  handlePrintKitchenTicket(
                                                    session.id,
                                                    order.id
                                                  )
                                                }
                                              >
                                                <Printer className="w-3 h-3 mr-1" />
                                                Print Ticket
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </div>
                                      </div>

                                      {/* Order Items Summary */}
                                      <div className="text-xs text-gray-600">
                                        {order.items
                                          .slice(0, 2)
                                          .map((item, idx) => (
                                            <span key={idx}>
                                              {item.name} x{item.quantity}
                                              {idx <
                                              Math.min(
                                                1,
                                                order.items.length - 1
                                              )
                                                ? ', '
                                                : ''}
                                            </span>
                                          ))}
                                        {order.items.length > 2 && (
                                          <span>
                                            {' '}
                                            +{order.items.length - 2} more
                                          </span>
                                        )}
                                      </div>

                                      {/* Progress Bar */}
                                      {order.progress > 0 && (
                                        <div className="mt-2">
                                          <div className="flex items-center justify-between text-xs mb-1">
                                            <span className="text-gray-500">
                                              Progress
                                            </span>
                                            <span className="text-gray-700">
                                              {order.progress}%
                                            </span>
                                          </div>
                                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                                            <div
                                              className="bg-primary h-1.5 rounded-full transition-all duration-300"
                                              style={{
                                                width: `${order.progress}%`,
                                              }}
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {/* Quick Actions */}
                        <div className="flex space-x-2 mt-4">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintSessionReceipt(session.id);
                            }}
                          >
                            <Receipt className="w-4 h-4 mr-1" />
                            Receipt
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintKitchenTicket(session.id);
                            }}
                          >
                            <Printer className="w-4 h-4 mr-1" />
                            Kitchen
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {filteredSessions.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Utensils className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No sessions found
              </h3>
              <p className="text-gray-500">
                {activeTab === 'active'
                  ? 'No active sessions at the moment'
                  : activeTab === 'ready'
                  ? 'No orders ready for pickup'
                  : 'No completed sessions'}
              </p>
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
}
