import { useCallback, useState, useMemo } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
import { Navigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Stage, Layer, Text } from 'react-konva';
import { TableShape } from '@/components/floor-plan/TableShape';
import { Plus, Trash2 } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import {
  useArchiveRestaurantTableMutation,
  useCreateRestaurantTableMutation,
  useGenerateRestaurantTableQrMutation,
  useListRestaurantTablesQuery,
  useUpdateRestaurantTableMutation,
} from '@/store/api/restaurantsApi';
import type {
  RestaurantQrCodeResponse,
  RestaurantTable,
} from '@/store/api/types';

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
  const { resolvedTheme } = useTheme();
  const [form, setForm] = useState<TableFormState>(emptyForm);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(
    null
  );
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [qrPreview, setQrPreview] = useState<{
    table: RestaurantTable;
    payload: RestaurantQrCodeResponse;
  } | null>(null);
  const [selectedTableForConfig, setSelectedTableForConfig] =
    useState<RestaurantTable | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isNewTableDialogOpen, setIsNewTableDialogOpen] = useState(false);
  const [newTableForm, setNewTableForm] = useState({
    tableNumber: '',
    displayName: '',
    capacity: '4',
    zone: '',
  });

  const queryArgs = restaurantId
    ? { restaurantId, includeInactive: false }
    : skipToken;

  const { data: tables = [], refetch } = useListRestaurantTablesQuery(
    queryArgs,
    {
      skip: !restaurantId,
    }
  );

  const [createTable, { isLoading: isCreating }] =
    useCreateRestaurantTableMutation();
  const [updateTable, { isLoading: isUpdating }] =
    useUpdateRestaurantTableMutation();
  const [archiveTable, { isLoading: isArchiving }] =
    useArchiveRestaurantTableMutation();
  const [generateQr, { isLoading: isGeneratingQr }] =
    useGenerateRestaurantTableQrMutation();

  const resetForm = useCallback(() => {
    setForm(emptyForm);
    setEditingTable(null);
    setIsEditOpen(false);
  }, []);

  const entranceTextColor = useMemo(() => {
    return resolvedTheme === 'dark'
      ? '#FFFFFF' // Pure white for dark mode
      : '#000000'; // Pure black for light mode
  }, [resolvedTheme]);

  if (!restaurantId) {
    return <Navigate to="/onboarding" replace />;
  }

  const handleFormChange = (field: keyof TableFormState) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

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
          displayOrder: form.displayOrder
            ? Number(form.displayOrder)
            : undefined,
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

  const handleTableDrag = async (
    table: RestaurantTable,
    x: number,
    y: number
  ) => {
    if (!restaurantId) return;
    try {
      await updateTable({
        restaurantId,
        tableId: table.id,
        body: {
          layoutX: Math.round(x),
          layoutY: Math.round(y),
        },
      }).unwrap();
      refetch();
    } catch (error) {
      toast({
        title: 'Unable to update table position',
        description:
          error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleCreateNewTable = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!restaurantId || !newTableForm.tableNumber.trim()) {
      toast({
        title: 'Table code required',
        description: 'Enter a table number before saving.',
        variant: 'destructive',
      });
      return;
    }

    const x = 200 + (tables.length % 5) * 150;
    const y = 150 + Math.floor(tables.length / 5) * 100;

    try {
      await createTable({
        restaurantId,
        body: {
          tableNumber: newTableForm.tableNumber.trim(),
          displayName: newTableForm.displayName.trim() || undefined,
          capacity: newTableForm.capacity
            ? Number(newTableForm.capacity)
            : undefined,
          zone: newTableForm.zone.trim() || undefined,
          layoutX: x,
          layoutY: y,
          layoutWidth: 80,
          layoutHeight: 80,
          layoutRotation: 0,
        },
      }).unwrap();
      toast({ title: `Table ${newTableForm.tableNumber} added to layout` });
      setNewTableForm({
        tableNumber: '',
        displayName: '',
        capacity: '4',
        zone: '',
      });
      setIsNewTableDialogOpen(false);
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

  const handleTableClick = (table: RestaurantTable) => {
    setSelectedTableForConfig(table);
    setIsConfigOpen(true);
  };

  const handleSaveTableConfig = async (
    updatedTable: Partial<RestaurantTable>
  ) => {
    if (!restaurantId || !selectedTableForConfig) return;

    try {
      await updateTable({
        restaurantId,
        tableId: selectedTableForConfig.id,
        body: updatedTable,
      }).unwrap();
      toast({ title: 'Table updated successfully' });
      setIsConfigOpen(false);
      setSelectedTableForConfig(null);
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

  const handleDeleteTable = async (table: RestaurantTable) => {
    if (!restaurantId) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete table ${table.tableNumber}? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await archiveTable({ restaurantId, tableId: table.id }).unwrap();
      toast({ title: `Table ${table.tableNumber} deleted successfully` });
      setIsConfigOpen(false);
      setSelectedTableForConfig(null);
      refetch();
    } catch (error) {
      toast({
        title: 'Unable to delete table',
        description:
          error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const isBusy = isCreating || isUpdating || isArchiving;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-lg">Table Layout</CardTitle>
            <CardDescription>
              Drag tables to position them in your restaurant layout.
            </CardDescription>
          </div>
          <Button
            onClick={() => setIsNewTableDialogOpen(true)}
            disabled={isBusy}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Table
          </Button>
        </CardHeader>
        <CardContent>
          <div
            className="border rounded-lg bg-muted/20 overflow-auto"
            style={{ height: '600px' }}
          >
            <Stage width={1000} height={600}>
              <Layer>
                {/* Entrance text */}
                <Text
                  text="ENTRANCE"
                  x={450}
                  y={570}
                  fontSize={16}
                  fontFamily="Inter, system-ui, sans-serif"
                  fill={entranceTextColor}
                  align="center"
                  width={100}
                />

                {/* Tables */}
                {tables.map((table, index) => {
                  // Provide different default positions for tables without saved layouts
                  const defaultX = table.layoutX ?? 200 + (index % 4) * 120;
                  const defaultY =
                    table.layoutY ?? 150 + Math.floor(index / 4) * 100;

                  return (
                    <TableShape
                      key={table.id}
                      table={{
                        id: table.id,
                        x: defaultX,
                        y: defaultY,
                        width: table.layoutWidth || 80,
                        height: table.layoutHeight || 80,
                        rotation: table.layoutRotation || 0,
                        shape: 'rectangle',
                        label: table.tableNumber,
                        capacity: table.capacity || 4,
                        zone: table.zone,
                        color: table.isActive
                          ? 'hsl(var(--primary) / 0.2)'
                          : 'hsl(var(--muted) / 0.5)',
                      }}
                      isSelected={false}
                      color={
                        table.isActive
                          ? 'hsl(var(--primary) / 0.2)'
                          : 'hsl(var(--muted) / 0.5)'
                      }
                      onSelect={() => handleTableClick(table)}
                      onDragEnd={(e) =>
                        handleTableDrag(table, e.target.x(), e.target.y())
                      }
                      scale={1}
                      isDraggable={true}
                    />
                  );
                })}
              </Layer>
            </Stage>
          </div>
        </CardContent>
      </Card>

      {/* New Table Dialog */}
      <Dialog
        open={isNewTableDialogOpen}
        onOpenChange={setIsNewTableDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Table</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="table-number">Table Number</Label>
              <Input
                id="table-number"
                placeholder="e.g. T1, A5"
                value={newTableForm.tableNumber}
                onChange={(e) =>
                  setNewTableForm({
                    ...newTableForm,
                    tableNumber: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="display-name">Display Name (Optional)</Label>
              <Input
                id="display-name"
                placeholder="e.g. Window Corner"
                value={newTableForm.displayName}
                onChange={(e) =>
                  setNewTableForm({
                    ...newTableForm,
                    displayName: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                placeholder="4"
                value={newTableForm.capacity}
                onChange={(e) =>
                  setNewTableForm({ ...newTableForm, capacity: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="zone">Zone (Optional)</Label>
              <Input
                id="zone"
                placeholder="e.g. Patio, Main Hall"
                value={newTableForm.zone}
                onChange={(e) =>
                  setNewTableForm({ ...newTableForm, zone: e.target.value })
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsNewTableDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateNewTable}
                disabled={isBusy || !newTableForm.tableNumber}
              >
                Create Table
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog
        open={!!qrPreview}
        onOpenChange={(open) => !open && setQrPreview(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              QR Code for Table {qrPreview?.table.tableNumber}
            </DialogTitle>
          </DialogHeader>
          {qrPreview && (
            <div className="flex flex-col items-center gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  {qrPreview.payload.restaurant.name} •{' '}
                  {qrPreview.payload.table
                    ? `Table ${qrPreview.payload.table}`
                    : 'Generic QR'}
                </p>
                <img
                  src={qrPreview.payload.dataUrl}
                  alt={`QR for table ${qrPreview.table.tableNumber}`}
                  className="h-48 w-48 rounded-xl border bg-white p-3 shadow mx-auto"
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Share or print this QR code so guests at the table can scan and
                order.
              </p>
              <div className="flex flex-col gap-2 w-full">
                <Button
                  variant="outline"
                  onClick={() => handleCopyQrLink(qrPreview.payload.url)}
                  className="w-full"
                >
                  Copy Link
                </Button>
                <Button
                  variant="default"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = qrPreview.payload.dataUrl;
                    link.download = `restohand-${qrPreview.payload.restaurant.slug}-${qrPreview.table.tableNumber}.png`;
                    link.click();
                  }}
                  className="w-full"
                >
                  Download PNG
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => (open ? setIsEditOpen(true) : resetForm())}
      >
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
                onChange={(event) =>
                  handleFormChange('tableNumber')(event.target.value)
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-displayName">Display name</Label>
              <Input
                id="edit-displayName"
                value={form.displayName}
                onChange={(event) =>
                  handleFormChange('displayName')(event.target.value)
                }
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
                  onChange={(event) =>
                    handleFormChange('zone')(event.target.value)
                  }
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

      {/* Table Configuration Dialog */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Configure Table {selectedTableForConfig?.tableNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedTableForConfig && (
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Table Number</Label>
                  <Input
                    value={selectedTableForConfig.tableNumber}
                    onChange={(e) =>
                      setSelectedTableForConfig({
                        ...selectedTableForConfig,
                        tableNumber: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Capacity</Label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={selectedTableForConfig.capacity || ''}
                    onChange={(e) =>
                      setSelectedTableForConfig({
                        ...selectedTableForConfig,
                        capacity: parseInt(e.target.value) || undefined,
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  value={selectedTableForConfig.displayName || ''}
                  onChange={(e) =>
                    setSelectedTableForConfig({
                      ...selectedTableForConfig,
                      displayName: e.target.value || undefined,
                    })
                  }
                  placeholder="Window corner"
                />
              </div>
              <div className="space-y-2">
                <Label>Zone</Label>
                <Input
                  value={selectedTableForConfig.zone || ''}
                  onChange={(e) =>
                    setSelectedTableForConfig({
                      ...selectedTableForConfig,
                      zone: e.target.value || undefined,
                    })
                  }
                  placeholder="Main dining"
                />
              </div>
              <div className="flex justify-between">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleGenerateQr(selectedTableForConfig)}
                    disabled={isGeneratingQr}
                  >
                    {isGeneratingQr ? 'Generating…' : 'Generate QR Code'}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteTable(selectedTableForConfig)}
                    disabled={isArchiving}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {isArchiving ? 'Deleting…' : 'Delete Table'}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setIsConfigOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() =>
                      handleSaveTableConfig(selectedTableForConfig)
                    }
                    disabled={isUpdating}
                  >
                    {isUpdating ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TablesPage;
