import * as React from 'react';
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
  VisibilityState,
} from '@tanstack/react-table';
import {
  ArrowUpDown,
  MoreHorizontal,
  Edit,
  Trash2,
  CheckCircle,
  Pause,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Utensils,
  Camera,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { MenuCategory, MenuItem } from '@/store/api/types';

interface MenuItemsTableProps {
  menuItems: MenuItem[];
  categories: MenuCategory[];
  isLoading?: boolean;
  onEdit?: (item: MenuItem) => void;
  onDelete?: (item: MenuItem) => void;
  onToggleAvailability?: (item: MenuItem) => void;
  onManageImages?: (item: MenuItem) => void;
}

export function MenuItemsTable({
  menuItems,
  categories,
  isLoading,
  onEdit,
  onDelete,
  onToggleAvailability,
  onManageImages,
}: MenuItemsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  // 🔎 Search filter
  const [globalFilter, setGlobalFilter] = React.useState('');

  const columns = React.useMemo<ColumnDef<MenuItem>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="h-8 px-2 text-left"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Item
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-3">
              {item.imageUrls?.length ? (
                <img
                  src={item.imageUrls[0]}
                  alt={item.name}
                  className="h-8 w-8 rounded object-cover"
                />
              ) : (
                <div className="h-8 w-8 flex items-center justify-center rounded bg-muted">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div>
                <div className="font-medium">{item.name}</div>
                {item.pricing?.amount && (
                  <div className="text-sm text-muted-foreground">
                    ₹{item.pricing.amount}
                  </div>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'categoryId',
        header: 'Category',
        cell: ({ row }) => {
          const cat = categories.find((c) => c.id === row.original.categoryId);
          return (
            <span className="text-sm font-medium">
              {cat?.name || 'Uncategorized'}
            </span>
          );
        },
      },
      {
        accessorKey: 'isAvailable',
        header: 'Status',
        cell: ({ row }) => {
          const item = row.original;
          return (
            <Badge
              variant={item.isAvailable ? 'default' : 'secondary'}
              className="flex items-center gap-1 w-fit"
            >
              {item.isAvailable ? (
                <>
                  <CheckCircle className="h-3 w-3" /> Available
                </>
              ) : (
                <>
                  <Pause className="h-3 w-3" /> Paused
                </>
              )}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'pricing.amount',
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="h-8 px-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Price
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="font-medium">₹{row.original.pricing?.amount}</div>
        ),
      },
      {
        id: 'gst',
        header: 'GST',
        cell: ({ row }) => {
          const item = row.original;
          if (item.gstRateId || typeof item.gstRate === 'number') {
            const rate =
              typeof item.gstRate === 'number'
                ? `${item.gstRate}%`
                : 'Configured';
            return (
              <div className="flex flex-col gap-1">
                <Badge variant="outline" className="text-xs font-medium">
                  {rate}
                </Badge>
                {item.hsnCode && (
                  <span className="text-[11px] text-muted-foreground">
                    HSN {item.hsnCode}
                  </span>
                )}
              </div>
            );
          }
          return (
            <Badge variant="destructive" className="text-xs font-medium">
              Needs GST
            </Badge>
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
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(item)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Details
                  </DropdownMenuItem>
                )}
                {onManageImages && (
                  <DropdownMenuItem onClick={() => onManageImages(item)}>
                    <Camera className="mr-2 h-4 w-4" />
                    Manage Images
                  </DropdownMenuItem>
                )}
                {onToggleAvailability && (
                  <DropdownMenuItem onClick={() => onToggleAvailability(item)}>
                    {item.isAvailable ? (
                      <>
                        <Pause className="mr-2 h-4 w-4" />
                        Mark Unavailable
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Mark Available
                      </>
                    )}
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(item)}
                    className="text-red-600 focus:bg-red-50"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [categories, onEdit, onDelete, onToggleAvailability, onManageImages]
  );

  const table = useReactTable({
    data: menuItems,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading menu items...
      </div>
    );
  }

  if (menuItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Utensils className="h-8 w-8 text-muted-foreground mb-2" />
        <h3 className="text-lg font-semibold">No items yet</h3>
        <p className="text-sm text-muted-foreground">
          Add dishes to your menu to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="w-full sm:w-64">
          <Input
            placeholder="Search dishes..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
        </div>
        <div className="text-xs sm:text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} items total
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-hidden">
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
                  className="hover:bg-muted/50"
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
                <TableCell
                  colSpan={columns.length}
                  className="text-center py-8"
                >
                  No matching results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
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
    </div>
  );
}
