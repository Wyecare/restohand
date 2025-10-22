import { useMemo, useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  useListMenuCategoriesQuery,
  useCreateMenuCategoryMutation,
  useDeleteMenuCategoryMutation,
  useCreateMenuItemMutation,
  useUpdateMenuItemMutation,
  useListMenuItemsQuery,
} from '@/store/api/restaurantsApi';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const MenuPage = () => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const { toast } = useToast();
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemDescription, setItemDescription] = useState('');

  if (!restaurantId) {
    return <Navigate to="/onboarding" replace />;
  }

  const { data: categoriesResponse, isLoading: isCategoriesLoading } =
    useListMenuCategoriesQuery(restaurantId ?? skipToken);
  const categories = categoriesResponse?.data ?? [];

  const categoryIdFilter = useMemo(
    () => (selectedCategory !== 'all' ? selectedCategory : undefined),
    [selectedCategory]
  );

  const {
    data: menuItemsResponse,
    isLoading: isItemsLoading,
    isFetching: isItemsFetching,
  } = useListMenuItemsQuery(
    restaurantId ? { restaurantId, categoryId: categoryIdFilter } : skipToken
  );
  const menuItems = menuItemsResponse?.data ?? [];

  const [createCategory, { isLoading: isCreatingCategory }] =
    useCreateMenuCategoryMutation();
  const [deleteCategory, { isLoading: isDeletingCategory }] =
    useDeleteMenuCategoryMutation();
  const [createMenuItem, { isLoading: isCreatingItem }] =
    useCreateMenuItemMutation();
  const [updateMenuItem] = useUpdateMenuItemMutation();

  const handleCreateCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!restaurantId || !categoryName) return;

    try {
      await createCategory({
        restaurantId,
        body: {
          name: categoryName,
          description: categoryDescription || undefined,
          displayOrder: categories.length,
        },
      }).unwrap();
      setCategoryName('');
      setCategoryDescription('');
      toast({ title: 'Category created' });
    } catch (error) {
      toast({
        title: 'Unable to create category',
        description:
          error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!restaurantId) return;
    try {
      await deleteCategory({ restaurantId, categoryId }).unwrap();
      toast({ title: 'Category removed' });
      if (selectedCategory === categoryId) {
        setSelectedCategory('all');
      }
    } catch (error) {
      toast({
        title: 'Unable to delete category',
        description:
          error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleCreateItem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!restaurantId || !itemName || !itemPrice) return;

    const amount = Number(itemPrice);
    if (Number.isNaN(amount)) {
      toast({
        title: 'Invalid price',
        description: 'Price must be a valid number',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createMenuItem({
        restaurantId,
        body: {
          categoryId: categoryIdFilter,
          name: itemName,
          description: itemDescription || undefined,
          pricing: {
            amount,
            currency: 'INR',
            isTaxInclusive: true,
          },
          isAvailable: true,
        },
      }).unwrap();
      setItemName('');
      setItemPrice('');
      setItemDescription('');
      toast({ title: 'Menu item added' });
    } catch (error) {
      toast({
        title: 'Unable to add menu item',
        description:
          error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleAvailabilityToggle = async (
    itemId: string,
    isAvailable: boolean
  ) => {
    if (!restaurantId) return;
    try {
      await updateMenuItem({
        restaurantId,
        itemId,
        body: { isAvailable },
      }).unwrap();
      toast({
        title: `Item ${isAvailable ? 'marked available' : 'set unavailable'}`,
      });
    } catch (error) {
      toast({
        title: 'Unable to update item',
        description:
          error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Menu Management</h1>
        <p className="text-muted-foreground">
          Create categories, add dishes, and control availability instantly.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">New Category</CardTitle>
            <CardDescription>
              Group dishes by cuisine, course, or availability.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleCreateCategory}>
              <div className="space-y-2">
                <Label htmlFor="category-name">Name</Label>
                <Input
                  id="category-name"
                  placeholder="Breakfast"
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category-description">Description</Label>
                <Textarea
                  id="category-description"
                  placeholder="Short description (optional)"
                  value={categoryDescription}
                  onChange={(event) =>
                    setCategoryDescription(event.target.value)
                  }
                />
              </div>
              <Button
                type="submit"
                disabled={isCreatingCategory}
                className="w-full"
              >
                {isCreatingCategory ? 'Creating...' : 'Create category'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Categories</CardTitle>
            <CardDescription>
              Manage existing categories and switch the active context.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isCategoriesLoading ? (
              <div className="flex items-center justify-center py-6">
                <LoadingSpinner />
              </div>
            ) : categories.length > 0 ? (
              <div className="space-y-3">
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {selectedCategory !== 'all' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      disabled={isDeletingCategory}
                      onClick={() => handleDeleteCategory(selectedCategory)}
                    >
                      Delete selected category
                    </Button>
                  )}
                  <p>
                    Categories allow you to control ordering sequence and
                    visibility per QR view.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No categories yet. Create your first category to start adding
                items.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Item</CardTitle>
          <CardDescription>
            Items inherit pricing and availability instantly across the PWA.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={handleCreateItem}
          >
            <div className="space-y-2">
              <Label htmlFor="item-name">Name</Label>
              <Input
                id="item-name"
                placeholder="Masala Dosa"
                value={itemName}
                onChange={(event) => setItemName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-price">Price (INR)</Label>
              <Input
                id="item-price"
                type="number"
                min="0"
                step="0.01"
                placeholder="89"
                value={itemPrice}
                onChange={(event) => setItemPrice(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="item-description">Description</Label>
              <Textarea
                id="item-description"
                placeholder="Crispy rice crepe with spiced potatoes"
                value={itemDescription}
                onChange={(event) => setItemDescription(event.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={isCreatingItem}>
                {isCreatingItem ? 'Saving...' : 'Add item'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Menu Items</CardTitle>
          <CardDescription>
            Filter by category to focus on a section and keep availability in
            sync.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isItemsLoading || isItemsFetching ? (
            <div className="flex items-center justify-center py-10">
              <LoadingSpinner />
            </div>
          ) : menuItems.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {menuItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      {categories.find((cat) => cat.id === item.categoryId)
                        ?.name ?? 'Uncategorised'}
                    </TableCell>
                    <TableCell>₹{item.pricing.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={item.isAvailable}
                          onCheckedChange={(value) =>
                            handleAvailabilityToggle(item.id, value)
                          }
                        />
                        <span className="text-sm text-muted-foreground">
                          {item.isAvailable ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No items yet. Add your first dish using the form above.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MenuPage;
