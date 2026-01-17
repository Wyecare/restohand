import { useState, useMemo } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  Loader2,
  ImagePlus,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Upload,
  GripVertical,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  useListMenuCategoriesQuery,
  useCreateMenuCategoryMutation,
  useUpdateMenuCategoryMutation,
  useDeleteMenuCategoryMutation,
  useListMenuItemsQuery,
  useCreateMenuItemMutation,
  useUpdateMenuItemMutation,
  useDeleteMenuItemMutation,
} from '@/store/api/restaurantsApi';
import { useJwtAuth } from '@/contexts/JwtAuthProvider';
import { skipToken } from '@reduxjs/toolkit/query/react';

const categoryFormSchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  defaultGstRate: z.number().min(0).max(100).optional(),
  gstCategoryType: z.string().optional(),
});

const menuItemFormSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be positive'),
  isAvailable: z.boolean().default(true),
});

type CategoryFormData = z.infer<typeof categoryFormSchema>;

export function CategoriesTab() {
  const { toast } = useToast();
  const { user } = useJwtAuth();
  const restaurantId = user?.restaurantId;

  // API hooks
  const { data: categoriesData, isLoading } = useListMenuCategoriesQuery(
    restaurantId ? { restaurantId } : skipToken
  );
  const [createCategory, { isLoading: isCreating }] =
    useCreateMenuCategoryMutation();
  const [updateCategory, { isLoading: isUpdating }] =
    useUpdateMenuCategoryMutation();
  const [deleteCategory, { isLoading: isDeleting }] =
    useDeleteMenuCategoryMutation();

  const categories = categoriesData?.data || [];

  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMenuItemsDialogOpen, setIsMenuItemsDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [viewItemsCategory, setViewItemsCategory] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // TanStack Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState('');

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: '',
      description: '',
      imageUrl: '',
      defaultGstRate: 5,
      gstCategoryType: 'Food',
    },
  });

  const handleAddCategory = () => {
    setSelectedCategory(null);
    setImagePreview('');
    form.reset();
    setIsAddEditDialogOpen(true);
  };

  const handleEditCategory = (category: any) => {
    setSelectedCategory(category);
    setImagePreview(category.imageUrl || '');
    form.reset({
      name: category.name,
      description: category.description || '',
      imageUrl: category.imageUrl || '',
      defaultGstRate: category.defaultGstRate || 5,
      gstCategoryType: category.gstCategoryType || 'Food',
    });
    setIsAddEditDialogOpen(true);
  };

  const handleDeleteClick = (category: any) => {
    setSelectedCategory(category);
    setIsDeleteDialogOpen(true);
  };

  const handleViewItems = (category: any) => {
    console.log('Viewing items for category:', category);
    console.log('Category ID:', category._id || category.id);
    setViewItemsCategory(category);
    setIsMenuItemsDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCategory || !restaurantId) return;

    try {
      await deleteCategory({
        restaurantId,
        categoryId: selectedCategory._id || selectedCategory.id,
      }).unwrap();
      toast({
        title: 'Deleted',
        description: 'Category deleted successfully',
      });
      setIsDeleteDialogOpen(false);
      setSelectedCategory(null);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error?.data?.message || 'Failed to delete category',
      });
    }
  };

  const handleToggleAvailability = async (category: any) => {
    if (!restaurantId) return;

    try {
      await updateCategory({
        restaurantId,
        categoryId: category._id || category.id,
        body: { isActive: !category.isActive },
      }).unwrap();
      toast({
        title: 'Updated',
        description: 'Category availability updated',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error?.data?.message || 'Failed to update category',
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please upload an image file only',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Image size must be less than 5MB',
      });
      return;
    }

    setIsUploadingImage(true);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        form.setValue('imageUrl', base64String);
        setIsUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to upload image',
      });
      setIsUploadingImage(false);
    }
  };

  const onSubmit = async (data: CategoryFormData) => {
    if (!restaurantId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Restaurant ID not found',
      });
      return;
    }

    try {
      if (selectedCategory) {
        await updateCategory({
          restaurantId,
          categoryId: selectedCategory._id || selectedCategory.id,
          body: {
            name: data.name,
            description: data.description,
            isActive: true,
          },
        }).unwrap();
        toast({
          title: 'Updated',
          description: 'Category updated successfully',
        });
      } else {
        await createCategory({
          restaurantId,
          body: {
            name: data.name,
            description: data.description,
            displayOrder: (categories.length || 0) + 1,
            isActive: true,
          },
        }).unwrap();
        toast({
          title: 'Created',
          description: 'Category created successfully',
        });
      }

      setIsAddEditDialogOpen(false);
      form.reset();
      setImagePreview('');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error?.data?.message || 'Operation failed',
      });
    }
  };

  // Define columns for TanStack Table
  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="h-8 px-2 text-left"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Category
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => {
          const category = row.original;
          return (
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => handleViewItems(category)}
            >
              {category.imageUrl ? (
                <img
                  src={category.imageUrl}
                  alt={category.name}
                  className="h-10 w-10 rounded object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                  <ImagePlus className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div>
                <div className="font-medium">{category.name}</div>
                {category.description && (
                  <div className="text-sm text-muted-foreground">
                    {category.description}
                  </div>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'displayOrder',
        header: 'Order',
        cell: ({ row }) => (
          <span className="text-sm">{row.original.displayOrder}</span>
        ),
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        cell: ({ row }) => {
          const category = row.original;
          return (
            <div className="flex items-center gap-2">
              <Switch
                checked={category.isActive}
                onCheckedChange={() => handleToggleAvailability(category)}
              />
              <span className="text-sm">
                {category.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          );
        },
      },
      {
        id: 'actions',
        enableHiding: false,
        cell: ({ row }) => {
          const category = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleViewItems(category)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Items
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleEditCategory(category)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDeleteClick(category)}
                  className="text-red-600 focus:bg-red-50"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [
      handleToggleAvailability,
      handleEditCategory,
      handleDeleteClick,
      handleViewItems,
    ]
  );

  // Initialize TanStack Table
  const table = useReactTable({
    data: categories,
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
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-4">
      {/* Actions Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search categories..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
        </div>
        <Button onClick={handleAddCategory} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      {/* Categories Table */}
      <Card>
        <CardHeader>
          <CardTitle>Categories ({categories.length})</CardTitle>
          <p className="text-sm text-muted-foreground">
            Click on any category to view its menu items
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
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
                          No categories found
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
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedCategory ? 'Edit Category' : 'Add Category'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Category Name *</Label>
              <Input
                {...form.register('name')}
                placeholder="e.g., Appetizers, Main Course"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                {...form.register('description')}
                placeholder="Brief description of the category"
              />
            </div>

            <div className="space-y-2">
              <Label>Image</Label>
              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploadingImage}
                />
                {isUploadingImage && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
              </div>
              {imagePreview && (
                <div className="mt-2">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-32 w-32 rounded object-cover border"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default GST Rate (%)</Label>
                <Input
                  type="number"
                  {...form.register('defaultGstRate', { valueAsNumber: true })}
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>

              <div className="space-y-2">
                <Label>GST Category Type</Label>
                <Input
                  {...form.register('gstCategoryType')}
                  placeholder="e.g., Food, Beverages"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating || isUpdating || isUploadingImage}
              >
                {isCreating || isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {selectedCategory ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this category? This action cannot
              be undone and will also delete all menu items in this category.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Menu Items Dialog */}
      <MenuItemsDialog
        category={viewItemsCategory}
        open={isMenuItemsDialogOpen}
        onOpenChange={setIsMenuItemsDialogOpen}
      />
    </div>
  );
}

// Menu Items Dialog Component
function MenuItemsDialog({
  category,
  open,
  onOpenChange,
}: {
  category: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useJwtAuth();
  const { toast } = useToast();
  const restaurantId = user?.restaurantId;
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);

  const queryParams =
    restaurantId && category
      ? {
          restaurantId,
          categoryId: String(category._id || category.id),
        }
      : skipToken;

  console.log('Menu items query params:', queryParams);

  const { data: itemsData, isLoading } = useListMenuItemsQuery(queryParams);

  const [createMenuItem, { isLoading: isCreatingItem }] =
    useCreateMenuItemMutation();

  const items = itemsData?.data || [];

  const itemForm = useForm({
    resolver: zodResolver(menuItemFormSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      isAvailable: true,
    },
  });

  const handleAddItem = () => {
    itemForm.reset();
    setIsAddItemDialogOpen(true);
  };

  const onItemSubmit = async (data: any) => {
    if (!restaurantId || !category) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Restaurant ID or category not found',
      });
      return;
    }

    try {
      await createMenuItem({
        restaurantId,
        body: {
          categoryId: category._id || category.id,
          name: data.name,
          description: data.description,
          pricing: {
            amount: data.price,
            currency: 'INR',
          },
          isAvailable: data.isAvailable,
        },
      }).unwrap();

      toast({
        title: 'Created',
        description: 'Menu item created successfully',
      });

      setIsAddItemDialogOpen(false);
      itemForm.reset();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error?.data?.message || 'Failed to create menu item',
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>Menu Items in "{category?.name}"</span>
              <Badge variant="outline">{items.length} items</Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  No items in this category yet
                </p>
                <Button className="mt-4 gap-2" onClick={handleAddItem}>
                  <Plus className="h-4 w-4" />
                  Add First Item
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-scroll">
                {items.map((item: any) => (
                  <Card
                    key={item._id || item.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {item.imageUrls?.[0] ? (
                          <img
                            src={item.imageUrls[0]}
                            alt={item.name}
                            className="h-16 w-16 rounded object-cover"
                          />
                        ) : (
                          <div className="h-16 w-16 rounded bg-muted flex items-center justify-center">
                            <ImagePlus className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{item.name}</h4>
                          {item.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <span className="font-semibold text-lg">
                              ₹{item.pricing?.amount || 0}
                            </span>
                            <Switch
                              checked={item.isAvailable}
                              disabled
                              size="sm"
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button className="gap-2" onClick={handleAddItem}>
              <Plus className="h-4 w-4" />
              Add New Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Menu Item Dialog */}
      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Menu Item to "{category?.name}"</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={itemForm.handleSubmit(onItemSubmit)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Item Name *</Label>
              <Input
                {...itemForm.register('name')}
                placeholder="e.g., Chicken Biryani"
              />
              {itemForm.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {itemForm.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                {...itemForm.register('description')}
                placeholder="Brief description of the item"
              />
            </div>

            <div className="space-y-2">
              <Label>Price (₹) *</Label>
              <Input
                type="number"
                {...itemForm.register('price', { valueAsNumber: true })}
                placeholder="0"
                min="0"
                step="0.01"
              />
              {itemForm.formState.errors.price && (
                <p className="text-sm text-destructive">
                  {itemForm.formState.errors.price.message}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                {...itemForm.register('isAvailable')}
                defaultChecked={true}
              />
              <Label>Available for ordering</Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddItemDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingItem}>
                {isCreatingItem ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Create Item
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
