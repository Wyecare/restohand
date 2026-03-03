import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { skipToken } from '@reduxjs/toolkit/query';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import { useBranchAwareQueries } from '@/hooks/useBranchAwareQuery';
import { useBranchContext } from '@/contexts/BranchContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Edit, Trash2, MapPin, Table2 } from 'lucide-react';
import {
  useGetZonesByBranchQuery,
  useCreateZoneForBranchMutation,
  useUpdateZoneMutation,
  useDeleteZoneMutation,
} from '@/store/api/restaurantsApi';
import type { ZoneResponse } from '@/store/api/types';
import { cn } from '@/lib/utils';

// ─── Zone Form Dialog ──────────────────────────────────────────────────────────

function ZoneFormDialog({
  open,
  onOpenChange,
  title,
  description,
  value,
  onChange,
  onSubmit,
  submitLabel,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border">
          <DialogTitle className="text-base font-bold">{title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-0.5">
            {description}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className="px-5 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Zone Name
              </Label>
              <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="e.g. Main Hall, Terrace, VIP"
                className="h-9 text-sm"
                required
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="px-5 py-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">{submitLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Zone Row Skeleton ─────────────────────────────────────────────────────────

function ZoneRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-4 border-b border-border animate-pulse">
      <div className="h-8 w-8 rounded-lg bg-muted shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 bg-muted rounded w-28" />
        <div className="h-3 bg-muted rounded w-20" />
      </div>
      <div className="h-5 bg-muted rounded w-16" />
      <div className="h-5 bg-muted rounded w-20" />
      <div className="h-7 w-7 bg-muted rounded" />
    </div>
  );
}

// ─── Zone Management Panel ─────────────────────────────────────────────────────

function ZoneManagementPanel({
  restaurantId,
  onZoneChange,
}: {
  restaurantId: string;
  onZoneChange?: () => void;
}) {
  const { toast } = useToast();
  const { currentBranch } = useBranchContext();
  const branchId = currentBranch?._id;

  const queryParams =
    restaurantId && branchId ? { restaurantId, branchId } : skipToken;

  const { data: zonesData, isLoading, refetch } =
    useGetZonesByBranchQuery(queryParams);

  const [createZone] = useCreateZoneForBranchMutation();
  const [updateZone] = useUpdateZoneMutation();
  const [deleteZone] = useDeleteZoneMutation();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<ZoneResponse | null>(null);
  const [zoneName, setZoneName] = useState('');

  const zones = zonesData?.zones || [];
  const totalTables = zones.reduce((s, z) => s + (z.tableCount || 0), 0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId || !branchId) return;
    try {
      await createZone({
        restaurantId,
        branchId,
        body: { name: zoneName.trim() },
      }).unwrap();
      toast({ title: `Zone "${zoneName}" created` });
      setIsCreateOpen(false);
      setZoneName('');
      refetch();
      onZoneChange?.();
    } catch {
      toast({ title: 'Failed to create zone', variant: 'destructive' });
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId || !editingZone) return;
    try {
      await updateZone({
        restaurantId,
        zoneId: editingZone.id,
        body: { name: zoneName.trim() },
      }).unwrap();
      toast({ title: `Zone renamed to "${zoneName}"` });
      setIsEditOpen(false);
      setEditingZone(null);
      setZoneName('');
      refetch();
      onZoneChange?.();
    } catch {
      toast({ title: 'Failed to update zone', variant: 'destructive' });
    }
  };

  const handleDelete = async (zone: ZoneResponse) => {
    if (!restaurantId) return;
    if (zone.tableCount > 0) {
      toast({
        title: 'Cannot delete zone',
        description: `"${zone.name}" has ${zone.tableCount} table(s). Reassign them first.`,
        variant: 'destructive',
      });
      return;
    }
    try {
      await deleteZone({ restaurantId, zoneId: zone.id }).unwrap();
      toast({ title: `Zone "${zone.name}" deleted` });
      refetch();
      onZoneChange?.();
    } catch {
      toast({ title: 'Failed to delete zone', variant: 'destructive' });
    }
  };

  const openEdit = (zone: ZoneResponse) => {
    setEditingZone(zone);
    setZoneName(zone.name);
    setIsEditOpen(true);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 max-w-sm">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card">
          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground tabular-nums">{zones.length}</p>
            <p className="text-xs text-muted-foreground">Zones</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card">
          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Table2 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground tabular-nums">{totalTables}</p>
            <p className="text-xs text-muted-foreground">Tables assigned</p>
          </div>
        </div>
      </div>

      {/* Main panel */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
          <div>
            <p className="text-sm font-semibold text-foreground">All Zones</p>
            {!isLoading && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {zones.length} {zones.length === 1 ? 'zone' : 'zones'} configured
              </p>
            )}
          </div>
          <Button
            size="sm"
            className="h-9 gap-1.5 text-sm"
            onClick={() => { setZoneName(''); setIsCreateOpen(true); }}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Zone
          </Button>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[2fr_1fr_1.5fr_40px] gap-4 px-4 py-2.5 border-b border-border bg-muted/30">
          {['Zone Name', 'Tables', 'Created', ''].map((h) => (
            <span
              key={h}
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            >
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        <div className="divide-y divide-border">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <ZoneRowSkeleton key={i} />)
          ) : zones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">No zones yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Create zones to organise your tables — e.g. Main Hall, Terrace, Bar
              </p>
              <Button
                size="sm"
                className="mt-4 gap-1.5"
                onClick={() => { setZoneName(''); setIsCreateOpen(true); }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add First Zone
              </Button>
            </div>
          ) : (
            zones.map((zone) => (
              <div
                key={zone.id}
                className="grid grid-cols-[2fr_1fr_1.5fr_40px] gap-4 px-4 py-3.5 items-center hover:bg-muted/30 transition-colors group"
              >
                {/* Name */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-semibold text-foreground truncate">
                    {zone.name}
                  </span>
                </div>

                {/* Table count */}
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'text-sm tabular-nums font-medium',
                      zone.tableCount > 0 ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {zone.tableCount}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {zone.tableCount === 1 ? 'table' : 'tables'}
                  </span>
                </div>

                {/* Created date */}
                <span className="text-sm text-muted-foreground">
                  {new Date(zone.createdAt).toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem onClick={() => openEdit(zone)}>
                      <Edit className="h-3.5 w-3.5 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDelete(zone)}
                      disabled={zone.tableCount > 0}
                      className="text-destructive focus:text-destructive disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {!isLoading && zones.length > 0 && (
          <div className="px-4 py-2.5 border-t border-border bg-muted/20">
            <p className="text-xs text-muted-foreground">
              Zones with tables cannot be deleted — reassign tables first
            </p>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <ZoneFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        title="Create New Zone"
        description="Add a zone to organise your tables"
        value={zoneName}
        onChange={setZoneName}
        onSubmit={handleCreate}
        submitLabel="Create Zone"
      />
      <ZoneFormDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        title="Rename Zone"
        description={`Update the name for "${editingZone?.name}"`}
        value={zoneName}
        onChange={setZoneName}
        onSubmit={handleEdit}
        submitLabel="Save Changes"
      />
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

const ZonesManagementPage = () => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  useBranchAwareQueries();

  if (!restaurantId) return <Navigate to="/auth" replace />;

  return (
    <div className="container mx-auto px-6 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground tracking-tight">
          Zones Management
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Organise your tables into zones for easier management
        </p>
      </div>
      <ZoneManagementPanel restaurantId={restaurantId} />
    </div>
  );
};

export default ZonesManagementPage;