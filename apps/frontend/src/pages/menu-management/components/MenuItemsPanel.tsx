import { useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  ImagePlus,
  Loader2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useUpdateMenuItemMutation } from '@/store/api/restaurantsApi';
import { useJwtAuth } from '@/contexts/JwtAuthProvider';
import { cn } from '@/lib/utils';

interface MenuItemsPanelProps {
  category: any;
  items: any[];
  isLoading: boolean;
  onAddItem: () => void;
  onEditItem: (item: any) => void;
  onDeleteItem: (item: any) => void;
  isMobile?: boolean;
}

export function MenuItemsPanel({
  category,
  items,
  isLoading,
  onAddItem,
  onEditItem,
  onDeleteItem,
  isMobile = false,
}: MenuItemsPanelProps) {
  const { toast } = useToast();
  const { user } = useJwtAuth();
  const restaurantId = user?.restaurantId;

  const [updateMenuItem] = useUpdateMenuItemMutation();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const handleToggleAvailability = async (item: any) => {
    if (!restaurantId) return;

    try {
      await updateMenuItem({
        restaurantId,
        itemId: item.id,
        body: { isAvailable: !item.isAvailable },
      }).unwrap();
      toast({
        title: 'Updated',
        description: 'Item availability updated',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error?.data?.message || 'Failed to update item',
      });
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2"
        >
          Item
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center gap-3">
            {item.imageUrls?.[0] ? (
              <img
                src={item.imageUrls[0]}
                alt={item.name}
                className="h-10 w-10 rounded object-cover flex-shrink-0"
              />
            ) : (
              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                <ImagePlus className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <div className="font-medium truncate">{item.name}</div>
              {item.description && (
                <div className="text-sm text-muted-foreground truncate max-w-xs">
                  {item.description}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'pricing.amount',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2"
        >
          Price
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const amount = row.original.pricing?.amount || 0;
        const currency = row.original.pricing?.currency || 'INR';
        return (
          <div className="font-medium">
            {currency === 'INR' ? '₹' : currency} {amount.toFixed(2)}
          </div>
        );
      },
    },
    {
      accessorKey: 'isAvailable',
      header: 'Availability',
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={item.isAvailable}
              onCheckedChange={() => handleToggleAvailability(item)}
            />
            <span className="text-sm text-muted-foreground">
              {item.isAvailable ? 'Available' : 'Unavailable'}
            </span>
          </div>
        );
      },
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEditItem(item)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDeleteItem(item)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: items,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (!category) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-muted-foreground">Select a category to view items</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex-1 flex flex-col', isMobile ? 'h-full' : '')}>
      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <h2 className="text-xl font-semibold">{category.name}</h2>
            {category.description && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {category.description}
              </p>
            )}
          </div>
          <Button onClick={onAddItem} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-muted-foreground">No items in this category</p>
              <Button onClick={onAddItem} variant="outline" className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Add First Item
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && 'selected'}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="text-center py-8">
                        No items found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {table.getPageCount() > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Page {table.getState().pagination.pageIndex + 1} of{' '}
                  {table.getPageCount()}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      {items.length > 0 && (
        <div className="border-t bg-muted/30 px-4 py-3">
          <div className="text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? 'item' : 'items'} in this category
          </div>
        </div>
      )}
    </div>
  );
}
