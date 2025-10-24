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
import MetricsCard, { MetricsGrid } from '@/components/MetricsCard';
import { Utensils, Eye, EyeOff, Layers } from 'lucide-react';

const MenuPage = () => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const { toast } = useToast();
  const [categoryName, setCategoryName] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<
    'all' | 'available' | 'unavailable'
  >('all');

  if (!restaurantId) return <Navigate to="/onboarding" replace />;

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

  const menuStats = useMemo(() => {
    const total = menuItems.length;
    const available = menuItems.filter((i) => i.isAvailable).length;
    return {
      total,
      available,
      unavailable: total - available,
      categories: categories.length,
    };
  }, [menuItems, categories.length]);

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (availabilityFilter === 'available' && !item.isAvailable) return false;
      if (availabilityFilter === 'unavailable' && item.isAvailable)
        return false;
      if (searchTerm.trim()) {
        const needle = searchTerm.toLowerCase();
        if (
          !item.name.toLowerCase().includes(needle) &&
          !(item.description ?? '').toLowerCase().includes(needle)
        )
          return false;
      }
      return true;
    });
  }, [menuItems, availabilityFilter, searchTerm]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId || !categoryName) return;
    try {
      await createCategory({
        restaurantId,
        body: { name: categoryName, displayOrder: categories.length },
      }).unwrap();
      setCategoryName('');
      toast({ title: 'Category created' });
    } catch {
      toast({ title: 'Unable to create category', variant: 'destructive' });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!restaurantId) return;
    try {
      await deleteCategory({ restaurantId, categoryId: id }).unwrap();
      toast({ title: 'Category removed' });
    } catch {
      toast({ title: 'Unable to delete category', variant: 'destructive' });
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId || !itemName || !itemPrice) return;
    try {
      await createMenuItem({
        restaurantId,
        body: {
          categoryId: categoryIdFilter,
          name: itemName,
          pricing: {
            amount: Number(itemPrice),
            currency: 'INR',
            isTaxInclusive: true,
          },
          isAvailable: true,
        },
      }).unwrap();
      setItemName('');
      setItemPrice('');
      toast({ title: 'Item added to menu' });
    } catch {
      toast({ title: 'Unable to add item', variant: 'destructive' });
    }
  };

  const handleToggleAvailability = async (id: string, value: boolean) => {
    if (!restaurantId) return;
    try {
      await updateMenuItem({
        restaurantId,
        itemId: id,
        body: { isAvailable: value },
      }).unwrap();
      toast({ title: `Item ${value ? 'available' : 'paused'}` });
    } catch {
      toast({ title: 'Unable to update item', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Menu</h1>
        <p className="text-sm text-muted-foreground">
          Add dishes, group them in categories, and control availability.
        </p>
      </div>

      {/* Stats */}
      <MetricsGrid columns={4}>
        <MetricsCard
          title="Total Dishes"
          value={menuStats.total}
          icon={Utensils}
          iconColor="blue"
        />
        <MetricsCard
          title="Available"
          value={menuStats.available}
          icon={Eye}
          iconColor="green"
        />
        <MetricsCard
          title="Paused"
          value={menuStats.unavailable}
          icon={EyeOff}
          iconColor="orange"
        />
        <MetricsCard
          title="Categories"
          value={menuStats.categories}
          icon={Layers}
          iconColor="purple"
        />
      </MetricsGrid>

      {/* Category and Add Item */}
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Create Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">New Category</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateCategory} className="space-y-3">
              <Input
                placeholder="Category name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                required
              />
              <Button disabled={isCreatingCategory} className="w-full">
                {isCreatingCategory ? 'Creating...' : 'Add Category'}
              </Button>
            </form>
            {!isCategoriesLoading && categories.length > 0 && (
              <div className="mt-4">
                <Label>Existing</Label>
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCategory !== 'all' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive mt-2"
                    onClick={() => handleDeleteCategory(selectedCategory)}
                    disabled={isDeletingCategory}
                  >
                    Delete selected
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Item */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add Dish</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleCreateItem}
              className="grid gap-3 sm:grid-cols-2"
            >
              <Input
                placeholder="Dish name"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                required
              />
              <Input
                placeholder="Price (₹)"
                type="number"
                min="0"
                step="0.01"
                value={itemPrice}
                onChange={(e) => setItemPrice(e.target.value)}
                required
              />
              <Button
                type="submit"
                className="sm:col-span-2"
                disabled={isCreatingItem}
              >
                {isCreatingItem ? 'Saving...' : 'Add Dish'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Menu Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Dishes</CardTitle>
          <CardDescription>Tap to toggle availability quickly.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              placeholder="Search dishes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="sm:max-w-xs"
            />
            <Select
              value={availabilityFilter}
              onValueChange={(v) => setAvailabilityFilter(v as any)}
            >
              <SelectTrigger className="sm:w-40">
                <SelectValue placeholder="All items" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="unavailable">Paused</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isItemsLoading || isItemsFetching ? (
            <div className="flex justify-center py-10">
              <LoadingSpinner />
            </div>
          ) : filteredItems.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              No dishes found.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        {categories.find((c) => c.id === item.categoryId)
                          ?.name ?? '—'}
                      </TableCell>
                      <TableCell>₹{item.pricing.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={item.isAvailable}
                            onCheckedChange={(v) =>
                              handleToggleAvailability(item.id, v)
                            }
                          />
                          <span
                            className={`text-sm ${
                              item.isAvailable
                                ? 'text-green-600'
                                : 'text-orange-600'
                            }`}
                          >
                            {item.isAvailable ? 'Available' : 'Paused'}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MenuPage;
