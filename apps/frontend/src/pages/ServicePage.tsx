import { useCallback, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { skipToken } from '@reduxjs/toolkit/query';
import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Input } from '@/components/ui/input';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import {
  useListOrdersQuery,
  useUpdateOrderPaymentMutation,
} from '@/store/api/ordersApi';
import {
  useListRestaurantTablesQuery,
  useGetRestaurantQuery,
} from '@/store/api/restaurantsApi';
import type { Order, RestaurantTable } from '@/store/api/types';
import { useOrdersSocket } from '@/hooks/useOrdersSocket';
import { useToast } from '@/components/ui/use-toast';
import {
  Users,
  ChefHat,
  Clock,
  Search,
  CheckCircle,
} from 'lucide-react';
import WaiterMenuInterface from '@/components/service/WaiterMenuInterface';
import PaymentInterface from '@/components/service/PaymentInterface';
import { ServiceHeader } from '@/components/service/ServiceHeader';

type ViewMode = 'tables' | 'menu' | 'payment';

const getTableStatus = (table: RestaurantTable, orders: Order[]) => {
  const activeOrder = orders.find(
    (order) =>
      order.tableNumber === table.tableNumber &&
      !['completed', 'cancelled'].includes(order.status)
  );

  if (!activeOrder) return 'available';
  if (activeOrder.status === 'ready') return 'ready';
  if (['pending', 'accepted', 'in_progress'].includes(activeOrder.status)) return 'occupied';
  return 'available';
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'available':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'occupied':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'ready':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const ServicePage = () => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const { toast } = useToast();

  const [viewMode, setViewMode] = useState<ViewMode>('tables');
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const orderArgs = restaurantId
    ? { restaurantId, limit: 100, page: 1 }
    : skipToken;

  const { data: ordersData, refetch } = useListOrdersQuery(orderArgs, {
    skip: !restaurantId,
  });
  const [updatePayment] = useUpdateOrderPaymentMutation();

  const tablesArgs = restaurantId
    ? { restaurantId, includeInactive: false }
    : skipToken;
  const { data: tablesData, isLoading: tablesLoading } = useListRestaurantTablesQuery(tablesArgs, {
    skip: !restaurantId,
  });
  const { data: restaurant } = useGetRestaurantQuery(
    restaurantId ?? skipToken,
    { skip: !restaurantId }
  );

  // Memoize orders to prevent unnecessary rerenders
  const orders = useMemo(() => ordersData?.data || [], [ordersData?.data]);

  const filteredTables = useMemo(() => {
    if (!tablesData) return [];
    return tablesData.filter((table) => {
      if (!searchTerm.trim()) return true;
      const search = searchTerm.toLowerCase();
      return (
        table.tableNumber.toLowerCase().includes(search) ||
        table.displayName?.toLowerCase().includes(search) ||
        table.zone?.toLowerCase().includes(search)
      );
    });
  }, [tablesData, searchTerm]);

  const tablesByZone = useMemo(() => {
    const grouped = new Map<string, RestaurantTable[]>();
    filteredTables.forEach((table) => {
      const zone = table.zone || 'No Zone';
      if (!grouped.has(zone)) {
        grouped.set(zone, []);
      }
      grouped.get(zone)?.push(table);
    });
    return grouped;
  }, [filteredTables]);

  const handleTableClick = useCallback((table: RestaurantTable) => {
    const activeOrder = orders.find(
      (order) =>
        order.tableNumber === table.tableNumber &&
        !['completed', 'cancelled'].includes(order.status)
    );

    setSelectedTable(table);
    setSelectedOrder(activeOrder || null);
    setViewMode('menu');
  }, [orders]);

  const handleBackToTables = useCallback(() => {
    setViewMode('tables');
    setSelectedTable(null);
    setSelectedOrder(null);
    refetch();
  }, [refetch]);

  const handlePaymentFlow = useCallback((order: Order) => {
    setSelectedOrder(order);
    setViewMode('payment');
  }, []);

  const handleMarkAsPaid = useCallback(async (orderId: string, method: 'cash' | 'upi') => {
    if (!restaurantId) return;

    try {
      await updatePayment({
        restaurantId,
        orderId,
        paymentStatus: 'paid',
        provider: method === 'upi' ? 'upi' : 'cash',
      }).unwrap();

      toast({
        title: 'Payment confirmed! ✅',
        description: `Order marked as paid via ${method.toUpperCase()}`,
      });

      refetch();
      setViewMode('tables');
      setSelectedOrder(null);
    } catch (error) {
      toast({
        title: 'Failed to mark as paid',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  }, [restaurantId, updatePayment, toast, refetch]);

  const handleSocketEvent = useCallback(() => {
    refetch();
  }, [refetch]);

  useOrdersSocket({ onEvent: handleSocketEvent, enabled: !!restaurantId });

  // Early return after all hooks
  if (!restaurantId) {
    return <Navigate to="/onboarding" replace />;
  }

  if (tablesLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Render different views based on mode
  if (viewMode === 'menu' && selectedTable) {
    return (
      <WaiterMenuInterface
        table={selectedTable}
        existingOrder={selectedOrder}
        restaurant={restaurant}
        onBack={handleBackToTables}
        onPaymentFlow={handlePaymentFlow}
      />
    );
  }

  if (viewMode === 'payment' && selectedOrder) {
    return (
      <PaymentInterface
        order={selectedOrder}
        restaurant={restaurant}
        onBack={() => setViewMode('tables')}
        onMarkAsPaid={handleMarkAsPaid}
      />
    );
  }

  // Tables view
  return (
    <div className="min-h-screen bg-background">
      {/* Service Header */}
      <ServiceHeader
        orders={orders}
        tables={filteredTables}
        restaurant={restaurant}
      />

      <div className="bg-gradient-to-b from-background to-muted/20 p-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto space-y-6"
        >
          {/* Page Title */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight flex items-center justify-center gap-2">
              <Users className="h-8 w-8 text-primary" />
              Table Service
            </h1>
            <p className="text-muted-foreground">
              Take orders and manage payments for your restaurant
            </p>
          </div>

        {/* Search */}
        <Card className="max-w-md mx-auto">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tables..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tables by Zone */}
        <div className="space-y-8">
          {Array.from(tablesByZone.entries()).map(([zone, zoneTables]) => (
            <motion.div
              key={zone}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">{zone}</h2>
                <Badge variant="outline">{zoneTables.length} tables</Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {zoneTables.map((table) => {
                  const status = getTableStatus(table, orders);
                  const activeOrder = orders.find(
                    (order) =>
                      order.tableNumber === table.tableNumber &&
                      !['completed', 'cancelled'].includes(order.status)
                  );

                  return (
                    <motion.div
                      key={table.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Card
                        className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${getStatusColor(status)}`}
                        onClick={() => handleTableClick(table)}
                      >
                        <CardContent className="p-4 text-center space-y-2">
                          <div className="text-2xl font-bold">
                            {table.displayName || table.tableNumber}
                          </div>

                          <div className="space-y-1">
                            <Badge
                              variant={status === 'available' ? 'default' : 'secondary'}
                              className="text-xs capitalize"
                            >
                              {status === 'available' && <CheckCircle className="h-3 w-3 mr-1" />}
                              {status === 'occupied' && <Clock className="h-3 w-3 mr-1" />}
                              {status === 'ready' && <Users className="h-3 w-3 mr-1" />}
                              {status}
                            </Badge>

                            {table.capacity && (
                              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                                <Users className="h-3 w-3" />
                                {table.capacity}
                              </div>
                            )}
                          </div>

                          {activeOrder && (
                            <div className="space-y-1">
                              <div className="text-xs font-medium">#{activeOrder.orderNumber}</div>
                              <div className="text-xs text-muted-foreground">
                                ₹{activeOrder.totalAmount.toFixed(0)}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>

        {filteredTables.length === 0 && (
          <Card className="max-w-md mx-auto text-center p-8">
            <div className="text-4xl mb-4" role="img" aria-label="Search">
              🔍
            </div>
            <h3 className="text-lg font-semibold mb-2">No tables found</h3>
            <p className="text-muted-foreground">Try adjusting your search</p>
          </Card>
        )}
        </motion.div>
      </div>
    </div>
  );
};

export default ServicePage;
