import React, { useState, useCallback } from 'react';
import { Plus, Grid3X3, Edit, Trash2, QrCode, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import {
  useCreateRestaurantTableMutation,
  useBulkCreateRestaurantTablesMutation,
  useUpdateRestaurantTableMutation,
  useArchiveRestaurantTableMutation,
  useGenerateRestaurantTableQrMutation,
} from '@/store/api/restaurantsApi';
import type { EnhancedRestaurantTable } from '@/store/api/types';

interface TableFormState {
  tableNumber: string;
  displayName: string;
  capacity: string;
  zone: string;
  displayOrder: string;
}

interface TableManagementPanelProps {
  tables: EnhancedRestaurantTable[];
  zones: string[];
  selectedZone: string;
  onZoneChange: (zone: string) => void;
  onTablesUpdated: () => void;
  onZoneManage: () => void;
}

const emptyForm: TableFormState = {
  tableNumber: '',
  displayName: '',
  capacity: '4',
  zone: '',
  displayOrder: '0',
};

export const TableManagementPanel: React.FC<TableManagementPanelProps> = ({
  tables,
  zones,
  selectedZone,
  onZoneChange,
  onTablesUpdated,
  onZoneManage,
}) => {
  const { toast } = useToast();
  const restaurantId = useAppSelector(selectActiveRestaurantId);

  const [form, setForm] = useState<TableFormState>(emptyForm);
  const [editingTable, setEditingTable] =
    useState<EnhancedRestaurantTable | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isBulkCreateDialogOpen, setIsBulkCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [bulkCreateForm, setBulkCreateForm] = useState({
    layout: '4' as '4' | '6' | '8' | '16',
    tablePrefix: 'T',
    capacity: '4',
    zone: '',
  });

  const [createTable, { isLoading: isCreating }] =
    useCreateRestaurantTableMutation();
  const [bulkCreateTables, { isLoading: isBulkCreating }] =
    useBulkCreateRestaurantTablesMutation();
  const [updateTable, { isLoading: isUpdating }] =
    useUpdateRestaurantTableMutation();
  const [archiveTable, { isLoading: isArchiving }] =
    useArchiveRestaurantTableMutation();
  const [generateQr] = useGenerateRestaurantTableQrMutation();

  const resetForm = useCallback(() => {
    setForm(emptyForm);
    setEditingTable(null);
  }, []);

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId) return;

    try {
      await createTable({
        restaurantId,
        body: {
          tableNumber: form.tableNumber,
          displayName: form.displayName || undefined,
          capacity: parseInt(form.capacity),
          zone: form.zone || undefined,
          displayOrder: parseInt(form.displayOrder),
        },
      }).unwrap();

      toast({
        title: 'Table created',
        description: `Table ${form.tableNumber} has been added to your restaurant.`,
      });

      resetForm();
      setIsCreateDialogOpen(false);
      onTablesUpdated();
    } catch (error) {
      toast({
        title: 'Unable to create table',
        description:
          error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleBulkCreateTables = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId) return;

    try {
      const numTables = parseInt(bulkCreateForm.layout);
      await bulkCreateTables({
        restaurantId,
        body: {
          count: numTables,
          tablePrefix: bulkCreateForm.tablePrefix,
          capacity: parseInt(bulkCreateForm.capacity),
          zone: bulkCreateForm.zone || undefined,
        },
      }).unwrap();

      toast({
        title: 'Tables created',
        description: `${numTables} tables have been added to your restaurant.`,
      });

      setBulkCreateForm({
        layout: '4',
        tablePrefix: 'T',
        capacity: '4',
        zone: '',
      });
      setIsBulkCreateDialogOpen(false);
      onTablesUpdated();
    } catch (error) {
      toast({
        title: 'Unable to create tables',
        description:
          error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId || !editingTable) return;

    try {
      await updateTable({
        restaurantId,
        tableId: editingTable.id,
        body: {
          tableNumber: form.tableNumber,
          displayName: form.displayName || undefined,
          capacity: parseInt(form.capacity),
          zone: form.zone || undefined,
          displayOrder: parseInt(form.displayOrder),
        },
      }).unwrap();

      toast({
        title: 'Table updated',
        description: `Table ${form.tableNumber} has been updated.`,
      });

      resetForm();
      setIsEditDialogOpen(false);
      onTablesUpdated();
    } catch (error) {
      toast({
        title: 'Unable to update table',
        description:
          error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTable = async (table: EnhancedRestaurantTable) => {
    if (!restaurantId) return;

    try {
      await archiveTable({
        restaurantId,
        tableId: table.id,
      }).unwrap();

      toast({
        title: 'Table deleted',
        description: `Table ${table.tableNumber} has been removed.`,
      });

      onTablesUpdated();
    } catch (error) {
      toast({
        title: 'Unable to delete table',
        description:
          error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateQr = async (table: EnhancedRestaurantTable) => {
    if (!restaurantId) return;

    try {
      const result = await generateQr({
        restaurantId,
        tableId: table.id,
      }).unwrap();

      // Open QR code in new tab
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head><title>QR Code - Table ${table.tableNumber}</title></head>
            <body style="text-align: center; font-family: Arial, sans-serif; margin: 20px;">
              <h2>Table ${table.tableNumber} - QR Code</h2>
              <img src="${result.qrCodeDataUrl}" alt="QR Code" style="max-width: 300px;" />
              <p>Scan this QR code to access the menu for Table ${table.tableNumber}</p>
            </body>
          </html>
        `);
      }

      toast({
        title: 'QR Code generated',
        description: `QR code for Table ${table.tableNumber} has been generated.`,
      });
    } catch (error) {
      toast({
        title: 'Unable to generate QR code',
        description:
          error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (table: EnhancedRestaurantTable) => {
    setForm({
      tableNumber: table.tableNumber,
      displayName: table.displayName || '',
      capacity: table.capacity?.toString() || '4',
      zone: table.zone || '',
      displayOrder: table.displayOrder.toString(),
    });
    setEditingTable(table);
    setIsEditDialogOpen(true);
  };

  const filteredTables = selectedZone
    ? tables.filter((table) => table.zone === selectedZone)
    : tables;

  const isBusy = isCreating || isBulkCreating || isUpdating || isArchiving;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Table Management
            </CardTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
              <span>
                📊 {filteredTables.length} tables{' '}
                {selectedZone ? `in ${selectedZone}` : 'total'}
              </span>
              <span>🎯 Click table to configure</span>
              <span>🖱️ Drag to reposition</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onZoneManage} size="sm">
              <MapPin className="w-4 h-4 mr-2" />
              Manage Zones
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsBulkCreateDialogOpen(true)}
              disabled={isBusy}
              size="sm"
            >
              <Grid3X3 className="w-4 h-4 mr-2" />
              Bulk Create
            </Button>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              disabled={isBusy}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Table
            </Button>
          </div>
        </div>

        {/* Zone Filter */}
        <div className="flex items-center gap-4">
          <Label htmlFor="zone-filter" className="text-sm font-medium">
            Filter by Zone:
          </Label>
          <Select value={selectedZone} onValueChange={onZoneChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All zones" />
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

      <CardContent>
        {/* Table List */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">
            Tables ({filteredTables.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTables.map((table) => (
              <div key={table.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium">Table {table.tableNumber}</h5>
                    <p className="text-sm text-muted-foreground">
                      {table.capacity} seats • {table.zone || 'No zone'}
                    </p>
                  </div>
                  {table.currentStatus && (
                    <Badge
                      variant="secondary"
                      className={`
                        ${
                          table.currentStatus.status === 'occupied'
                            ? 'bg-orange-100 text-orange-800'
                            : ''
                        }
                        ${
                          table.currentStatus.status === 'reserved'
                            ? 'bg-blue-100 text-blue-800'
                            : ''
                        }
                        ${
                          table.currentStatus.status === 'available'
                            ? 'bg-green-100 text-green-800'
                            : ''
                        }
                        ${
                          table.currentStatus.status === 'cleaning'
                            ? 'bg-gray-100 text-gray-800'
                            : ''
                        }
                      `}
                    >
                      {table.currentStatus.status}
                    </Badge>
                  )}
                </div>

                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(table)}
                    disabled={isBusy}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateQr(table)}
                  >
                    <QrCode className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteTable(table)}
                    disabled={isBusy}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Create Table Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Table</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTable} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tableNumber">Table Number *</Label>
                  <Input
                    id="tableNumber"
                    value={form.tableNumber}
                    onChange={(e) =>
                      setForm({ ...form, tableNumber: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="capacity">Capacity *</Label>
                  <Select
                    value={form.capacity}
                    onValueChange={(value) =>
                      setForm({ ...form, capacity: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2, 4, 6, 8, 10, 12].map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} seats
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={form.displayName}
                  onChange={(e) =>
                    setForm({ ...form, displayName: e.target.value })
                  }
                  placeholder="Optional display name"
                />
              </div>

              <div>
                <Label htmlFor="zone">Zone</Label>
                <Select
                  value={form.zone}
                  onValueChange={(value) => setForm({ ...form, zone: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">No zone</SelectItem>
                    {zones.map((zone) => (
                      <SelectItem key={zone} value={zone}>
                        {zone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Table'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Bulk Create Dialog */}
        <Dialog
          open={isBulkCreateDialogOpen}
          onOpenChange={setIsBulkCreateDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Create Tables</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleBulkCreateTables} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="layout">Number of Tables</Label>
                  <Select
                    value={bulkCreateForm.layout}
                    onValueChange={(value) =>
                      setBulkCreateForm({
                        ...bulkCreateForm,
                        layout: value as any,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">4 tables</SelectItem>
                      <SelectItem value="6">6 tables</SelectItem>
                      <SelectItem value="8">8 tables</SelectItem>
                      <SelectItem value="16">16 tables</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tablePrefix">Table Prefix</Label>
                  <Input
                    id="tablePrefix"
                    value={bulkCreateForm.tablePrefix}
                    onChange={(e) =>
                      setBulkCreateForm({
                        ...bulkCreateForm,
                        tablePrefix: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bulkCapacity">Capacity per table</Label>
                  <Select
                    value={bulkCreateForm.capacity}
                    onValueChange={(value) =>
                      setBulkCreateForm({ ...bulkCreateForm, capacity: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2, 4, 6, 8, 10, 12].map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} seats
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="bulkZone">Zone</Label>
                  <Select
                    value={bulkCreateForm.zone}
                    onValueChange={(value) =>
                      setBulkCreateForm({ ...bulkCreateForm, zone: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select zone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No zone</SelectItem>
                      {zones.map((zone) => (
                        <SelectItem key={zone} value={zone}>
                          {zone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsBulkCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isBulkCreating}>
                  {isBulkCreating
                    ? 'Creating...'
                    : `Create ${bulkCreateForm.layout} Tables`}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Table Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Table</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateTable} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editTableNumber">Table Number *</Label>
                  <Input
                    id="editTableNumber"
                    value={form.tableNumber}
                    onChange={(e) =>
                      setForm({ ...form, tableNumber: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="editCapacity">Capacity *</Label>
                  <Select
                    value={form.capacity}
                    onValueChange={(value) =>
                      setForm({ ...form, capacity: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2, 4, 6, 8, 10, 12].map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} seats
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="editDisplayName">Display Name</Label>
                <Input
                  id="editDisplayName"
                  value={form.displayName}
                  onChange={(e) =>
                    setForm({ ...form, displayName: e.target.value })
                  }
                  placeholder="Optional display name"
                />
              </div>

              <div>
                <Label htmlFor="editZone">Zone</Label>
                <Select
                  value={form.zone}
                  onValueChange={(value) => setForm({ ...form, zone: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No zone</SelectItem>
                    {zones.map((zone) => (
                      <SelectItem key={zone} value={zone}>
                        {zone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? 'Updating...' : 'Update Table'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
