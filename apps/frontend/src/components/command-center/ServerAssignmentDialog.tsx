import React, { useState, useEffect } from 'react';
import { User, Users, MapPin, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import type { EnhancedRestaurantTable } from '@/store/api/types';

interface ServerAssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tables: EnhancedRestaurantTable[];
  onServerAssign: (
    tableIds: string[],
    serverId?: string,
    serverName?: string
  ) => Promise<void>;
}

const MOCK_SERVERS = [
  { id: '1', name: 'Alice Johnson', zone: 'Main Hall', activeTableCount: 3 },
  { id: '2', name: 'Bob Smith', zone: 'Terrace', activeTableCount: 2 },
  { id: '3', name: 'Carol Davis', zone: 'Main Hall', activeTableCount: 4 },
  {
    id: '4',
    name: 'David Wilson',
    zone: 'Private Dining',
    activeTableCount: 1,
  },
  { id: '5', name: 'Eve Brown', zone: 'Main Hall', activeTableCount: 0 },
];

const ZONES = ['Main Hall', 'Terrace', 'Private Dining', 'Bar Area'];

export const ServerAssignmentDialog: React.FC<ServerAssignmentDialogProps> = ({
  isOpen,
  onClose,
  tables,
  onServerAssign,
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [selectedServer, setSelectedServer] = useState<string>('');
  const [viewMode, setViewMode] = useState<'bulk' | 'individual'>('bulk');
  const [selectedZone, setSelectedZone] = useState<string>('');

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTables([]);
      setSelectedServer('');
      setSelectedZone('');
    }
  }, [isOpen]);

  const filteredTables = tables.filter(
    (table) => !selectedZone || table.zone === selectedZone
  );

  const availableServers = MOCK_SERVERS.filter(
    (server) => !selectedZone || server.zone === selectedZone
  );

  const selectedServerData = MOCK_SERVERS.find(
    (server) => server.id === selectedServer
  );

  const handleTableSelect = (tableId: string, checked: boolean) => {
    if (checked) {
      setSelectedTables([...selectedTables, tableId]);
    } else {
      setSelectedTables(selectedTables.filter((id) => id !== tableId));
    }
  };

  const handleSelectAllTables = () => {
    const availableTableIds = filteredTables
      .filter((table) => table.currentStatus?.status !== 'cleaning')
      .map((table) => table.id);
    setSelectedTables(availableTableIds);
  };

  const handleClearSelection = () => {
    setSelectedTables([]);
  };

  const handleSubmit = async () => {
    if (selectedTables.length === 0) {
      toast({
        title: 'No tables selected',
        description: 'Please select at least one table to assign.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await onServerAssign(
        selectedTables,
        selectedServer || undefined,
        selectedServerData?.name
      );

      toast({
        title: 'Server Assignment Updated',
        description: selectedServer
          ? `${selectedTables.length} tables assigned to ${selectedServerData?.name}`
          : `Server removed from ${selectedTables.length} tables`,
      });

      onClose();
    } catch (error) {
      toast({
        title: 'Failed to Update Assignment',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTableStatusColor = (table: EnhancedRestaurantTable) => {
    switch (table.currentStatus?.status) {
      case 'occupied':
        return 'bg-orange-500';
      case 'reserved':
        return 'bg-blue-500';
      case 'cleaning':
        return 'bg-gray-500';
      default:
        return 'bg-green-500';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Server Assignment & Zone Management
          </DialogTitle>
          <DialogDescription>
            Assign servers to tables and manage zones. Select tables and choose
            a server to assign or remove assignments.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* View Mode Toggle */}
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'bulk' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('bulk')}
            >
              Bulk Assignment
            </Button>
            <Button
              variant={viewMode === 'individual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('individual')}
            >
              Individual Tables
            </Button>
          </div>

          {/* Zone Filter */}
          <div className="space-y-2">
            <Label>Filter by Zone</Label>
            <div className="flex gap-2">
              <Select value={selectedZone} onValueChange={setSelectedZone}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All zones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All zones</SelectItem>
                  {ZONES.map((zone) => (
                    <SelectItem key={zone} value={zone}>
                      {zone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAllTables}
                disabled={filteredTables.length === 0}
              >
                Select All in Zone
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearSelection}
                disabled={selectedTables.length === 0}
              >
                Clear Selection
              </Button>
            </div>
          </div>

          {/* Server Selection */}
          <div className="space-y-2">
            <Label>Assign to Server</Label>
            <div className="grid grid-cols-2 gap-4">
              <Select value={selectedServer} onValueChange={setSelectedServer}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a server (or leave empty to remove assignment)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Remove assignment</SelectItem>
                  {availableServers.map((server) => (
                    <SelectItem key={server.id} value={server.id}>
                      {server.name} - {server.zone} ({server.activeTableCount}{' '}
                      tables)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedServerData && (
                <Card className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        {selectedServerData.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedServerData.zone}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {selectedServerData.activeTableCount} active
                    </Badge>
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* Table Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Select Tables ({selectedTables.length} selected)</Label>
              <div className="flex gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span>Occupied</span>
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

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-60 overflow-y-auto">
              {filteredTables.map((table) => {
                const isSelected = selectedTables.includes(table.id);
                const isDisabled = table.currentStatus?.status === 'cleaning';

                return (
                  <div
                    key={table.id}
                    className={`
                      relative border rounded-lg p-3 cursor-pointer transition-all
                      ${isSelected ? 'ring-2 ring-primary border-primary' : ''}
                      ${
                        isDisabled
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:border-primary/50'
                      }
                    `}
                    onClick={() =>
                      !isDisabled && handleTableSelect(table.id, !isSelected)
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">
                          Table {table.tableNumber}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {table.capacity} seats • {table.zone || 'No zone'}
                        </p>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full ${getTableStatusColor(
                          table
                        )}`}
                      />
                    </div>

                    {table.currentStatus?.assignedServerName && (
                      <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {table.currentStatus.assignedServerName}
                      </div>
                    )}

                    {table.currentStatus?.currentPartySize && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {table.currentStatus.currentPartySize} guests
                      </div>
                    )}

                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {filteredTables.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No tables found in the selected zone</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedTables.length === 0}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Update Assignment
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
