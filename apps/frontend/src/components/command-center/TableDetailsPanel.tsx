import React, { useState, useEffect } from 'react';
import { X, Clock, Users, DollarSign, FileText, User, Phone, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type {
  EnhancedRestaurantTable,
  TableStatusType,
  TableStatus
} from '@/store/api/types';

interface TableDetailsPanelProps {
  table: EnhancedRestaurantTable | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: (
    table: EnhancedRestaurantTable,
    status: TableStatusType,
    additionalData?: Partial<TableStatus>
  ) => Promise<void>;
  isUpdating: boolean;
  formatDuration: (ms?: number) => string;
  formatCurrency: (amount?: number) => string;
}

export const TableDetailsPanel: React.FC<TableDetailsPanelProps> = ({
  table,
  isOpen,
  onClose,
  onStatusUpdate,
  isUpdating,
  formatDuration,
  formatCurrency,
}) => {
  const [partySize, setPartySize] = useState('');
  const [notes, setNotes] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Reset form when table changes
  useEffect(() => {
    if (table?.currentStatus) {
      setPartySize(table.currentStatus.currentPartySize?.toString() || '');
      setNotes(table.currentStatus.notes || '');
      setCustomerName(table.currentStatus.reservationCustomerName || '');
      setCustomerPhone(table.currentStatus.reservationCustomerPhone || '');
    } else {
      setPartySize('');
      setNotes('');
      setCustomerName('');
      setCustomerPhone('');
    }
  }, [table]);

  if (!isOpen || !table) {
    return null;
  }

  const status = table.currentStatus;
  const currentStatus = status?.status || 'available';

  const handleQuickStatusChange = async (newStatus: TableStatusType) => {
    const additionalData: Partial<TableStatus> = {};

    if (newStatus === 'occupied' && partySize) {
      additionalData.currentPartySize = parseInt(partySize);
    }

    if (newStatus === 'reserved' && (customerName || customerPhone)) {
      additionalData.reservationCustomerName = customerName;
      additionalData.reservationCustomerPhone = customerPhone;
    }

    if (notes) {
      additionalData.notes = notes;
    }

    await onStatusUpdate(table, newStatus, additionalData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'occupied': return 'bg-orange-500';
      case 'reserved': return 'bg-blue-500';
      case 'cleaning': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/50"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="w-96 bg-background border-l shadow-lg flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Table {table.tableNumber}</h2>
              <p className="text-sm text-muted-foreground">
                {table.displayName || table.zone || 'No zone'}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Current Status Badge */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={`${getStatusColor(currentStatus)} text-white`}>
              {getStatusLabel(currentStatus)}
            </Badge>
            {status?.occupiedDuration && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(status.occupiedDuration)}
              </Badge>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Table Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Table Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Capacity:</span>
                <span>{table.capacity || 'N/A'} seats</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Zone:</span>
                <span>{table.zone || 'No zone'}</span>
              </div>
              {status?.assignedServerName && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Server:</span>
                  <span>{status.assignedServerName}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current Status Details */}
          {status && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Status Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {status.currentPartySize && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{status.currentPartySize} guests</span>
                  </div>
                )}

                {status.currentBillAmount && status.currentBillAmount > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>{formatCurrency(status.currentBillAmount)}</span>
                  </div>
                )}

                {status.notes && (
                  <div className="flex items-start gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>{status.notes}</span>
                  </div>
                )}

                {(status.reservationCustomerName || status.reservationCustomerPhone) && (
                  <div className="space-y-1">
                    {status.reservationCustomerName && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{status.reservationCustomerName}</span>
                      </div>
                    )}
                    {status.reservationCustomerPhone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{status.reservationCustomerPhone}</span>
                      </div>
                    )}
                  </div>
                )}

                {status.lastStatusChange && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      Last updated: {new Date(status.lastStatusChange).toLocaleString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Status Changes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={currentStatus === 'available' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickStatusChange('available')}
                  disabled={isUpdating}
                  className="text-xs"
                >
                  Mark Available
                </Button>
                <Button
                  variant={currentStatus === 'cleaning' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickStatusChange('cleaning')}
                  disabled={isUpdating}
                  className="text-xs"
                >
                  Need Cleaning
                </Button>
              </div>

              <Separator />

              {/* Occupy Table */}
              <div className="space-y-2">
                <Label htmlFor="party-size" className="text-xs">Party Size</Label>
                <div className="flex gap-2">
                  <Input
                    id="party-size"
                    type="number"
                    placeholder="2"
                    value={partySize}
                    onChange={(e) => setPartySize(e.target.value)}
                    className="text-xs"
                    min="1"
                    max="20"
                  />
                  <Button
                    variant={currentStatus === 'occupied' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleQuickStatusChange('occupied')}
                    disabled={isUpdating}
                    className="text-xs whitespace-nowrap"
                  >
                    Mark Occupied
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Reserve Table */}
              <div className="space-y-2">
                <Label htmlFor="customer-name" className="text-xs">Customer Name</Label>
                <Input
                  id="customer-name"
                  placeholder="John Doe"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="text-xs"
                />

                <Label htmlFor="customer-phone" className="text-xs">Phone (Optional)</Label>
                <Input
                  id="customer-phone"
                  placeholder="+1234567890"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="text-xs"
                />

                <Button
                  variant={currentStatus === 'reserved' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickStatusChange('reserved')}
                  disabled={isUpdating || !customerName.trim()}
                  className="w-full text-xs"
                >
                  Create Reservation
                </Button>
              </div>

              <Separator />

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-xs">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Special requests, allergies, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="text-xs resize-none"
                  rows={3}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickStatusChange(currentStatus)}
                  disabled={isUpdating}
                  className="w-full text-xs"
                >
                  Update Notes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-muted/30">
          <div className="text-xs text-muted-foreground">
            {status?.lastUpdatedByName && (
              <p>Last updated by {status.lastUpdatedByName}</p>
            )}
            <p>Table ID: {table.id.slice(-8)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};