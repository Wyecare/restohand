import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { skipToken } from '@reduxjs/toolkit/query';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Input } from '@/components/ui/input';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import { useUpdateOrderPaymentMutation } from '@/store/api/ordersApi';
import {
  useListServiceTablesQuery,
  useListEnhancedTablesQuery,
  useGetRestaurantQuery,
} from '@/store/api/restaurantsApi';
import type {
  Order,
  RestaurantTable,
  EnhancedRestaurantTable,
} from '@/store/api/types';
import { selectAuthSession } from '@/store/slices/authSlice';
import { useOrdersSocket } from '@/hooks/useOrdersSocket';
import { useToast } from '@/components/ui/use-toast';
import { Users, ChefHat, Clock, Search, CheckCircle } from 'lucide-react';
import WaiterMenuInterface from '@/components/service/WaiterMenuInterface';
import PaymentInterface from '@/components/service/PaymentInterface';
import { ServiceHeader } from '@/components/service/ServiceHeader';
import { useBranchAwareQueries } from '@/hooks/useBranchAwareQuery';

type ViewMode = 'tables' | 'menu' | 'payment';

const getTableStatus = (table: EnhancedRestaurantTable) => {
  // Check table status from enhanced data first
  if (table.currentStatus) {
    const status = table.currentStatus.status;
    switch (status) {
      case 'occupied':
        return 'occupied';
      case 'available':
        return 'available';
      case 'cleaning':
        return 'cleaning';
      case 'reserved':
        return 'reserved';
      default:
        return 'available';
    }
  }

  // Fallback to order-based status (for backward compatibility)
  const activeOrder = table.activeOrder;
  if (!activeOrder) return 'available';
  if (activeOrder.status === 'ready') return 'ready';
  if (['pending', 'accepted', 'in_progress'].includes(activeOrder.status))
    return 'occupied';
  return 'available';
};

const getStatusColor = (status: string, isAssignedToMe = false) => {
  const assignedBorder = isAssignedToMe ? 'border-blue-500 border-2' : '';

  switch (status) {
    case 'available':
      return `bg-green-100 text-green-800 border-green-200 ${assignedBorder}`;
    case 'occupied':
      return `bg-orange-100 text-orange-800 border-orange-200 ${assignedBorder}`;
    case 'ready':
      return `bg-blue-100  border-blue-200 ${assignedBorder}`;
    case 'cleaning':
      return `bg-gray-100 text-gray-800 border-gray-200 ${assignedBorder}`;
    case 'reserved':
      return `bg-purple-100 text-purple-800 border-purple-200 ${assignedBorder}`;
    default:
      return `bg-gray-100 text-gray-800 border-gray-200 ${assignedBorder}`;
  }
};

const ServicePage = () => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const session = useAppSelector(selectAuthSession);
  const { toast } = useToast();

  // Enable branch-aware queries to auto-refetch when branch changes
  useBranchAwareQueries();

  const [viewMode, setViewMode] = useState<ViewMode>('tables');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatePayment] = useUpdateOrderPaymentMutation();

  const {
    data: serviceTablesData,
    isLoading: serviceTablesLoading,
    refetch: refetchServiceTables,
  } = useListServiceTablesQuery(restaurantId ? { restaurantId } : skipToken);

  const {
    data: enhancedTables,
    isLoading: enhancedTablesLoading,
    refetch: refetchEnhancedTables,
  } = useListEnhancedTablesQuery(restaurantId ? { restaurantId } : skipToken);
  console.log('Enhanced Tables:', enhancedTables);

  const { data: restaurant } = useGetRestaurantQuery(
    restaurantId ?? skipToken,
    { skip: !restaurantId }
  );

  const isLoading = serviceTablesLoading || enhancedTablesLoading;
  const tables = enhancedTables ?? [];
  const stats = serviceTablesData?.stats;

  const refetchTables = () => {
    refetchServiceTables();
    refetchEnhancedTables();
  };

  const selectedTable = useMemo(
    () => tables.find((table) => table.id === selectedTableId) ?? null,
    [tables, selectedTableId]
  );

  const selectedOrder = selectedTable?.activeOrder ?? null;

  useEffect(() => {
    if (selectedTableId && !selectedTable && viewMode !== 'tables') {
      setViewMode('tables');
      setSelectedTableId(null);
    }
  }, [selectedTableId, selectedTable, viewMode]);

  const isTableAssignedToMe = (table: EnhancedRestaurantTable): boolean => {
    return table.currentStatus?.assignedServerId === session?.userId;
  };

  const filteredTables = useMemo(() => {
    return tables.filter((table) => {
      if (!searchTerm.trim()) return true;
      const search = searchTerm.toLowerCase();
      return (
        table.tableNumber.toLowerCase().includes(search) ||
        table.displayName?.toLowerCase().includes(search) ||
        table.zone?.toLowerCase().includes(search)
      );
    });
  }, [tables, searchTerm]);

  const { assignedTables, unassignedTables } = useMemo(() => {
    const assigned: EnhancedRestaurantTable[] = [];
    const unassigned: EnhancedRestaurantTable[] = [];

    filteredTables.forEach((table) => {
      if (isTableAssignedToMe(table)) {
        assigned.push(table);
      } else {
        unassigned.push(table);
      }
    });

    return { assignedTables: assigned, unassignedTables: unassigned };
  }, [filteredTables, session?.userId]);

  const assignedTablesByZone = useMemo(() => {
    const grouped = new Map<string, EnhancedRestaurantTable[]>();
    assignedTables.forEach((table) => {
      const zone = table.zone || 'No Zone';
      if (!grouped.has(zone)) {
        grouped.set(zone, []);
      }
      grouped.get(zone)?.push(table);
    });
    return grouped;
  }, [assignedTables]);

  const unassignedTablesByZone = useMemo(() => {
    const grouped = new Map<string, EnhancedRestaurantTable[]>();
    unassignedTables.forEach((table) => {
      const zone = table.zone || 'No Zone';
      if (!grouped.has(zone)) {
        grouped.set(zone, []);
      }
      grouped.get(zone)?.push(table);
    });
    return grouped;
  }, [unassignedTables]);

  const handleTableClick = useCallback((table: EnhancedRestaurantTable) => {
    setSelectedTableId(table.id);
    setViewMode('menu');
  }, []);

  const handleBackToTables = useCallback(() => {
    setViewMode('tables');
    setSelectedTableId(null);
    refetchTables();
  }, [refetchTables]);

  const handlePaymentFlow = useCallback((_order: Order) => {
    setViewMode('payment');
  }, []);

  const handleMarkAsPaid = useCallback(
    async (orderId: string, method: 'cash' | 'upi') => {
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

        refetchTables();
        setViewMode('tables');
        setSelectedTableId(null);
      } catch (error) {
        toast({
          title: 'Failed to mark as paid',
          description: 'Please try again',
          variant: 'destructive',
        });
      }
    },
    [restaurantId, updatePayment, toast, refetchTables]
  );

  const handleSocketEvent = useCallback(() => {
    refetchTables();
  }, [refetchTables]);

  useOrdersSocket({ onEvent: handleSocketEvent, enabled: !!restaurantId });

  // Early return after all hooks
  if (!restaurantId) {
    return <Navigate to="/onboarding" replace />;
  }

  if (isLoading) {
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
        onBack={handleBackToTables}
        onMarkAsPaid={handleMarkAsPaid}
      />
    );
  }

  // Tables view
  return (
    <div className="min-h-screen bg-background">
      {/* Service Header */}
      <ServiceHeader tables={tables} stats={stats} restaurant={restaurant} />

      <div className="bg-gradient-to-b from-background to-muted/20 p-3">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto space-y-4"
        >
          {/* Search Bar */}
          <div className="flex justify-center">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search tables..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9"
                size="sm"
              />
            </div>
          </div>

          {/* Assigned Tables Section */}
          {assignedTables.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold ">My Tables</h2>
                <Badge className="bg-blue-100  text-xs">
                  {assignedTables.length}
                </Badge>
              </div>

              <div className="space-y-3">
                {Array.from(assignedTablesByZone.entries()).map(
                  ([zone, zoneTables]) => (
                    <div key={`assigned-${zone}`} className="space-y-2">
                      {assignedTablesByZone.size > 1 && (
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-gray-600">
                            {zone}
                          </h3>
                          <Badge variant="outline" className="text-xs">
                            {zoneTables.length}
                          </Badge>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-3">
                        {zoneTables.map((table) => {
                          const status = getTableStatus(table);
                          const isAssigned = isTableAssignedToMe(table);
                          const activeOrder = table.activeOrder;

                          return (
                            <Card
                              key={table.id}
                              className={`cursor-pointer transition-all duration-200 hover:shadow-md border-2 ${getStatusColor(
                                status,
                                isAssigned
                              )}`}
                              onClick={() => handleTableClick(table)}
                            >
                              <CardContent className="p-3 text-center space-y-1">
                                <div className="relative">
                                  <div className="text-lg font-bold">
                                    {table.displayName || table.tableNumber}
                                  </div>
                                  {isAssigned && (
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full flex items-center justify-center">
                                      <CheckCircle className="h-2 w-2 text-white" />
                                    </div>
                                  )}
                                </div>

                                <Badge
                                  variant={
                                    status === 'available'
                                      ? 'default'
                                      : 'secondary'
                                  }
                                  className="text-xs capitalize"
                                >
                                  {status === 'available' && (
                                    <CheckCircle className="h-2.5 w-2.5 mr-1" />
                                  )}
                                  {status === 'occupied' && (
                                    <Clock className="h-2.5 w-2.5 mr-1" />
                                  )}
                                  {status === 'ready' && (
                                    <ChefHat className="h-2.5 w-2.5 mr-1" />
                                  )}
                                  {status === 'cleaning' && (
                                    <Users className="h-2.5 w-2.5 mr-1" />
                                  )}
                                  {status === 'reserved' && (
                                    <Clock className="h-2.5 w-2.5 mr-1" />
                                  )}
                                  {status}
                                </Badge>

                                {table.capacity && (
                                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                                    <Users className="h-2.5 w-2.5" />
                                    {table.capacity}
                                  </div>
                                )}

                                {activeOrder && (
                                  <div className="text-xs text-muted-foreground">
                                    ₹{activeOrder.totalAmount.toFixed(0)}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* Other Tables Section */}
          {unassignedTables.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-600">
                  Other Tables
                </h2>
                <Badge variant="outline" className="text-xs">
                  {unassignedTables.length}
                </Badge>
              </div>

              <div className="space-y-3">
                {Array.from(unassignedTablesByZone.entries()).map(
                  ([zone, zoneTables]) => (
                    <div key={`unassigned-${zone}`} className="space-y-2">
                      {unassignedTablesByZone.size > 1 && (
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-gray-600">
                            {zone}
                          </h3>
                          <Badge variant="outline" className="text-xs">
                            {zoneTables.length}
                          </Badge>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-3">
                        {zoneTables.map((table) => {
                          const status = getTableStatus(table);
                          const isAssigned = isTableAssignedToMe(table);
                          const activeOrder = table.activeOrder;

                          return (
                            <Card
                              key={table.id}
                              className={`cursor-pointer transition-all duration-200 hover:shadow-md border-2 ${getStatusColor(
                                status,
                                isAssigned
                              )} opacity-75 hover:opacity-100`}
                              onClick={() => handleTableClick(table)}
                            >
                              <CardContent className="p-3 text-center space-y-1">
                                <div className="text-lg font-bold">
                                  {table.displayName || table.tableNumber}
                                </div>

                                <Badge
                                  variant={
                                    status === 'available'
                                      ? 'default'
                                      : 'secondary'
                                  }
                                  className="text-xs capitalize"
                                >
                                  {status === 'available' && (
                                    <CheckCircle className="h-2.5 w-2.5 mr-1" />
                                  )}
                                  {status === 'occupied' && (
                                    <Clock className="h-2.5 w-2.5 mr-1" />
                                  )}
                                  {status === 'ready' && (
                                    <ChefHat className="h-2.5 w-2.5 mr-1" />
                                  )}
                                  {status === 'cleaning' && (
                                    <Users className="h-2.5 w-2.5 mr-1" />
                                  )}
                                  {status === 'reserved' && (
                                    <Clock className="h-2.5 w-2.5 mr-1" />
                                  )}
                                  {status}
                                </Badge>

                                {table.capacity && (
                                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                                    <Users className="h-2.5 w-2.5" />
                                    {table.capacity}
                                  </div>
                                )}

                                {activeOrder && (
                                  <div className="text-xs text-muted-foreground">
                                    ₹{activeOrder.totalAmount.toFixed(0)}
                                  </div>
                                )}

                                {table.currentStatus?.assignedServerName && (
                                  <div className="text-xs text-gray-500 truncate">
                                    {table.currentStatus.assignedServerName}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {assignedTables.length === 0 && unassignedTables.length === 0 && (
            <Card className="max-w-md mx-auto text-center p-8">
              <div className="text-4xl mb-4" role="img" aria-label="Search">
                {searchTerm ? '🔍' : '📋'}
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? 'No tables found' : 'No tables available'}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm
                  ? 'Try adjusting your search terms'
                  : 'Contact your manager to set up tables for your restaurant'}
              </p>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ServicePage;
