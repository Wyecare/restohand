import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Edit, Trash2, Save } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import type { EnhancedRestaurantTable } from '@/store/api/types';

interface ZoneManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tables: EnhancedRestaurantTable[];
  zones: string[];
  onZonesUpdated: (newZones: string[]) => void;
}

export const ZoneManagementDialog: React.FC<ZoneManagementDialogProps> = ({
  isOpen,
  onClose,
  tables,
  zones,
  onZonesUpdated,
}) => {
  const { toast } = useToast();
  const [localZones, setLocalZones] = useState<string[]>([]);
  const [newZoneName, setNewZoneName] = useState('');
  const [editingZone, setEditingZone] = useState<string | null>(null);
  const [editingZoneName, setEditingZoneName] = useState('');

  // Initialize local zones when dialog opens
  useEffect(() => {
    if (isOpen) {
      setLocalZones([...zones]);
      setNewZoneName('');
      setEditingZone(null);
      setEditingZoneName('');
    }
  }, [isOpen, zones]);

  const getTableCountForZone = (zoneName: string) => {
    return tables.filter(table => table.zone === zoneName).length;
  };

  const handleAddZone = () => {
    const trimmedName = newZoneName.trim();
    if (!trimmedName) {
      toast({
        title: 'Zone name required',
        description: 'Please enter a name for the zone.',
        variant: 'destructive',
      });
      return;
    }

    if (localZones.includes(trimmedName)) {
      toast({
        title: 'Zone already exists',
        description: 'A zone with this name already exists.',
        variant: 'destructive',
      });
      return;
    }

    const newZones = [...localZones, trimmedName];
    setLocalZones(newZones);
    setNewZoneName('');

    toast({
      title: 'Zone added',
      description: `Zone "${trimmedName}" has been added.`,
    });
  };

  const handleEditZone = (zoneName: string) => {
    setEditingZone(zoneName);
    setEditingZoneName(zoneName);
  };

  const handleSaveEdit = () => {
    const trimmedName = editingZoneName.trim();

    if (!trimmedName) {
      toast({
        title: 'Zone name required',
        description: 'Please enter a name for the zone.',
        variant: 'destructive',
      });
      return;
    }

    if (trimmedName !== editingZone && localZones.includes(trimmedName)) {
      toast({
        title: 'Zone already exists',
        description: 'A zone with this name already exists.',
        variant: 'destructive',
      });
      return;
    }

    const newZones = localZones.map(zone =>
      zone === editingZone ? trimmedName : zone
    );

    setLocalZones(newZones);
    setEditingZone(null);
    setEditingZoneName('');

    toast({
      title: 'Zone updated',
      description: `Zone has been renamed to "${trimmedName}".`,
    });
  };

  const handleCancelEdit = () => {
    setEditingZone(null);
    setEditingZoneName('');
  };

  const handleDeleteZone = (zoneName: string) => {
    const tableCount = getTableCountForZone(zoneName);

    if (tableCount > 0) {
      toast({
        title: 'Cannot delete zone',
        description: `Zone "${zoneName}" has ${tableCount} table(s) assigned. Please reassign tables before deleting.`,
        variant: 'destructive',
      });
      return;
    }

    const newZones = localZones.filter(zone => zone !== zoneName);
    setLocalZones(newZones);

    toast({
      title: 'Zone deleted',
      description: `Zone "${zoneName}" has been deleted.`,
    });
  };

  const handleSaveChanges = () => {
    onZonesUpdated(localZones);
    toast({
      title: 'Zones updated',
      description: 'Zone configuration has been saved.',
    });
    onClose();
  };

  const hasChanges = JSON.stringify(localZones) !== JSON.stringify(zones);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Zone Management
          </DialogTitle>
          <DialogDescription>
            Create and manage zones for organizing tables. Zones help you group tables by location or service area.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Zone */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Add New Zone</h4>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Enter zone name (e.g., Main Hall, Terrace, VIP)"
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddZone()}
                />
              </div>
              <Button onClick={handleAddZone} disabled={!newZoneName.trim()}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          </div>

          {/* Existing Zones */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Existing Zones ({localZones.length})</h4>

            {localZones.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No zones created yet</p>
                <p className="text-xs">Add zones to organize your tables by location</p>
              </div>
            ) : (
              <div className="space-y-2">
                {localZones.map((zone) => (
                  <div
                    key={zone}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {editingZone === zone ? (
                        <div className="flex-1 flex gap-2">
                          <Input
                            value={editingZoneName}
                            onChange={(e) => setEditingZoneName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                            className="flex-1"
                            autoFocus
                          />
                          <Button size="sm" onClick={handleSaveEdit}>
                            <Save className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div>
                            <p className="font-medium">{zone}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{getTableCountForZone(zone)} tables</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {editingZone !== zone && (
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary">
                          {getTableCountForZone(zone)} tables
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditZone(zone)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteZone(zone)}
                          disabled={getTableCountForZone(zone) > 0}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Zone Usage Summary */}
          {localZones.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Zone Summary</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {localZones.map((zone) => {
                  const tableCount = getTableCountForZone(zone);
                  return (
                    <div key={zone} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                      <span>{zone}</span>
                      <Badge variant="outline">
                        {tableCount} table{tableCount !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  );
                })}

                {/* Tables with no zone */}
                {(() => {
                  const unassignedCount = tables.filter(table => !table.zone).length;
                  if (unassignedCount > 0) {
                    return (
                      <div className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                        <span className="text-muted-foreground">No zone assigned</span>
                        <Badge variant="outline">
                          {unassignedCount} table{unassignedCount !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveChanges}
              disabled={!hasChanges}
              className="flex-1"
            >
              {hasChanges ? (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              ) : (
                'No Changes'
              )}
            </Button>
          </div>

          {hasChanges && (
            <p className="text-xs text-muted-foreground text-center">
              You have unsaved changes. Click "Save Changes" to apply them.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};