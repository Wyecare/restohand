import React, { useState, useMemo, useEffect } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
import { Navigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Stage, Layer, Text } from 'react-konva';
import { SimpleTableShape } from '@/components/command-center/SimpleTableShape';
import { ZoneOutline } from '@/components/command-center/ZoneOutline';
import { TableDetailsPanel } from '@/components/command-center/TableDetailsPanel';
import { TimelineView } from '@/components/command-center/TimelineView';
import { ReservationDialog } from '@/components/command-center/ReservationDialog';
import {
  Users,
  DollarSign,
  Activity,
  Clock,
  Calendar,
  Table2,
  MapPin,
  Filter,
} from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import {
  useListEnhancedRestaurantTablesQuery,
  useGetTableStatusStatsQuery,
  useUpdateTableStatusMutation,
  useUpdateRestaurantTableMutation,
  useGetZonesQuery,
} from '@/store/api/restaurantsApi';
import type { EnhancedRestaurantTable, TableStatus } from '@/store/api/types';
import { TableStatusType } from '@/store/api/types';

const CommandCenterPage = () => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();
  const [selectedTable, setSelectedTable] =
    useState<EnhancedRestaurantTable | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeView, setActiveView] = useState<'floor' | 'timeline'>('floor');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reservationDialogOpen, setReservationDialogOpen] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<Date | undefined>();
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  const queryArgs = restaurantId ? { restaurantId } : skipToken;

  const {
    data: tables = [],
    isLoading: tablesLoading,
    refetch: refetchTables,
  } = useListEnhancedRestaurantTablesQuery(queryArgs, {
    skip: !restaurantId,
    pollingInterval: 30000, // Refresh every 30 seconds
  });

  const { data: stats } = useGetTableStatusStatsQuery(queryArgs, {
    skip: !restaurantId,
    pollingInterval: 15000, // Refresh stats every 15 seconds
  });

  const { data: zonesData } = useGetZonesQuery(queryArgs, {
    skip: !restaurantId,
  });

  const [updateTableStatus, { isLoading: isUpdating }] =
    useUpdateTableStatusMutation();
  const [updateTable] = useUpdateRestaurantTableMutation();

  const zones = zonesData?.zones || [];

  // Group tables by zone
  const tablesByZone = useMemo(() => {
    const grouped = new Map<string, typeof tables>();

    tables.forEach((table) => {
      const zone = table.zone || 'Unassigned';
      if (!grouped.has(zone)) {
        grouped.set(zone, []);
      }
      const zoneList = grouped.get(zone);
      if (zoneList) {
        zoneList.push(table);
      }
    });

    return grouped;
  }, [tables]);

  // Simple zone dimensions calculator
  const calculateZoneDimensions = (tableCount: number) => {
    if (tableCount === 0) return { width: 400, height: 200, tablesPerRow: 5 };

    const tablesPerRow = 5;
    const rows = Math.ceil(tableCount / tablesPerRow);
    const tableSize = 60;
    const padding = 30;
    const spacing = 15;

    const width = 400;
    const height = Math.max(200, 60 + rows * (tableSize + spacing) + padding);

    return { width, height, tablesPerRow };
  };

  const entranceTextColor = useMemo(() => {
    return resolvedTheme === 'dark' ? '#FFFFFF' : '#000000';
  }, [resolvedTheme]);

  // Auto-refresh timer for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      refetchTables();
    }, 10000); // Refresh every 10 seconds for real-time feel

    return () => clearInterval(interval);
  }, [refetchTables]);

  if (!restaurantId) {
    return <Navigate to="/onboarding" replace />;
  }

  const handleTableClick = (table: EnhancedRestaurantTable) => {
    setSelectedTable(table);
    setIsPanelOpen(true);
  };

  const handleStatusUpdate = async (
    table: EnhancedRestaurantTable,
    status: TableStatusType,
    additionalData?: Partial<TableStatus>
  ) => {
    if (!restaurantId) return;

    try {
      await updateTableStatus({
        restaurantId,
        tableId: table.id,
        body: {
          status,
          ...additionalData,
        },
      }).unwrap();

      toast({
        title: `Table ${table.tableNumber} status updated to ${status}`,
      });
      refetchTables();
    } catch (error) {
      toast({
        title: 'Failed to update table status',
        description:
          error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleReservationCreate = async (
    table: EnhancedRestaurantTable,
    reservationData: {
      customerName: string;
      customerPhone: string;
      partySize: number;
      reservationTime: Date;
      estimatedDuration: number;
      notes?: string;
      specialRequests?: string;
    }
  ) => {
    if (!restaurantId) return;

    try {
      const reservedUntil = new Date(
        reservationData.reservationTime.getTime() +
          reservationData.estimatedDuration * 60 * 1000
      );

      await updateTableStatus({
        restaurantId,
        tableId: table.id,
        body: {
          status: TableStatusType.Reserved,
          currentPartySize: reservationData.partySize,
          reservationCustomerName: reservationData.customerName,
          reservationCustomerPhone: reservationData.customerPhone,
          reservedFrom: reservationData.reservationTime.toISOString(),
          reservedUntil: reservedUntil.toISOString(),
          reservationEstimatedDuration: reservationData.estimatedDuration,
          reservationNotes: reservationData.notes,
          reservationSpecialRequests: reservationData.specialRequests,
        },
      }).unwrap();

      toast({
        title: 'Reservation Created',
        description: `Table ${table.tableNumber} reserved for ${reservationData.customerName}`,
      });

      refetchTables();
    } catch (error) {
      toast({
        title: 'Failed to Create Reservation',
        description:
          error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
      throw error; // Re-throw to let the dialog handle it
    }
  };

  const getStatusColor = (table: EnhancedRestaurantTable): string => {
    if (!table.currentStatus) return '#22c55e'; // green - available
    return getStatusColorFromStatus(table.currentStatus);
  };

  const getStatusColorFromStatus = (status: TableStatus): string => {
    switch (status.status) {
      case 'available':
        return '#22c55e'; // green
      case 'reserved':
        return '#3b82f6'; // blue
      case 'cleaning':
        return '#6b7280'; // grey
      case 'occupied': {
        const occupiedTime = status.occupiedDuration || 0;
        if (occupiedTime < 3600000) return '#eab308'; // yellow < 1hr
        if (occupiedTime < 7200000) return '#f97316'; // orange 1-2hr
        return '#ef4444'; // red > 2hr
      }
      default:
        return '#6b7280'; // grey
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '₹0';
    return `₹${amount.toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tables</CardTitle>
            <Table2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTables || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupied</CardTitle>
            <Users className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.occupiedTables || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg. {formatDuration(stats?.averageOccupancyTime)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.availableTables || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reserved</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.reservedTables || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">Active orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Command Center Views */}
      <Tabs
        value={activeView}
        onValueChange={(value) => setActiveView(value as 'floor' | 'timeline')}
      >
        <div className="flex items-center justify-between">
          <TabsList className="grid w-fit grid-cols-2">
            <TabsTrigger value="floor" className="flex items-center gap-2">
              Floor View
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Timeline View
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Floor View Tab */}
        <TabsContent value="floor">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Live Floor View</CardTitle>
                  <CardDescription>
                    Real-time table status with color coding. Click tables for
                    details.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  {/* Zone Filter */}
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <Select
                      value={selectedZone || 'all'}
                      onValueChange={(value) =>
                        setSelectedZone(value === 'all' ? null : value)
                      }
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by zone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Zones</SelectItem>
                        {zones.map((zone) => (
                          <SelectItem key={zone.id} value={zone.name}>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3" />
                              {zone.name}
                            </div>
                          </SelectItem>
                        ))}
                        <SelectItem value="Unassigned">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3" />
                            Unassigned
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Status Legend */}
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Available</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span>&lt;1hr</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span>1-2hr</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span>&gt;2hr</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span>Reserved</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                      <span>Cleaning</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div
                className="border rounded-lg bg-muted/10 overflow-auto relative"
                style={{ height: '600px' }}
              >
                {tablesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">
                        Loading tables...
                      </p>
                    </div>
                  </div>
                ) : (
                  (() => {
                    // Calculate required stage height
                    const stageHeight = (() => {
                      if (selectedZone) {
                        const zoneTables = tablesByZone.get(selectedZone) || [];
                        const { height } = calculateZoneDimensions(
                          zoneTables.length
                        );
                        return Math.max(600, 50 + height + 100);
                      } else {
                        // Calculate for all zones layout
                        const zoneEntries = Array.from(tablesByZone.entries());
                        const stageWidth = 1000;
                        const zoneSpacing = 20;

                        let currentX = zoneSpacing;
                        let currentY = zoneSpacing;
                        let currentRowHeight = 0;
                        let maxY = 0;

                        zoneEntries.forEach(([, zoneTables]) => {
                          const { width, height } = calculateZoneDimensions(
                            zoneTables.length
                          );

                          if (
                            currentX + width > stageWidth - zoneSpacing &&
                            currentX > zoneSpacing
                          ) {
                            currentX = zoneSpacing;
                            currentY += currentRowHeight + zoneSpacing;
                            currentRowHeight = 0;
                          }

                          currentX += width + zoneSpacing;
                          currentRowHeight = Math.max(currentRowHeight, height);
                          maxY = Math.max(maxY, currentY + height);
                        });

                        return Math.max(600, maxY + 100);
                      }
                    })();

                    return (
                      <Stage width={1200} height={stageHeight}>
                        <Layer>
                          {/* Zone Outlines and Tables */}
                          {selectedZone
                            ? // Single zone view
                              (() => {
                                const zoneTables =
                                  tablesByZone.get(selectedZone) || [];
                                const zoneColors = [
                                  '#3b82f6',
                                  '#10b981',
                                  '#f59e0b',
                                  '#ef4444',
                                  '#8b5cf6',
                                ];
                                const zoneColor = zoneColors[0];
                                const { width, height, tablesPerRow } =
                                  calculateZoneDimensions(zoneTables.length);

                                const zoneX = Math.max(50, (1000 - width) / 2);
                                const zoneY = 50;
                                const tableSize = 60;
                                const spacing = 15;
                                const padding = 30;

                                return (
                                  <>
                                    {/* Zone Outline */}
                                    <ZoneOutline
                                      zoneName={selectedZone}
                                      tables={zoneTables}
                                      x={zoneX}
                                      y={zoneY}
                                      width={width}
                                      height={height}
                                      color={zoneColor}
                                      isDarkMode={resolvedTheme === 'dark'}
                                    />

                                    {/* Tables in Zone - Simple Grid */}
                                    {zoneTables.map((table, index) => {
                                      const tableRow = Math.floor(
                                        index / tablesPerRow
                                      );
                                      const tableCol = index % tablesPerRow;
                                      const x =
                                        zoneX +
                                        padding +
                                        tableCol * (tableSize + spacing);
                                      const y =
                                        zoneY +
                                        60 +
                                        tableRow * (tableSize + spacing);

                                      return (
                                        <SimpleTableShape
                                          key={table.id}
                                          table={{
                                            id: table.id,
                                            x,
                                            y,
                                            width: tableSize,
                                            height: tableSize,
                                            rotation: 0,
                                            shape: 'rectangle',
                                            label: table.tableNumber,
                                            capacity: table.capacity || 4,
                                            zone: table.zone,
                                            color: getStatusColor(table),
                                          }}
                                          status={table.currentStatus}
                                          isSelected={
                                            selectedTable?.id === table.id
                                          }
                                          onSelect={() =>
                                            handleTableClick(table)
                                          }
                                          scale={1}
                                          isDraggable={false}
                                          onDragEnd={() => {}}
                                          showStatusIndicators={true}
                                        />
                                      );
                                    })}
                                  </>
                                );
                              })()
                            : // All zones view
                              (() => {
                                const zoneColors = [
                                  '#3b82f6',
                                  '#10b981',
                                  '#f59e0b',
                                  '#ef4444',
                                  '#8b5cf6',
                                  '#06b6d4',
                                ];
                                const zoneEntries = Array.from(
                                  tablesByZone.entries()
                                );
                                const zonesPerRow = 3;
                                const zoneSpacing = 30;

                                return (
                                  <>
                                    {zoneEntries.map(
                                      ([zoneName, zoneTables], zoneIndex) => {
                                        const { width, height, tablesPerRow } =
                                          calculateZoneDimensions(
                                            zoneTables.length
                                          );
                                        const zoneColor =
                                          zoneColors[
                                            zoneIndex % zoneColors.length
                                          ];

                                        // Simple grid layout for zones
                                        const row = Math.floor(
                                          zoneIndex / zonesPerRow
                                        );
                                        const col = zoneIndex % zonesPerRow;
                                        const zoneX =
                                          col * (width + zoneSpacing) + 30;
                                        const zoneY =
                                          row * (height + zoneSpacing) + 30;

                                        const tableSize = 60;
                                        const spacing = 15;
                                        const padding = 30;

                                        return (
                                          <React.Fragment key={zoneName}>
                                            {/* Zone Outline */}
                                            <ZoneOutline
                                              zoneName={zoneName}
                                              tables={zoneTables}
                                              x={zoneX}
                                              y={zoneY}
                                              width={width}
                                              height={height}
                                              color={zoneColor}
                                              isDarkMode={
                                                resolvedTheme === 'dark'
                                              }
                                            />

                                            {/* Tables in Zone - Simple Grid */}
                                            {zoneTables.map(
                                              (table, tableIndex) => {
                                                const tableRow = Math.floor(
                                                  tableIndex / tablesPerRow
                                                );
                                                const tableCol =
                                                  tableIndex % tablesPerRow;
                                                const x =
                                                  zoneX +
                                                  padding +
                                                  tableCol *
                                                    (tableSize + spacing);
                                                const y =
                                                  zoneY +
                                                  60 +
                                                  tableRow *
                                                    (tableSize + spacing);

                                                return (
                                                  <SimpleTableShape
                                                    key={table.id}
                                                    table={{
                                                      id: table.id,
                                                      x,
                                                      y,
                                                      width: tableSize,
                                                      height: tableSize,
                                                      rotation: 0,
                                                      shape: 'rectangle',
                                                      label: table.tableNumber,
                                                      capacity:
                                                        table.capacity || 4,
                                                      zone: table.zone,
                                                      color:
                                                        getStatusColor(table),
                                                    }}
                                                    status={table.currentStatus}
                                                    isSelected={
                                                      selectedTable?.id ===
                                                      table.id
                                                    }
                                                    onSelect={() =>
                                                      handleTableClick(table)
                                                    }
                                                    scale={1}
                                                    isDraggable={false}
                                                    onDragEnd={() => {}}
                                                    showStatusIndicators={true}
                                                  />
                                                );
                                              }
                                            )}
                                          </React.Fragment>
                                        );
                                      }
                                    )}
                                  </>
                                );
                              })()}

                          {/* Entrance text */}
                          <Text
                            text="ENTRANCE"
                            x={450}
                            y={570}
                            fontSize={16}
                            fontFamily="Inter, system-ui, sans-serif"
                            fill={entranceTextColor}
                            align="center"
                            width={100}
                          />
                        </Layer>
                      </Stage>
                    );
                  })()
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline View Tab */}
        <TabsContent value="timeline">
          <TimelineView
            tables={tables}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onTableSlotClick={(table, timeSlot) => {
              setSelectedTable(table);
              setSelectedTimeSlot(timeSlot);
              setReservationDialogOpen(true);
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Table Details Side Panel */}
      <TableDetailsPanel
        table={selectedTable}
        isOpen={isPanelOpen}
        onClose={() => {
          setIsPanelOpen(false);
          setSelectedTable(null);
        }}
        onStatusUpdate={handleStatusUpdate}
        isUpdating={isUpdating}
        formatDuration={formatDuration}
        formatCurrency={formatCurrency}
      />

      {/* Reservation Dialog */}
      <ReservationDialog
        isOpen={reservationDialogOpen}
        onClose={() => {
          setReservationDialogOpen(false);
          setSelectedTable(null);
          setSelectedTimeSlot(undefined);
        }}
        table={selectedTable}
        selectedTimeSlot={selectedTimeSlot}
        onReservationCreate={handleReservationCreate}
      />
    </div>
  );
};

export default CommandCenterPage;
