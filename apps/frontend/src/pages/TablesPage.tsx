import { useCallback, useMemo, useState } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
import { Navigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import {
  useArchiveRestaurantTableMutation,
  useCreateRestaurantTableMutation,
  useGenerateRestaurantTableQrMutation,
  useListRestaurantTablesQuery,
  useReactivateRestaurantTableMutation,
  useUpdateRestaurantTableMutation,
} from '@/store/api/restaurantsApi';
import type { RestaurantQrCodeResponse, RestaurantTable } from '@/store/api/types';

interface TableFormState {
  tableNumber: string;
  displayName: string;
  capacity: string;
  zone: string;
  displayOrder: string;
}

const emptyForm: TableFormState = {
  tableNumber: '',
  displayName: '',
  capacity: '',
  zone: '',
  displayOrder: '',
};

const TablesPage = () => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const { toast } = useToast();
  const [showInactive, setShowInactive] = useState(false);
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [form, setForm] = useState<TableFormState>(emptyForm);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [qrPreview, setQrPreview] = useState<{
    table: RestaurantTable;
    payload: RestaurantQrCodeResponse;
  } | null>(null);

  const queryArgs = restaurantId
    ? { restaurantId, includeInactive: showInactive }
    : skipToken;

  const {
    data: tables = [],
    isLoading,
    refetch,
  } = useListRestaurantTablesQuery(queryArgs, {
    skip: !restaurantId,
  });

  const [createTable, { isLoading: isCreating }] =
    useCreateRestaurantTableMutation();
  const [updateTable, { isLoading: isUpdating }] =
    useUpdateRestaurantTableMutation();
  const [archiveTable, { isLoading: isArchiving }] =
    useArchiveRestaurantTableMutation();
  const [reactivateTable, { isLoading: isReactivating }] =
    useReactivateRestaurantTableMutation();
  const [generateQr, { isLoading: isGeneratingQr }] =
    useGenerateRestaurantTableQrMutation();

  const zones = useMemo(() => {
    const unique = new Set<string>();
    tables.forEach((table) => {
      if (table.zone) unique.add(table.zone);
    });
    return Array.from(unique);
  }, [tables]);

  const filteredTables = useMemo(() => {
    return tables.filter((table) => {
      if (zoneFilter !== 'all' && table.zone !== zoneFilter) {
        return false;
      }
      if (!showInactive && !table.isActive) {
        return false;
      }
      return true;
    });
  }, [tables, zoneFilter, showInactive]);

  const stats = useMemo(() => {
    const active = tables.filter((table) => table.isActive).length;
    const inactive = tables.length - active;
    const capacity = tables.reduce((sum, table) => sum + (table.capacity ?? 0), 0);
    return { active, inactive, capacity, total: tables.length };
  }, [tables]);

  if (!restaurantId) {
    return <Navigate to="/onboarding" replace />;
  }

  const handleFormChange = (field: keyof TableFormState) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!restaurantId || !form.tableNumber.trim()) {
      toast({
        title: 'Table code required',
        description: 'Enter a table number before saving.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createTable({
        restaurantId,
        body: {
          tableNumber: form.tableNumber.trim(),
          displayName: form.displayName.trim() || undefined,
          capacity: form.capacity ? Number(form.capacity) : undefined,
          zone: form.zone.trim() || undefined,
          displayOrder: form.displayOrder ? Number(form.displayOrder) : undefined,
        },
      }).unwrap();
      toast({ title: 'Table added' });
      setForm(emptyForm);
      refetch();
    } catch (error) {
      toast({
        title: 'Unable to add table',
        description:
          error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleOpenEdit = (table: RestaurantTable) => {
    setEditingTable(table);
    setForm({
      tableNumber: table.tableNumber,
      displayName: table.displayName ?? '',
      capacity: table.capacity ? String(table.capacity) : '',
      zone: table.zone ?? '',
      displayOrder: table.displayOrder ? String(table.displayOrder) : '',
    });
    setIsEditOpen(true);
  };

  const resetForm = useCallback(() => {
    setForm(emptyForm);
    setEditingTable(null);
    setIsEditOpen(false);
  }, []);

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!restaurantId || !editingTable) return;

    try {
      await updateTable({
        restaurantId,
        tableId: editingTable.id,
        body: {
          tableNumber: form.tableNumber.trim(),
          displayName: form.displayName.trim() || undefined,
          capacity: form.capacity ? Number(form.capacity) : undefined,
          zone: form.zone.trim() || undefined,
          displayOrder: form.displayOrder ? Number(form.displayOrder) : undefined,
        },
      }).unwrap();
      toast({ title: 'Table updated' });
      resetForm();
      refetch();
    } catch (error) {
      toast({
        title: 'Unable to update table',
        description:
          error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleArchiveToggle = async (table: RestaurantTable) => {
    if (!restaurantId) return;
    try {
      if (table.isActive) {
        await archiveTable({ restaurantId, tableId: table.id }).unwrap();
        toast({ title: `Table ${table.tableNumber} archived` });
      } else {
        await reactivateTable({ restaurantId, tableId: table.id }).unwrap();
        toast({ title: `Table ${table.tableNumber} reactivated` });
      }
      refetch();
    } catch (error) {
      toast({
        title: 'Unable to update table status',
        description:
          error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateQr = async (table: RestaurantTable) => {
    if (!restaurantId) return;
    try {
      const payload = await generateQr({
        restaurantId,
        tableId: table.id,
      }).unwrap();
      setQrPreview({ table, payload });
      toast({ title: `QR ready for Table ${table.tableNumber}` });
    } catch (error) {
      toast({
        title: 'Unable to generate QR code',
        description:
          error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleCopyQrLink = async (url: string) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      toast({
        title: 'Clipboard unavailable',
        description: 'Your browser does not allow copying links automatically.',
        variant: 'destructive',
      });
      return;
    }
    await navigator.clipboard.writeText(url);
    toast({ title: 'Link copied to clipboard' });
  };

  const isBusy = isCreating || isUpdating || isArchiving || isReactivating;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Table management</h1>
        <p className="text-muted-foreground">
          Configure dining tables, generate QR codes, and keep staff aligned on seating.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total tables</CardDescription>
            <CardTitle className="text-3xl font-semibold">
              {stats.total}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-3xl font-semibold">
              {stats.active}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Inactive</CardDescription>
            <CardTitle className="text-3xl font-semibold">
              {stats.inactive}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Seating capacity</CardDescription>
            <CardTitle className="text-3xl font-semibold">
              {stats.capacity}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add table</CardTitle>
          <CardDescription>
            Create table records to auto-fill tickets and generate table-specific QR codes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-5" onSubmit={handleCreate}>
            <div className="md:col-span-1 space-y-2">
              <Label htmlFor="tableNumber">Table code</Label>
              <Input
                id="tableNumber"
                value={form.tableNumber}
                onChange={(event) => handleFormChange('tableNumber')(event.target.value)}
                placeholder="T1"
                required
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                value={form.displayName}
                onChange={(event) => handleFormChange('displayName')(event.target.value)}
                placeholder="Window corner"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                min={1}
                max={20}
                value={form.capacity}
                onChange={(event) => handleFormChange('capacity')(event.target.value)}
                placeholder="4"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zone">Zone</Label>
              <Input
                id="zone"
                value={form.zone}
                onChange={(event) => handleFormChange('zone')(event.target.value)}
                placeholder="Patio"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayOrder">Display order</Label>
              <Input
                id="displayOrder"
                type="number"
                min={0}
                max={999}
                value={form.displayOrder}
                onChange={(event) => handleFormChange('displayOrder')(event.target.value)}
                placeholder="10"
              />
            </div>
            <div className="md:col-span-5 flex justify-end">
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Adding…' : 'Add table'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-lg">Tables</CardTitle>
            <CardDescription>
              Manage seating assignments and keep QR codes in sync with table numbers.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="flex items-center gap-2">
              <Switch
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label htmlFor="show-inactive" className="text-sm">
                Show inactive tables
              </Label>
            </div>
            <Select value={zoneFilter} onValueChange={setZoneFilter}>
              <SelectTrigger className="md:w-48">
                <SelectValue placeholder="Filter by zone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All zones</SelectItem>
                {zones.map((zone) => (
                  <SelectItem key={zone} value={zone}>
                    {zone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <LoadingSpinner size="lg" />
            </div>
          ) : tables.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No tables yet. Add your first table to begin printing QR codes.
            </div>
          ) : filteredTables.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No tables match the current filters.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredTables.map((table) => (
                <Card
                  key={table.id}
                  className={`border ${table.isActive ? 'border-muted' : 'border-dashed border-muted-foreground/40 bg-muted/20'}`}
                >
                  <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-semibold">
                        {table.tableNumber}
                      </CardTitle>
                      <CardDescription>
                        {table.displayName || 'No nickname'}
                      </CardDescription>
                    </div>
                    <Badge variant={table.isActive ? 'default' : 'outline'}>
                      {table.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <span>Capacity</span>
                      <span className="text-right">
                        {table.capacity ?? '—'}
                      </span>
                      <span>Zone</span>
                      <span className="text-right">
                        {table.zone ?? '—'}
                      </span>
                      <span>Display order</span>
                      <span className="text-right">{table.displayOrder}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEdit(table)}
                        disabled={isBusy}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGenerateQr(table)}
                        disabled={isGeneratingQr}
                      >
                        {isGeneratingQr ? 'Generating…' : 'QR code'}
                      </Button>
                      <Button
                        size="sm"
                        variant={table.isActive ? 'secondary' : 'default'}
                        onClick={() => handleArchiveToggle(table)}
                        disabled={isBusy}
                      >
                        {table.isActive ? 'Archive' : 'Activate'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {qrPreview && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-lg">
                QR for Table {qrPreview.table.tableNumber}
              </CardTitle>
              <CardDescription>
                {qrPreview.payload.restaurant.name} •{' '}
                {qrPreview.payload.table
                  ? `Table ${qrPreview.payload.table}`
                  : 'Generic QR'}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setQrPreview(null)}
            >
              Dismiss
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3 md:flex-row md:items-start md:gap-6">
            <img
              src={qrPreview.payload.dataUrl}
              alt={`QR for table ${qrPreview.table.tableNumber}`}
              className="h-48 w-48 rounded-xl border bg-white p-3 shadow"
            />
            <div className="flex flex-1 flex-col gap-2 text-sm text-muted-foreground">
              <p>
                Share or print this QR code so guests at the table can scan and order.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleCopyQrLink(qrPreview.payload.url)}
                >
                  Copy link
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = qrPreview.payload.dataUrl;
                    link.download = `restohand-${qrPreview.payload.restaurant.slug}-${qrPreview.table.tableNumber}.png`;
                    link.click();
                  }}
                >
                  Download PNG
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isEditOpen} onOpenChange={(open) => (open ? setIsEditOpen(true) : resetForm())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit table</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handleUpdate}>
            <div className="space-y-2">
              <Label htmlFor="edit-tableNumber">Table code</Label>
              <Input
                id="edit-tableNumber"
                value={form.tableNumber}
                onChange={(event) => handleFormChange('tableNumber')(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-displayName">Display name</Label>
              <Input
                id="edit-displayName"
                value={form.displayName}
                onChange={(event) => handleFormChange('displayName')(event.target.value)}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="edit-capacity">Capacity</Label>
                <Input
                  id="edit-capacity"
                  type="number"
                  min={1}
                  max={20}
                  value={form.capacity}
                  onChange={(event) =>
                    handleFormChange('capacity')(event.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-zone">Zone</Label>
                <Input
                  id="edit-zone"
                  value={form.zone}
                  onChange={(event) => handleFormChange('zone')(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-displayOrder">Display order</Label>
                <Input
                  id="edit-displayOrder"
                  type="number"
                  min={0}
                  max={999}
                  value={form.displayOrder}
                  onChange={(event) =>
                    handleFormChange('displayOrder')(event.target.value)
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TablesPage;
