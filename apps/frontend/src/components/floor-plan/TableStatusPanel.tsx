import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FloorPlanTable,
  TableStatus,
  TableStatusType,
  TablePriority,
  CreateReservationRequest,
} from '@/store/api/floorPlansApi';
import { useCreateReservationMutation } from '@/store/api/floorPlansApi';
import { formatDistanceToNow, format } from 'date-fns';
import {
  X,
  Users,
  Clock,
  DollarSign,
  AlertTriangle,
  Calendar,
  ChefHat,
  Utensils,
  CheckCircle,
  XCircle,
  User,
  Phone,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TableStatusPanelProps {
  tableStatus: TableStatus;
  floorPlanTable?: FloorPlanTable;
  onStatusUpdate: (tableId: string, status: TableStatusType, additionalData?: any) => Promise<void>;
  onClose: () => void;
}

export const TableStatusPanel: React.FC<TableStatusPanelProps> = ({
  tableStatus,
  floorPlanTable,
  onStatusUpdate,
  onClose,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showReservationDialog, setShowReservationDialog] = useState(false);
  const [reservationForm, setReservationForm] = useState<CreateReservationRequest>({
    guestName: '',
    guestPhone: '',
    partySize: 2,
    reservedFrom: new Date().toISOString().slice(0, 16),
    reservedTo: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16),
    notes: '',
  });

  const [createReservation] = useCreateReservationMutation();

  const handleStatusChange = async (newStatus: TableStatusType) => {
    setIsUpdating(true);
    try {
      await onStatusUpdate(tableStatus.tableId, newStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePriorityChange = async (priority: TablePriority) => {
    setIsUpdating(true);
    try {
      await onStatusUpdate(tableStatus.tableId, tableStatus.status, { priority });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePartySize = async (partySize: number) => {
    setIsUpdating(true);
    try {
      await onStatusUpdate(tableStatus.tableId, tableStatus.status, { currentPartySize: partySize });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateReservation = async () => {
    try {
      await createReservation({
        restaurantId: tableStatus.restaurantId,
        tableId: tableStatus.tableId,
        data: reservationForm,
      }).unwrap();
      setShowReservationDialog(false);
      setReservationForm({
        guestName: '',
        guestPhone: '',
        partySize: 2,
        reservedFrom: new Date().toISOString().slice(0, 16),
        reservedTo: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16),
        notes: '',
      });
    } catch (error) {
      console.error('Failed to create reservation:', error);
    }
  };

  const getStatusColor = (status: TableStatusType) => {
    switch (status) {
      case TableStatusType.Available:
        return 'bg-green-100 text-green-800 border-green-200';
      case TableStatusType.Occupied:
        return 'bg-red-100 text-red-800 border-red-200';
      case TableStatusType.Reserved:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case TableStatusType.NeedsAttention:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case TableStatusType.Cleaning:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case TableStatusType.OutOfOrder:
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: TablePriority) => {
    switch (priority) {
      case TablePriority.Urgent:
        return 'bg-red-100 text-red-800';
      case TablePriority.High:
        return 'bg-orange-100 text-orange-800';
      case TablePriority.Normal:
        return 'bg-blue-100 text-blue-800';
      case TablePriority.Low:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <Card className="h-full rounded-none border-0 border-l">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Table {tableStatus.tableLabel}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn('border', getStatusColor(tableStatus.status))}>
              {tableStatus.status.replace('_', ' ')}
            </Badge>
            <Badge variant="outline" className={getPriorityColor(tableStatus.priority)}>
              {tableStatus.priority}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Quick Actions */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Quick Actions</Label>
            <div className="grid grid-cols-2 gap-2">
              {tableStatus.status === TableStatusType.Available && (
                <>
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange(TableStatusType.Occupied)}
                    disabled={isUpdating}
                    className="text-xs"
                  >
                    <Users className="w-3 h-3 mr-1" />
                    Seat Guests
                  </Button>
                  <Dialog open={showReservationDialog} onOpenChange={setShowReservationDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="text-xs">
                        <Calendar className="w-3 h-3 mr-1" />
                        Reserve
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                </>
              )}

              {tableStatus.status === TableStatusType.Occupied && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange(TableStatusType.NeedsAttention)}
                    disabled={isUpdating}
                    className="text-xs"
                  >
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Attention
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange(TableStatusType.Available)}
                    disabled={isUpdating}
                    className="text-xs"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Clear Table
                  </Button>
                </>
              )}

              {tableStatus.status === TableStatusType.NeedsAttention && (
                <>
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange(TableStatusType.Occupied)}
                    disabled={isUpdating}
                    className="text-xs"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Resolved
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange(TableStatusType.Cleaning)}
                    disabled={isUpdating}
                    className="text-xs"
                  >
                    <Utensils className="w-3 h-3 mr-1" />
                    Clean
                  </Button>
                </>
              )}

              {(tableStatus.status === TableStatusType.Cleaning ||
                tableStatus.status === TableStatusType.Reserved) && (
                <Button
                  size="sm"
                  onClick={() => handleStatusChange(TableStatusType.Available)}
                  disabled={isUpdating}
                  className="text-xs col-span-2"
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Mark Available
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Table Details */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-xs text-muted-foreground">Capacity</Label>
                <p className="font-medium">{floorPlanTable?.capacity || 'N/A'} guests</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Zone</Label>
                <p className="font-medium">{floorPlanTable?.zone || 'Main'}</p>
              </div>
            </div>

            {tableStatus.occupiedSince && (
              <div>
                <Label className="text-xs text-muted-foreground">Occupied Since</Label>
                <p className="font-medium">
                  {formatDistanceToNow(new Date(tableStatus.occupiedSince), { addSuffix: true })}
                </p>
              </div>
            )}

            {tableStatus.currentPartySize && (
              <div>
                <Label className="text-xs text-muted-foreground">Current Party Size</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    max={floorPlanTable?.capacity || 10}
                    value={tableStatus.currentPartySize}
                    onChange={(e) => handlePartySize(parseInt(e.target.value) || 1)}
                    className="w-20 h-8"
                  />
                  <span className="text-sm text-muted-foreground">guests</span>
                </div>
              </div>
            )}
          </div>

          {/* Current Reservation */}
          {tableStatus.currentReservation && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="text-sm font-medium">Current Reservation</Label>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>{tableStatus.currentReservation.guestName}</span>
                  </div>
                  {tableStatus.currentReservation.guestPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{tableStatus.currentReservation.guestPhone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>{tableStatus.currentReservation.partySize} guests</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {format(new Date(tableStatus.currentReservation.reservedFrom), 'MMM d, HH:mm')} -
                      {format(new Date(tableStatus.currentReservation.reservedTo), 'HH:mm')}
                    </span>
                  </div>
                  {tableStatus.currentReservation.notes && (
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <span className="text-muted-foreground">
                        {tableStatus.currentReservation.notes}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Current Orders */}
          {tableStatus.currentOrders.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="text-sm font-medium">Current Orders</Label>
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {tableStatus.currentOrders.map((order) => (
                      <div
                        key={order.orderId}
                        className="p-2 rounded-md border bg-muted/50 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">#{order.orderNumber}</span>
                          <Badge variant="outline" className="text-xs">
                            {order.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>${order.totalAmount.toFixed(2)}</span>
                          <span>{formatDistanceToNow(new Date(order.orderedAt), { addSuffix: true })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}

          {/* Daily Metrics */}
          <Separator />
          <div className="space-y-3">
            <Label className="text-sm font-medium">Today's Metrics</Label>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="text-center p-2 rounded-md bg-muted/50">
                <div className="font-semibold">{tableStatus.dailyMetrics.totalOrders}</div>
                <div className="text-xs text-muted-foreground">Orders</div>
              </div>
              <div className="text-center p-2 rounded-md bg-muted/50">
                <div className="font-semibold">${tableStatus.dailyMetrics.totalRevenue.toFixed(0)}</div>
                <div className="text-xs text-muted-foreground">Revenue</div>
              </div>
              <div className="text-center p-2 rounded-md bg-muted/50">
                <div className="font-semibold">{tableStatus.dailyMetrics.turnoverCount}</div>
                <div className="text-xs text-muted-foreground">Turnovers</div>
              </div>
              <div className="text-center p-2 rounded-md bg-muted/50">
                <div className="font-semibold">{Math.round(tableStatus.dailyMetrics.occupancyMinutes / 60)}h</div>
                <div className="text-xs text-muted-foreground">Occupied</div>
              </div>
            </div>
          </div>

          {/* Priority Control */}
          <Separator />
          <div className="space-y-2">
            <Label className="text-sm font-medium">Priority Level</Label>
            <Select
              value={tableStatus.priority}
              onValueChange={(value: TablePriority) => handlePriorityChange(value)}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TablePriority.Low}>Low</SelectItem>
                <SelectItem value={TablePriority.Normal}>Normal</SelectItem>
                <SelectItem value={TablePriority.High}>High</SelectItem>
                <SelectItem value={TablePriority.Urgent}>Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reservation Dialog */}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Reservation - Table {tableStatus.tableLabel}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="guestName">Guest Name *</Label>
              <Input
                id="guestName"
                value={reservationForm.guestName}
                onChange={(e) => setReservationForm(prev => ({ ...prev, guestName: e.target.value }))}
                placeholder="Enter guest name"
              />
            </div>
            <div>
              <Label htmlFor="guestPhone">Phone Number</Label>
              <Input
                id="guestPhone"
                value={reservationForm.guestPhone}
                onChange={(e) => setReservationForm(prev => ({ ...prev, guestPhone: e.target.value }))}
                placeholder="Enter phone number"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="partySize">Party Size *</Label>
              <Input
                id="partySize"
                type="number"
                min="1"
                max={floorPlanTable?.capacity || 10}
                value={reservationForm.partySize}
                onChange={(e) => setReservationForm(prev => ({ ...prev, partySize: parseInt(e.target.value) || 1 }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="reservedFrom">From *</Label>
              <Input
                id="reservedFrom"
                type="datetime-local"
                value={reservationForm.reservedFrom}
                onChange={(e) => setReservationForm(prev => ({ ...prev, reservedFrom: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="reservedTo">To *</Label>
              <Input
                id="reservedTo"
                type="datetime-local"
                value={reservationForm.reservedTo}
                onChange={(e) => setReservationForm(prev => ({ ...prev, reservedTo: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={reservationForm.notes}
              onChange={(e) => setReservationForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any special requests or notes..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowReservationDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateReservation}>
              Create Reservation
            </Button>
          </div>
        </div>
      </DialogContent>
    </>
  );
};