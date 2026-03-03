import React, { useState, useMemo } from 'react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  MoreHorizontal,
  Edit,
  QrCode,
  Search,
  MapPin,
  Users,
  Archive,
  RotateCcw,
  UserPlus,
  UserMinus,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
} from 'lucide-react';
import {
  useListRestaurantTablesByBranchQuery,
  useCreateRestaurantTableMutation,
  useUpdateRestaurantTableMutation,
  useArchiveRestaurantTableMutation,
  useReactivateRestaurantTableMutation,
  useGenerateRestaurantTableQrMutation,
  useBulkCreateRestaurantTablesMutation,
  useGetZonesByBranchQuery,
  useUpdateTableStatusMutation,
  useGetTableStatusQuery,
} from '@/store/api/restaurantsApi';
import { useListWaitersByBranchQuery } from '@/store/api/staffApi';
import { TableStatusType } from '@/store/api/types';
import type { RestaurantTable, StaffMember } from '@/store/api/types';
import { cn } from '@/lib/utils';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface TableFormData {
  tableNumber: string;
  displayName: string;
  capacity: string;
  zone: string;
  displayOrder: string;
}

interface BulkFormData {
  tablePrefix: string;
  capacity: string;
  zone: string;
  layout: '4' | '6' | '8' | '16';
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const EMPTY_TABLE_FORM: TableFormData = {
  tableNumber: '',
  displayName: '',
  capacity: '',
  zone: '',
  displayOrder: '',
};

const EMPTY_BULK_FORM: BulkFormData = {
  tablePrefix: '',
  capacity: '',
  zone: '',
  layout: '4',
};

function getWaiterInitials(waiter: StaffMember): string {
  const name = waiter.displayName || waiter.name;
  return (
    name?.split(' ').map((n) => n.charAt(0)).join('').toUpperCase() ||
    waiter.email?.charAt(0).toUpperCase() ||
    'W'
  );
}

// ─── Form Field ────────────────────────────────────────────────────────────────

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </Label>
      {children}
    </div>
  );
}

// ─── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ring-1',
        isActive
          ? 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20'
          : 'bg-muted text-muted-foreground ring-border'
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          isActive ? 'bg-emerald-500' : 'bg-muted-foreground/40'
        )}
      />
      {isActive ? 'Active' : 'Archived'}
    </span>
  );
}

// ─── Zone Badge ────────────────────────────────────────────────────────────────

function ZoneBadge({ zone }: { zone: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
      <MapPin className="h-2.5 w-2.5" />
      {zone}
    </span>
  );
}

// ─── Table Row Skeleton ────────────────────────────────────────────────────────

function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 border-b border-border animate-pulse">
      <div className="h-8 w-8 rounded-lg bg-muted shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 bg-muted rounded w-20" />
        <div className="h-3 bg-muted rounded w-32" />
      </div>
      <div className="h-5 bg-muted rounded w-16" />
      <div className="h-5 bg-muted rounded w-12" />
      <div className="h-5 bg-muted rounded w-14" />
      <div className="h-7 w-7 bg-muted rounded" />
    </div>
  );
}

// ─── Waiter Assignment Dialog ──────────────────────────────────────────────────

function WaiterAssignmentDialog({
  isOpen,
  onOpenChange,
  table,
  restaurantId,
  onAssignmentSuccess,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  table: RestaurantTable | null;
  restaurantId: string;
  onAssignmentSuccess?: () => void;
}) {
  const { toast } = useToast();
  const { currentBranch } = useBranchContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const branchId = currentBranch?._id;

  const { data: waiters, isLoading: isLoadingWaiters, error: waitersError } =
    useListWaitersByBranchQuery(
      branchId ? { branchId } : skipToken,
      { skip: !branchId || !isOpen }
    );

  const { data: tableStatus, isLoading: isLoadingStatus } =
    useGetTableStatusQuery(
      restaurantId && table
        ? { restaurantId, tableId: table.id }
        : skipToken,
      { skip: !restaurantId || !table || !isOpen }
    );

  const [updateTableStatus] = useUpdateTableStatusMutation();

  const filteredWaiters = waiters?.filter((w) => {
    const name = w.displayName || w.name;
    return (
      name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const currentlyAssignedId = tableStatus?.assignedServerId;
  const currentlyAssigned = waiters?.find((w) => w.id === currentlyAssignedId);

  const handleAssign = async (waiterId: string | null) => {
    if (!table || !restaurantId) return;
    setIsAssigning(true);
    try {
      await updateTableStatus({
        restaurantId,
        tableId: table.id,
        body: { status: TableStatusType.Available, assignedServerId: waiterId || '' },
      }).unwrap();

      const waiter = waiters?.find((w) => w.id === waiterId);
      toast({
        title: waiterId ? 'Waiter assigned' : 'Assignment removed',
        description: waiterId
          ? `${waiter?.displayName || waiter?.name} assigned to table ${table.tableNumber}`
          : `Removed assignment from table ${table.tableNumber}`,
      });

      onOpenChange(false);
      onAssignmentSuccess?.();
    } catch (error) {
      toast({
        title: 'Failed to update assignment',
        description: error instanceof Error ? error.message : 'Unexpected error',
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border shrink-0">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <UserPlus className="h-3.5 w-3.5 text-primary" />
            </div>
            Assign Waiter
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            Table <span className="font-semibold text-foreground">{table?.tableNumber}</span>
            {table?.displayName && ` · ${table.displayName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col px-5 py-4 gap-4 overflow-hidden">
          {/* Currently assigned */}
          {currentlyAssigned && (
            <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={currentlyAssigned.photoURL || undefined} />
                  <AvatarFallback className="text-xs font-bold bg-emerald-600 text-white">
                    {getWaiterInitials(currentlyAssigned)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold text-foreground leading-tight">
                    {currentlyAssigned.displayName || currentlyAssigned.name}
                  </p>
                  <p className="text-xs text-emerald-600 flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="h-3 w-3" />
                    Currently assigned
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAssign(null)}
                disabled={isAssigning}
                className="h-7 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1"
              >
                <UserMinus className="h-3.5 w-3.5" />
                Remove
              </Button>
            </div>
          )}

          {/* Search */}
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search waiters..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-sm"
              disabled={isAssigning}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Waiters list */}
          <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 space-y-1.5">
            {waitersError ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <AlertCircle className="h-8 w-8 text-destructive/50 mb-2" />
                <p className="text-sm font-medium text-foreground">Failed to load waiters</p>
                <p className="text-xs text-muted-foreground mt-1">Check your connection and try again</p>
              </div>
            ) : isLoadingWaiters || isLoadingStatus ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border animate-pulse">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                  <Skeleton className="h-7 w-16 rounded-lg" />
                </div>
              ))
            ) : !filteredWaiters?.length ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  {searchTerm ? 'No matching waiters' : 'No waiters available'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {searchTerm ? 'Try a different search' : 'Add waiters to your staff first'}
                </p>
              </div>
            ) : (
              filteredWaiters.map((waiter) => {
                const assigned = waiter.id === currentlyAssignedId;
                return (
                  <div
                    key={waiter.id}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors',
                      assigned
                        ? 'border-emerald-500/20 bg-emerald-500/5'
                        : 'border-border hover:bg-muted/50'
                    )}
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={waiter.photoURL || undefined} />
                      <AvatarFallback className="text-xs font-bold bg-muted text-muted-foreground">
                        {getWaiterInitials(waiter)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {waiter.displayName || waiter.name || 'Unnamed'}
                        </p>
                        {assigned && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {waiter.email}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant={assigned ? 'secondary' : 'default'}
                      onClick={() => !assigned && handleAssign(waiter.id)}
                      disabled={isAssigning || assigned}
                      className="h-7 text-xs shrink-0"
                    >
                      {assigned ? 'Assigned' : 'Assign'}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter className="px-5 py-3 border-t border-border shrink-0">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={isAssigning}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Table Form Dialog ─────────────────────────────────────────────────────────

function TableFormDialog({
  open,
  onOpenChange,
  title,
  description,
  form,
  setForm,
  onSubmit,
  submitLabel,
  zones,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  form: TableFormData;
  setForm: (f: TableFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  zones: any[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border">
          <DialogTitle className="text-base font-bold">{title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-0.5">
            {description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <div className="px-5 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Table Number *">
                <Input
                  value={form.tableNumber}
                  onChange={(e) => setForm({ ...form, tableNumber: e.target.value })}
                  placeholder="e.g. T1"
                  className="h-9 text-sm"
                  required
                />
              </FormField>
              <FormField label="Display Name">
                <Input
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  placeholder="Optional"
                  className="h-9 text-sm"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Capacity">
                <Input
                  type="number"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  placeholder="4"
                  className="h-9 text-sm"
                  min="1"
                  max="20"
                />
              </FormField>
              <FormField label="Display Order">
                <Input
                  type="number"
                  value={form.displayOrder}
                  onChange={(e) => setForm({ ...form, displayOrder: e.target.value })}
                  placeholder="0"
                  className="h-9 text-sm"
                  min="0"
                />
              </FormField>
            </div>

            <FormField label="Zone">
              <Select
                value={form.zone}
                onValueChange={(v) => setForm({ ...form, zone: v === 'none' ? '' : v })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="No zone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No zone</SelectItem>
                  {zones.map((z) => (
                    <SelectItem key={z.id} value={z.name}>{z.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
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

// ─── Bulk Create Dialog ────────────────────────────────────────────────────────

function BulkCreateDialog({
  open,
  onOpenChange,
  form,
  setForm,
  onSubmit,
  zones,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  form: BulkFormData;
  setForm: (f: BulkFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  zones: any[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border">
          <DialogTitle className="text-base font-bold">Bulk Create Tables</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-0.5">
            Create multiple tables at once with a shared configuration
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <div className="px-5 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Table Prefix">
                <Input
                  value={form.tablePrefix}
                  onChange={(e) => setForm({ ...form, tablePrefix: e.target.value })}
                  placeholder="T"
                  className="h-9 text-sm"
                />
              </FormField>
              <FormField label="Capacity">
                <Input
                  type="number"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  placeholder="4"
                  className="h-9 text-sm"
                  min="1"
                  max="20"
                />
              </FormField>
            </div>

            <FormField label="Number of Tables">
              <Select
                value={form.layout}
                onValueChange={(v: '4' | '6' | '8' | '16') =>
                  setForm({ ...form, layout: v })
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['4', '6', '8', '16'] as const).map((n) => (
                    <SelectItem key={n} value={n}>{n} Tables</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Zone">
              <Select
                value={form.zone}
                onValueChange={(v) => setForm({ ...form, zone: v === 'none' ? '' : v })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="No zone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No zone</SelectItem>
                  {zones.map((z) => (
                    <SelectItem key={z.id} value={z.name}>{z.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
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
            <Button type="submit" size="sm">
              Create {form.layout} Tables
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Table Management Panel ────────────────────────────────────────────────────

function TableManagementPanel({ restaurantId }: { restaurantId: string }) {
  const { toast } = useToast();
  const { currentBranch } = useBranchContext();
  const branchId = currentBranch?._id;

  const { data: tables, isLoading, refetch } =
    useListRestaurantTablesByBranchQuery(
      restaurantId && branchId ? { restaurantId, branchId } : skipToken
    );

  const { data: zonesData } = useGetZonesByBranchQuery(
    restaurantId && branchId ? { restaurantId, branchId } : skipToken
  );

  const [createTable] = useCreateRestaurantTableMutation();
  const [updateTable] = useUpdateRestaurantTableMutation();
  const [archiveTable] = useArchiveRestaurantTableMutation();
  const [reactivateTable] = useReactivateRestaurantTableMutation();
  const [generateQrCode] = useGenerateRestaurantTableQrMutation();
  const [bulkCreateTables] = useBulkCreateRestaurantTablesMutation();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedZone, setSelectedZone] = useState('all');
  const [showArchived, setShowArchived] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isWaiterOpen, setIsWaiterOpen] = useState(false);

  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [waiterTable, setWaiterTable] = useState<RestaurantTable | null>(null);
  const [tableForm, setTableForm] = useState<TableFormData>(EMPTY_TABLE_FORM);
  const [bulkForm, setBulkForm] = useState<BulkFormData>(EMPTY_BULK_FORM);

  const zones = zonesData?.zones || [];

  const filteredTables = useMemo(() => {
    if (!tables) return [];
    return tables.filter((t) => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        t.tableNumber.toLowerCase().includes(q) ||
        (t.displayName || '').toLowerCase().includes(q);
      const matchZone = selectedZone === 'all' || t.zone === selectedZone;
      const matchArchived = showArchived ? !t.isActive : t.isActive;
      return matchSearch && matchZone && matchArchived;
    });
  }, [tables, searchTerm, selectedZone, showArchived]);

  // Stats
  const stats = useMemo(() => {
    if (!tables) return { total: 0, active: 0, zones: 0 };
    return {
      total: tables.length,
      active: tables.filter((t) => t.isActive).length,
      zones: new Set(tables.map((t) => t.zone).filter(Boolean)).size,
    };
  }, [tables]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTable({
        restaurantId,
        body: {
          tableNumber: tableForm.tableNumber,
          displayName: tableForm.displayName || undefined,
          capacity: parseInt(tableForm.capacity) || undefined,
          zone: tableForm.zone || undefined,
          displayOrder: parseInt(tableForm.displayOrder) || 0,
        },
      }).unwrap();
      toast({ title: `Table ${tableForm.tableNumber} created` });
      setIsCreateOpen(false);
      setTableForm(EMPTY_TABLE_FORM);
      refetch();
    } catch (error) {
      toast({ title: 'Failed to create table', variant: 'destructive' });
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable) return;
    try {
      await updateTable({
        restaurantId,
        tableId: editingTable.id,
        body: {
          tableNumber: tableForm.tableNumber,
          displayName: tableForm.displayName || undefined,
          capacity: parseInt(tableForm.capacity) || undefined,
          zone: tableForm.zone || undefined,
          displayOrder: parseInt(tableForm.displayOrder) || 0,
        },
      }).unwrap();
      toast({ title: `Table ${tableForm.tableNumber} updated` });
      setIsEditOpen(false);
      setEditingTable(null);
      setTableForm(EMPTY_TABLE_FORM);
      refetch();
    } catch {
      toast({ title: 'Failed to update table', variant: 'destructive' });
    }
  };

  const handleBulkCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await bulkCreateTables({
        restaurantId,
        body: {
          tablePrefix: bulkForm.tablePrefix || undefined,
          capacity: parseInt(bulkForm.capacity) || undefined,
          zone: bulkForm.zone || undefined,
          layout: bulkForm.layout,
        },
      }).unwrap();
      toast({ title: `${bulkForm.layout} tables created` });
      setIsBulkOpen(false);
      setBulkForm(EMPTY_BULK_FORM);
      refetch();
    } catch {
      toast({ title: 'Failed to create tables', variant: 'destructive' });
    }
  };

  const handleArchive = async (table: RestaurantTable) => {
    try {
      await archiveTable({ restaurantId, tableId: table.id }).unwrap();
      toast({ title: `Table ${table.tableNumber} archived` });
      refetch();
    } catch {
      toast({ title: 'Failed to archive table', variant: 'destructive' });
    }
  };

  const handleReactivate = async (table: RestaurantTable) => {
    try {
      await reactivateTable({ restaurantId, tableId: table.id }).unwrap();
      toast({ title: `Table ${table.tableNumber} reactivated` });
      refetch();
    } catch {
      toast({ title: 'Failed to reactivate table', variant: 'destructive' });
    }
  };

  const handleGenerateQR = async (table: RestaurantTable) => {
    try {
      const result = await generateQrCode({ restaurantId, tableId: table.id }).unwrap();
      const link = document.createElement('a');
      link.href = result.dataUrl;
      link.download = `table-${table.tableNumber}-qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: `QR code downloaded for table ${table.tableNumber}` });
    } catch {
      toast({ title: 'Failed to generate QR code', variant: 'destructive' });
    }
  };

  const openEdit = (table: RestaurantTable) => {
    setEditingTable(table);
    setTableForm({
      tableNumber: table.tableNumber,
      displayName: table.displayName || '',
      capacity: table.capacity?.toString() || '',
      zone: table.zone || '',
      displayOrder: table.displayOrder?.toString() || '0',
    });
    setIsEditOpen(true);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Tables', value: stats.total, icon: Layers },
          { label: 'Active', value: stats.active, icon: CheckCircle2 },
          { label: 'Zones', value: stats.zones, icon: MapPin },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card"
          >
            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main panel */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search tables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Zone filter */}
          <Select value={selectedZone} onValueChange={setSelectedZone}>
            <SelectTrigger className="h-9 w-40 text-sm">
              <SelectValue placeholder="All zones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All zones</SelectItem>
              {zones.map((z) => (
                <SelectItem key={z.id} value={z.name}>{z.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Archived toggle */}
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={cn(
              'flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm font-medium transition-colors',
              showArchived
                ? 'bg-foreground text-background border-foreground'
                : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <Archive className="h-3.5 w-3.5" />
            {showArchived ? 'Archived' : 'Show Archived'}
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBulkOpen(true)}
              className="h-9 gap-1.5 text-sm"
            >
              <Layers className="h-3.5 w-3.5" />
              Bulk Create
            </Button>
            <Button
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="h-9 gap-1.5 text-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Table
            </Button>
          </div>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[2fr_2fr_1fr_1.5fr_1fr_1fr_40px] gap-4 px-4 py-2.5 border-b border-border bg-muted/30">
          {['Table #', 'Display Name', 'Capacity', 'Zone', 'Order', 'Status', ''].map(
            (h) => (
              <span key={h} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
                {h}
              </span>
            )
          )}
        </div>

        {/* Rows */}
        <div className="divide-y divide-border">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} />)
          ) : filteredTables.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Layers className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">No tables found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchTerm ? 'Try a different search' : showArchived ? 'No archived tables' : 'Add your first table'}
              </p>
              {!searchTerm && !showArchived && (
                <Button size="sm" className="mt-4 gap-1.5" onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  Add Table
                </Button>
              )}
            </div>
          ) : (
            filteredTables.map((table) => (
              <div
                key={table.id}
                className="grid grid-cols-[2fr_2fr_1fr_1.5fr_1fr_1fr_40px] gap-4 px-4 py-3.5 items-center hover:bg-muted/30 transition-colors group"
              >
                {/* Table number */}
                <span className="text-sm font-bold text-foreground font-mono">
                  {table.tableNumber}
                </span>

                {/* Display name */}
                <span className="text-sm text-muted-foreground truncate">
                  {table.displayName || '—'}
                </span>

                {/* Capacity */}
                <div className="flex items-center gap-1.5 text-sm text-foreground">
                  {table.capacity ? (
                    <>
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{table.capacity}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>

                {/* Zone */}
                <div>
                  {table.zone ? (
                    <ZoneBadge zone={table.zone} />
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </div>

                {/* Display order */}
                <span className="text-sm text-muted-foreground tabular-nums">
                  {table.displayOrder ?? '—'}
                </span>

                {/* Status */}
                <StatusBadge isActive={table.isActive} />

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => openEdit(table)}>
                      <Edit className="h-3.5 w-3.5 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => { setWaiterTable(table); setIsWaiterOpen(true); }}
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-2" />
                      Assign Waiter
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleGenerateQR(table)}>
                      <QrCode className="h-3.5 w-3.5 mr-2" />
                      Download QR
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {table.isActive ? (
                      <DropdownMenuItem
                        onClick={() => handleArchive(table)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Archive className="h-3.5 w-3.5 mr-2" />
                        Archive
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => handleReactivate(table)}>
                        <RotateCcw className="h-3.5 w-3.5 mr-2" />
                        Reactivate
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>

        {/* Footer count */}
        {!isLoading && filteredTables.length > 0 && (
          <div className="px-4 py-2.5 border-t border-border bg-muted/20">
            <p className="text-xs text-muted-foreground">
              Showing {filteredTables.length} of {tables?.length ?? 0} tables
            </p>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <TableFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        title="Create New Table"
        description="Add a new table to your restaurant"
        form={tableForm}
        setForm={setTableForm}
        onSubmit={handleCreate}
        submitLabel="Create Table"
        zones={zones}
      />

      <TableFormDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        title="Edit Table"
        description="Update table information"
        form={tableForm}
        setForm={setTableForm}
        onSubmit={handleEdit}
        submitLabel="Save Changes"
        zones={zones}
      />

      <BulkCreateDialog
        open={isBulkOpen}
        onOpenChange={setIsBulkOpen}
        form={bulkForm}
        setForm={setBulkForm}
        onSubmit={handleBulkCreate}
        zones={zones}
      />

      <WaiterAssignmentDialog
        isOpen={isWaiterOpen}
        onOpenChange={setIsWaiterOpen}
        table={waiterTable}
        restaurantId={restaurantId}
        onAssignmentSuccess={refetch}
      />
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

const TablesManagementPage = () => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  useBranchAwareQueries();

  if (!restaurantId) return <Navigate to="/auth" replace />;

  return (
    <div className="container mx-auto px-6 py-6 space-y-1">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground tracking-tight">Tables Management</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage tables, zones, and waiter assignments
        </p>
      </div>
      <TableManagementPanel restaurantId={restaurantId} />
    </div>
  );
};

export default TablesManagementPage;