import React, { useState } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
} from 'lucide-react';
import {
  useGetZonesByBranchQuery,
  useCreateZoneForBranchMutation,
  useUpdateZoneMutation,
  useDeleteZoneMutation,
} from '@/store/api/restaurantsApi';
import type { ZoneResponse } from '@/store/api/types';
import { useBranchContext } from '@/contexts/BranchContext';

interface ZoneManagementPanelProps {
  restaurantId: string;
  onZoneChange?: () => void;
}

export const ZoneManagementPanel: React.FC<ZoneManagementPanelProps> = ({
  restaurantId,
  onZoneChange,
}) => {
  const { toast } = useToast();
  const { currentBranch } = useBranchContext();

  // API hooks
  const branchId = currentBranch?._id;
  const queryParams = restaurantId && branchId ? { restaurantId, branchId } : skipToken;
  const { data: zonesData, refetch } = useGetZonesByBranchQuery(queryParams);
  const [createZone] = useCreateZoneForBranchMutation();
  const [updateZone] = useUpdateZoneMutation();
  const [deleteZone] = useDeleteZoneMutation();

  // Local state
  const [isCreateZoneOpen, setIsCreateZoneOpen] = useState(false);
  const [isEditZoneOpen, setIsEditZoneOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<ZoneResponse | null>(null);
  const [zoneForm, setZoneForm] = useState({ name: '' });

  // Derived data
  const zones = zonesData?.zones || [];

  // Event handlers
  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId || !branchId) return;

    try {
      await createZone({
        restaurantId,
        branchId,
        body: { name: zoneForm.name.trim() },
      }).unwrap();

      toast({
        title: 'Zone created',
        description: `Zone "${zoneForm.name}" has been created successfully.`,
      });

      setIsCreateZoneOpen(false);
      setZoneForm({ name: '' });
      refetch();
      onZoneChange?.();
    } catch (error) {
      toast({
        title: 'Failed to create zone',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleEditZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId || !editingZone) return;

    try {
      await updateZone({
        restaurantId,
        zoneId: editingZone.id,
        body: { name: zoneForm.name.trim() },
      }).unwrap();

      toast({
        title: 'Zone updated',
        description: `Zone has been renamed to "${zoneForm.name}".`,
      });

      setIsEditZoneOpen(false);
      setEditingZone(null);
      setZoneForm({ name: '' });
      refetch();
      onZoneChange?.();
    } catch (error) {
      toast({
        title: 'Failed to update zone',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteZone = async (zone: ZoneResponse) => {
    if (!restaurantId) return;

    if (zone.tableCount > 0) {
      toast({
        title: 'Cannot delete zone',
        description: `Zone "${zone.name}" has ${zone.tableCount} table(s). Please reassign tables before deleting.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      await deleteZone({
        restaurantId,
        zoneId: zone.id,
      }).unwrap();

      toast({
        title: 'Zone deleted',
        description: `Zone "${zone.name}" has been deleted successfully.`,
      });

      refetch();
      onZoneChange?.();
    } catch (error) {
      toast({
        title: 'Failed to delete zone',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const openEditZone = (zone: ZoneResponse) => {
    setEditingZone(zone);
    setZoneForm({ name: zone.name });
    setIsEditZoneOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Zone Management</CardTitle>
              <CardDescription>
                Organize your restaurant tables into zones
              </CardDescription>
            </div>
            <Dialog open={isCreateZoneOpen} onOpenChange={setIsCreateZoneOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Zone
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zone Name</TableHead>
                  <TableHead>Tables Count</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      No zones created yet
                    </TableCell>
                  </TableRow>
                ) : (
                  zones.map((zone) => (
                    <TableRow key={zone.id}>
                      <TableCell className="font-medium">
                        {zone.name}
                      </TableCell>
                      <TableCell>{zone.tableCount} tables</TableCell>
                      <TableCell>
                        {new Date(zone.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditZone(zone)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteZone(zone)}
                              className="text-destructive"
                              disabled={zone.tableCount > 0}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* CREATE ZONE DIALOG */}
      <Dialog open={isCreateZoneOpen} onOpenChange={setIsCreateZoneOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleCreateZone}>
            <DialogHeader>
              <DialogTitle>Create New Zone</DialogTitle>
              <DialogDescription>
                Add a new zone to organize your tables
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="zoneName" className="text-right">
                  Zone Name
                </Label>
                <Input
                  id="zoneName"
                  value={zoneForm.name}
                  onChange={(e) =>
                    setZoneForm({ ...zoneForm, name: e.target.value })
                  }
                  placeholder="e.g., Main Hall, Terrace, VIP"
                  className="col-span-3"
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateZoneOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create Zone</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT ZONE DIALOG */}
      <Dialog open={isEditZoneOpen} onOpenChange={setIsEditZoneOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleEditZone}>
            <DialogHeader>
              <DialogTitle>Edit Zone</DialogTitle>
              <DialogDescription>Update zone name</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editZoneName" className="text-right">
                  Zone Name
                </Label>
                <Input
                  id="editZoneName"
                  value={zoneForm.name}
                  onChange={(e) =>
                    setZoneForm({ ...zoneForm, name: e.target.value })
                  }
                  placeholder="e.g., Main Hall, Terrace, VIP"
                  className="col-span-3"
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditZoneOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Update Zone</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};