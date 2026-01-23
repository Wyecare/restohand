import React, { useState } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  UserPlus,
  UserMinus,
  Users,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useListWaitersByBranchQuery } from '@/store/api/staffApi';
import { useUpdateTableStatusMutation, useGetTableStatusQuery } from '@/store/api/restaurantsApi';
import { useBranchContext } from '@/contexts/BranchContext';
import { TableStatusType } from '@/store/api/types';
import type { RestaurantTable, StaffMember } from '@/store/api/types';

interface WaiterAssignmentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  table: RestaurantTable | null;
  restaurantId: string;
  onAssignmentSuccess?: () => void;
}

export const WaiterAssignmentDialog: React.FC<WaiterAssignmentDialogProps> = ({
  isOpen,
  onOpenChange,
  table,
  restaurantId,
  onAssignmentSuccess,
}) => {
  const { toast } = useToast();
  const { currentBranch } = useBranchContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const branchId = currentBranch?._id;
  const {
    data: waiters,
    isLoading: isLoadingWaiters,
    error: waitersError,
  } = useListWaitersByBranchQuery(
    branchId ? { branchId } : skipToken,
    { skip: !branchId || !isOpen }
  );

  const {
    data: tableStatus,
    isLoading: isLoadingStatus,
  } = useGetTableStatusQuery(
    restaurantId && table ? { restaurantId, tableId: table.id } : skipToken,
    { skip: !restaurantId || !table || !isOpen }
  );

  const [updateTableStatus] = useUpdateTableStatusMutation();

  const filteredWaiters = waiters?.filter((waiter) => {
    const name = waiter.displayName || waiter.name;
    return name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      waiter.email?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleAssignWaiter = async (waiterId: string | null) => {
    if (!table || !restaurantId) return;

    setIsAssigning(true);
    try {
      await updateTableStatus({
        restaurantId,
        tableId: table.id,
        body: {
          status: TableStatusType.Available,
          assignedServerId: waiterId || '',
        },
      }).unwrap();

      const waiter = waiters?.find(w => w.id === waiterId);
      const waiterName = waiter ? (waiter.displayName || waiter.name) : 'Waiter';

      toast({
        title: 'Assignment updated',
        description: waiterId
          ? `${waiterName} has been assigned to table ${table.tableNumber}`
          : `Waiter assignment removed from table ${table.tableNumber}`,
      });

      onOpenChange(false);
      onAssignmentSuccess?.();
    } catch (error) {
      toast({
        title: 'Failed to update assignment',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleClose = () => {
    if (!isAssigning) {
      setSearchTerm('');
      onOpenChange(false);
    }
  };

  const getWaiterInitials = (waiter: StaffMember): string => {
    const name = waiter.displayName || waiter.name;
    return name
      ?.split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase() || waiter.email?.charAt(0).toUpperCase() || 'W';
  };

  const currentlyAssignedWaiterId = tableStatus?.assignedServerId;
  const currentlyAssignedWaiter = waiters?.find(w => w.id === currentlyAssignedWaiterId);

  const isWaiterAssigned = (waiterId: string): boolean => {
    return waiterId === currentlyAssignedWaiterId;
  };

  if (waitersError) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Assignment Error
            </DialogTitle>
            <DialogDescription>
              Unable to load waiter list for table {table?.tableNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              There was an error loading the available waiters. Please try again or check your connection.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {currentlyAssignedWaiter ? 'Manage Waiter Assignment' : 'Assign Waiter'}
          </DialogTitle>
          <DialogDescription>
            {currentlyAssignedWaiter ? (
              <div className="space-y-1">
                <div>Table {table?.tableNumber} is currently assigned to:</div>
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  {currentlyAssignedWaiter.displayName || currentlyAssignedWaiter.name}
                </div>
              </div>
            ) : (
              `Select a waiter to assign to table ${table?.tableNumber}`
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search waiters..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              disabled={isAssigning}
            />
          </div>

          {/* Currently Assigned Waiter */}
          {currentlyAssignedWaiter && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={currentlyAssignedWaiter.photoURL || undefined} />
                      <AvatarFallback className="text-sm font-semibold bg-green-600 text-white">
                        {getWaiterInitials(currentlyAssignedWaiter)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-green-900">
                          {currentlyAssignedWaiter.displayName || currentlyAssignedWaiter.name}
                        </p>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </div>
                      <p className="text-sm text-green-700">
                        Currently assigned to this table
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-green-600 text-white">
                    Assigned
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Waiters List */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-2">
            {isLoadingWaiters || isLoadingStatus ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3 p-3 rounded-lg border">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-8 w-16" />
                  </div>
                ))}
              </div>
            ) : !filteredWaiters || filteredWaiters.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm ? 'No matching waiters' : 'No waiters available'}
                </h3>
                <p className="text-sm">
                  {searchTerm
                    ? 'Try adjusting your search term'
                    : 'Add waiters to your staff to assign them to tables'
                  }
                </p>
              </div>
            ) : (
              filteredWaiters.map((waiter) => (
                <div
                  key={waiter.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    isWaiterAssigned(waiter.id)
                      ? 'bg-green-50 border-green-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={waiter.photoURL || undefined} />
                      <AvatarFallback className="text-sm font-semibold">
                        {getWaiterInitials(waiter)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {waiter.displayName || waiter.name || 'Unnamed Waiter'}
                        </p>
                        {isWaiterAssigned(waiter.id) && (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-gray-500 truncate">
                          {waiter.email}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {waiter.roles?.[0] || 'waiter'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant={isWaiterAssigned(waiter.id) ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => handleAssignWaiter(waiter.id)}
                    disabled={isAssigning || isWaiterAssigned(waiter.id)}
                  >
                    {isWaiterAssigned(waiter.id) ? 'Current' : 'Assign'}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isAssigning}
          >
            Cancel
          </Button>

          {currentlyAssignedWaiterId && (
            <Button
              variant="secondary"
              onClick={() => handleAssignWaiter(null)}
              disabled={isAssigning}
              className="flex items-center gap-2"
            >              <UserMinus className="h-4 w-4" />
              Remove Assignment
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};