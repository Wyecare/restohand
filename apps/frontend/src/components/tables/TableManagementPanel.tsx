import React, { useState, useMemo } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from '@/store/api/restaurantsApi';
import { useBranchContext } from '@/contexts/BranchContext';
import type { RestaurantTable, ZoneResponse } from '@/store/api/types';
import { WaiterAssignmentDialog } from './WaiterAssignmentDialog';

interface TableManagementPanelProps {
  restaurantId: string;
}

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

export const TableManagementPanel: React.FC<TableManagementPanelProps> = ({
  restaurantId,
}) => {
  const { toast } = useToast();
  const { currentBranch } = useBranchContext();

  // API hooks
  const branchId = currentBranch?._id;
  const {
    data: tables,
    isLoading,
    refetch,
  } = useListRestaurantTablesByBranchQuery(
    restaurantId && branchId ? { restaurantId, branchId } : skipToken
  );
  const zoneQueryParams = restaurantId && branchId ? { restaurantId, branchId } : skipToken;
  const { data: zonesData } = useGetZonesByBranchQuery(zoneQueryParams);

  const [createTable] = useCreateRestaurantTableMutation();
  const [updateTable] = useUpdateRestaurantTableMutation();
  const [archiveTable] = useArchiveRestaurantTableMutation();
  const [reactivateTable] = useReactivateRestaurantTableMutation();
  const [generateQrCode] = useGenerateRestaurantTableQrMutation();
  const [bulkCreateTables] = useBulkCreateRestaurantTablesMutation();

  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Dialog states
  const [isCreateTableOpen, setIsCreateTableOpen] = useState(false);
  const [isBulkCreateOpen, setIsBulkCreateOpen] = useState(false);
  const [isEditTableOpen, setIsEditTableOpen] = useState(false);
  const [isWaiterAssignOpen, setIsWaiterAssignOpen] = useState(false);

  // Form states
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [selectedTableForWaiter, setSelectedTableForWaiter] = useState<RestaurantTable | null>(null);

  const [tableForm, setTableForm] = useState<TableFormData>({
    tableNumber: '',
    displayName: '',
    capacity: '',
    zone: '',
    displayOrder: '',
  });

  const [bulkForm, setBulkForm] = useState<BulkFormData>({
    tablePrefix: '',
    capacity: '',
    zone: '',
    layout: '4',
  });

  // Derived data
  const zones = zonesData?.zones || [];
  const filteredTables = useMemo(() => {
    if (!tables) return [];

    return tables.filter((table) => {
      const matchesSearch =
        table.tableNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (table.displayName || '')
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      const matchesZone = !selectedZone || table.zone === selectedZone;
      const matchesArchived = showArchived ? !table.isActive : table.isActive;

      return matchesSearch && matchesZone && matchesArchived;
    });
  }, [tables, searchTerm, selectedZone, showArchived]);

  // Event handlers
  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId) return;

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

      toast({
        title: 'Table created',
        description: `Table ${tableForm.tableNumber} has been created successfully.`,
      });

      setIsCreateTableOpen(false);
      resetTableForm();
      refetch();
    } catch (error) {
      toast({
        title: 'Failed to create table',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleEditTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId || !editingTable) return;

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

      toast({
        title: 'Table updated',
        description: `Table ${tableForm.tableNumber} has been updated successfully.`,
      });

      setIsEditTableOpen(false);
      setEditingTable(null);
      resetTableForm();
      refetch();
    } catch (error) {
      toast({
        title: 'Failed to update table',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleBulkCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId) return;

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

      toast({
        title: 'Tables created',
        description: `Successfully created ${bulkForm.layout} tables.`,
      });

      setIsBulkCreateOpen(false);
      setBulkForm({
        tablePrefix: '',
        capacity: '',
        zone: '',
        layout: '4',
      });
      refetch();
    } catch (error) {
      toast({
        title: 'Failed to create tables',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleArchiveTable = async (table: RestaurantTable) => {
    if (!restaurantId) return;

    try {
      await archiveTable({
        restaurantId,
        tableId: table.id,
      }).unwrap();

      toast({
        title: 'Table archived',
        description: `Table ${table.tableNumber} has been archived.`,
      });

      refetch();
    } catch (error) {
      toast({
        title: 'Failed to archive table',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleReactivateTable = async (table: RestaurantTable) => {
    if (!restaurantId) return;

    try {
      await reactivateTable({
        restaurantId,
        tableId: table.id,
      }).unwrap();

      toast({
        title: 'Table reactivated',
        description: `Table ${table.tableNumber} has been reactivated.`,
      });

      refetch();
    } catch (error) {
      toast({
        title: 'Failed to reactivate table',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateQR = async (table: RestaurantTable) => {
    if (!restaurantId) return;

    try {
      const result = await generateQrCode({
        restaurantId,
        tableId: table.id,
      }).unwrap();

      const link = document.createElement('a');
      link.href = result.dataUrl;
      link.download = `table-${table.tableNumber}-qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'QR Code downloaded',
        description: `QR code for table ${table.tableNumber} has been downloaded.`,
      });
    } catch (error) {
      toast({
        title: 'Failed to generate QR code',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const openEditTable = (table: RestaurantTable) => {
    setEditingTable(table);
    setTableForm({
      tableNumber: table.tableNumber,
      displayName: table.displayName || '',
      capacity: table.capacity?.toString() || '',
      zone: table.zone || '',
      displayOrder: table.displayOrder?.toString() || '0',
    });
    setIsEditTableOpen(true);
  };

  const openWaiterAssign = (table: RestaurantTable) => {
    setSelectedTableForWaiter(table);
    setIsWaiterAssignOpen(true);
  };

  const resetTableForm = () => {
    setTableForm({
      tableNumber: '',
      displayName: '',
      capacity: '',
      zone: '',
      displayOrder: '',
    });
  };

  const handleWaiterAssignmentSuccess = () => {
    refetch();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Restaurant Tables</CardTitle>
              <CardDescription>
                View and manage all tables in your restaurant
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={isBulkCreateOpen} onOpenChange={setIsBulkCreateOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Bulk Create
                  </Button>
                </DialogTrigger>
              </Dialog>

              <Dialog open={isCreateTableOpen} onOpenChange={setIsCreateTableOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Table
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search tables..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedZone} onValueChange={setSelectedZone}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All zones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All zones</SelectItem>
                {zones.map((zone) => (
                  <SelectItem key={zone.id} value={zone.name}>
                    {zone.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant={showArchived ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
            >
              <Archive className="h-4 w-4 mr-2" />
              {showArchived ? 'Show Active' : 'Show Archived'}
            </Button>
          </div>

          {/* Tables Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Table #</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading tables...
                    </TableCell>
                  </TableRow>
                ) : filteredTables.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No tables found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTables.map((table) => (
                    <TableRow key={table.id}>
                      <TableCell className="font-medium">
                        {table.tableNumber}
                      </TableCell>
                      <TableCell>{table.displayName || '-'}</TableCell>
                      <TableCell>
                        {table.capacity ? (
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {table.capacity}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {table.zone ? (
                          <Badge variant="outline">
                            <MapPin className="h-3 w-3 mr-1" />
                            {table.zone}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{table.displayOrder}</TableCell>
                      <TableCell>
                        <Badge
                          variant={table.isActive ? 'default' : 'secondary'}
                        >
                          {table.isActive ? 'Active' : 'Archived'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditTable(table)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openWaiterAssign(table)}>
                              <UserPlus className="h-4 w-4 mr-2" />
                              Assign Waiter
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleGenerateQR(table)}>
                              <QrCode className="h-4 w-4 mr-2" />
                              Download QR
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {table.isActive ? (
                              <DropdownMenuItem
                                onClick={() => handleArchiveTable(table)}
                                className="text-destructive"
                              >
                                <Archive className="h-4 w-4 mr-2" />
                                Archive
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleReactivateTable(table)}
                              >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Reactivate
                              </DropdownMenuItem>
                            )}
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

      {/* CREATE TABLE DIALOG */}
      <Dialog open={isCreateTableOpen} onOpenChange={setIsCreateTableOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleCreateTable}>
            <DialogHeader>
              <DialogTitle>Create New Table</DialogTitle>
              <DialogDescription>
                Add a new table to your restaurant
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tableNumber" className="text-right">
                  Table Number
                </Label>
                <Input
                  id="tableNumber"
                  value={tableForm.tableNumber}
                  onChange={(e) =>
                    setTableForm({ ...tableForm, tableNumber: e.target.value })
                  }
                  placeholder="T1"
                  className="col-span-3"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="displayName" className="text-right">
                  Display Name
                </Label>
                <Input
                  id="displayName"
                  value={tableForm.displayName}
                  onChange={(e) =>
                    setTableForm({ ...tableForm, displayName: e.target.value })
                  }
                  placeholder="Optional"
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="capacity" className="text-right">
                  Capacity
                </Label>
                <Input
                  id="capacity"
                  type="number"
                  value={tableForm.capacity}
                  onChange={(e) =>
                    setTableForm({ ...tableForm, capacity: e.target.value })
                  }
                  placeholder="4"
                  className="col-span-3"
                  min="1"
                  max="20"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="zone" className="text-right">
                  Zone
                </Label>
                <Select
                  value={tableForm.zone}
                  onValueChange={(value) =>
                    setTableForm({ ...tableForm, zone: value })
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No zone</SelectItem>
                    {zones.map((zone) => (
                      <SelectItem key={zone.id} value={zone.name}>
                        {zone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="displayOrder" className="text-right">
                  Display Order
                </Label>
                <Input
                  id="displayOrder"
                  type="number"
                  value={tableForm.displayOrder}
                  onChange={(e) =>
                    setTableForm({ ...tableForm, displayOrder: e.target.value })
                  }
                  placeholder="0"
                  className="col-span-3"
                  min="0"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateTableOpen(false);
                  resetTableForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Create Table</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* BULK CREATE DIALOG */}
      <Dialog open={isBulkCreateOpen} onOpenChange={setIsBulkCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleBulkCreate}>
            <DialogHeader>
              <DialogTitle>Bulk Create Tables</DialogTitle>
              <DialogDescription>
                Create multiple tables at once
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tablePrefix" className="text-right">
                  Table Prefix
                </Label>
                <Input
                  id="tablePrefix"
                  value={bulkForm.tablePrefix}
                  onChange={(e) =>
                    setBulkForm({ ...bulkForm, tablePrefix: e.target.value })
                  }
                  placeholder="T"
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="layout" className="text-right">
                  Layout
                </Label>
                <Select
                  value={bulkForm.layout}
                  onValueChange={(value: '4' | '6' | '8' | '16') =>
                    setBulkForm({ ...bulkForm, layout: value })
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select layout" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4 Tables</SelectItem>
                    <SelectItem value="6">6 Tables</SelectItem>
                    <SelectItem value="8">8 Tables</SelectItem>
                    <SelectItem value="16">16 Tables</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="bulkCapacity" className="text-right">
                  Capacity
                </Label>
                <Input
                  id="bulkCapacity"
                  type="number"
                  value={bulkForm.capacity}
                  onChange={(e) =>
                    setBulkForm({ ...bulkForm, capacity: e.target.value })
                  }
                  placeholder="4"
                  className="col-span-3"
                  min="1"
                  max="20"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="bulkZone" className="text-right">
                  Zone
                </Label>
                <Select
                  value={bulkForm.zone}
                  onValueChange={(value) =>
                    setBulkForm({ ...bulkForm, zone: value })
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No zone</SelectItem>
                    {zones.map((zone) => (
                      <SelectItem key={zone.id} value={zone.name}>
                        {zone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsBulkCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create Tables</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT TABLE DIALOG */}
      <Dialog open={isEditTableOpen} onOpenChange={setIsEditTableOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleEditTable}>
            <DialogHeader>
              <DialogTitle>Edit Table</DialogTitle>
              <DialogDescription>Update table information</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editTableNumber" className="text-right">
                  Table Number
                </Label>
                <Input
                  id="editTableNumber"
                  value={tableForm.tableNumber}
                  onChange={(e) =>
                    setTableForm({ ...tableForm, tableNumber: e.target.value })
                  }
                  placeholder="T1"
                  className="col-span-3"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editDisplayName" className="text-right">
                  Display Name
                </Label>
                <Input
                  id="editDisplayName"
                  value={tableForm.displayName}
                  onChange={(e) =>
                    setTableForm({ ...tableForm, displayName: e.target.value })
                  }
                  placeholder="Optional"
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editCapacity" className="text-right">
                  Capacity
                </Label>
                <Input
                  id="editCapacity"
                  type="number"
                  value={tableForm.capacity}
                  onChange={(e) =>
                    setTableForm({ ...tableForm, capacity: e.target.value })
                  }
                  placeholder="4"
                  className="col-span-3"
                  min="1"
                  max="20"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editZone" className="text-right">
                  Zone
                </Label>
                <Select
                  value={tableForm.zone}
                  onValueChange={(value) =>
                    setTableForm({ ...tableForm, zone: value })
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No zone</SelectItem>
                    {zones.map((zone) => (
                      <SelectItem key={zone.id} value={zone.name}>
                        {zone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editDisplayOrder" className="text-right">
                  Display Order
                </Label>
                <Input
                  id="editDisplayOrder"
                  type="number"
                  value={tableForm.displayOrder}
                  onChange={(e) =>
                    setTableForm({ ...tableForm, displayOrder: e.target.value })
                  }
                  placeholder="0"
                  className="col-span-3"
                  min="0"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditTableOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Update Table</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* WAITER ASSIGNMENT DIALOG */}
      <WaiterAssignmentDialog
        isOpen={isWaiterAssignOpen}
        onOpenChange={setIsWaiterAssignOpen}
        table={selectedTableForWaiter}
        restaurantId={restaurantId}
        onAssignmentSuccess={handleWaiterAssignmentSuccess}
      />
    </>
  );
};