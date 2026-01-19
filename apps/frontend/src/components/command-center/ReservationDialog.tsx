import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Phone, Users, Plus, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import type { EnhancedRestaurantTable, TableStatusType } from '@/store/api/types';

interface ReservationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  table: EnhancedRestaurantTable | null;
  selectedTimeSlot?: Date;
  onReservationCreate: (
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
  ) => Promise<void>;
}

const TIME_SLOTS = [
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30'
];

const DURATION_OPTIONS = [
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 150, label: '2.5 hours' },
  { value: 180, label: '3 hours' },
];

export const ReservationDialog: React.FC<ReservationDialogProps> = ({
  isOpen,
  onClose,
  table,
  selectedTimeSlot,
  onReservationCreate,
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState(90); // 1.5 hours default
  const [notes, setNotes] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  // Form validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form when dialog opens
  useEffect(() => {
    if (isOpen && table) {
      if (selectedTimeSlot) {
        setSelectedDate(selectedTimeSlot);
        setSelectedTime(`${selectedTimeSlot.getHours().toString().padStart(2, '0')}:${selectedTimeSlot.getMinutes().toString().padStart(2, '0')}`);
      } else {
        setSelectedDate(new Date());
        setSelectedTime('19:00'); // Default to 7 PM
      }

      // Reset form
      setCustomerName('');
      setCustomerPhone('');
      setPartySize(2);
      setEstimatedDuration(90);
      setNotes('');
      setSpecialRequests('');
      setErrors({});
    }
  }, [isOpen, table, selectedTimeSlot]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!customerName.trim()) {
      newErrors.customerName = 'Customer name is required';
    }

    if (!customerPhone.trim()) {
      newErrors.customerPhone = 'Phone number is required';
    } else if (!/^\+?[\d\s\-\(\)]+$/.test(customerPhone.trim())) {
      newErrors.customerPhone = 'Please enter a valid phone number';
    }

    if (partySize < 1) {
      newErrors.partySize = 'Party size must be at least 1';
    } else if (table && partySize > table.capacity) {
      newErrors.partySize = `Party size cannot exceed table capacity (${table.capacity})`;
    }

    if (!selectedTime) {
      newErrors.selectedTime = 'Please select a time';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!table || !validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Create reservation time from selected date and time
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const reservationTime = new Date(selectedDate);
      reservationTime.setHours(hours, minutes, 0, 0);

      await onReservationCreate(table, {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        partySize,
        reservationTime,
        estimatedDuration,
        notes: notes.trim() || undefined,
        specialRequests: specialRequests.trim() || undefined,
      });

      toast({
        title: 'Reservation Created',
        description: `Table ${table.tableNumber} reserved for ${customerName} at ${selectedTime}`,
      });

      onClose();
    } catch (error) {
      toast({
        title: 'Failed to Create Reservation',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(new Date(e.target.value));
  };

  const getDateInputValue = () => {
    return selectedDate.toISOString().split('T')[0];
  };

  if (!table) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Create Reservation - Table {table.tableNumber}
          </DialogTitle>
          <DialogDescription>
            Schedule a reservation for this table. Please provide customer details and timing preferences.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Table Info */}
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <h4 className="font-medium">Table {table.tableNumber}</h4>
              <p className="text-sm text-muted-foreground">
                Capacity: {table.capacity} seats • {table.zone || 'No zone'}
              </p>
            </div>
            <div className="ml-auto">
              <Badge variant="outline">
                {table.currentStatus?.status || 'Available'}
              </Badge>
            </div>
          </div>

          {/* Customer Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Customer Information</h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer-name">
                  Customer Name <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="customer-name"
                    placeholder="John Doe"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className={`pl-10 ${errors.customerName ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.customerName && (
                  <p className="text-sm text-red-500">{errors.customerName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer-phone">
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="customer-phone"
                    placeholder="+1234567890"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className={`pl-10 ${errors.customerPhone ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.customerPhone && (
                  <p className="text-sm text-red-500">{errors.customerPhone}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="party-size">
                Party Size <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="party-size"
                  type="number"
                  min="1"
                  max={table.capacity}
                  value={partySize}
                  onChange={(e) => setPartySize(parseInt(e.target.value) || 1)}
                  className={`pl-10 ${errors.partySize ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.partySize && (
                <p className="text-sm text-red-500">{errors.partySize}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Maximum capacity: {table.capacity} guests
              </p>
            </div>
          </div>

          <Separator />

          {/* Reservation Timing */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Reservation Timing</h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reservation-date">
                  Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="reservation-date"
                  type="date"
                  value={getDateInputValue()}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={handleDateChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reservation-time">
                  Time <span className="text-red-500">*</span>
                </Label>
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger className={errors.selectedTime ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.selectedTime && (
                  <p className="text-sm text-red-500">{errors.selectedTime}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Estimated Duration</Label>
              <Select value={estimatedDuration.toString()} onValueChange={(value) => setEstimatedDuration(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((duration) => (
                    <SelectItem key={duration.value} value={duration.value.toString()}>
                      {duration.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Additional Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Additional Information</h4>

            <div className="space-y-2">
              <Label htmlFor="special-requests">Special Requests</Label>
              <Input
                id="special-requests"
                placeholder="Birthday celebration, anniversary, etc."
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes about the reservation..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Reservation
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};