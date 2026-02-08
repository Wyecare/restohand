import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
  Search,
  Leaf,
  AlertCircle,
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
  const [searchQuery, setSearchQuery] = useState('');

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
        description: `${item.name} is now ${
          !item.isAvailable ? 'available' : 'unavailable'
        }`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error?.data?.message || 'Failed to update item',
      });
    }
  };

  // Filter items based on search
  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!category) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">
            Select a category to view items
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex-1 flex flex-col bg-muted/30',
        isMobile ? 'h-full' : ''
      )}
    >
      {/* Header */}
      <div className="bg-background border-b">
        <div className="p-4 space-y-4">
          {/* Title and Add Button */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold truncate">{category.name}</h2>
              {category.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {category.description}
                </p>
              )}
            </div>
            <Button onClick={onAddItem} size="lg" className="gap-2 shrink-0">
              <Plus className="h-5 w-5" />
              Add Item
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-base"
            />
          </div>

          {/* Stats */}
          {items.length > 0 && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="font-medium">{filteredItems.length} items</span>
              <span>•</span>
              <span>
                {items.filter((item) => item.isAvailable).length} available
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Items Grid */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <p className="text-lg text-muted-foreground mb-4">
                {searchQuery ? 'No items found' : 'No items in this category'}
              </p>
              {!searchQuery && (
                <Button onClick={onAddItem} size="lg" className="gap-2">
                  <Plus className="h-5 w-5" />
                  Add First Item
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onEdit={onEditItem}
                  onDelete={onDeleteItem}
                  onToggleAvailability={handleToggleAvailability}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Individual Item Card Component
function ItemCard({
  item,
  onEdit,
  onDelete,
  onToggleAvailability,
}: {
  item: any;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
  onToggleAvailability: (item: any) => void;
}) {
  const amount = item.pricing?.amount || 0;
  const currency = item.pricing?.currency || 'INR';

  return (
    <div
      className={cn(
        'relative bg-background rounded-lg border-2 overflow-hidden transition-all hover:shadow-md',
        item.isAvailable ? 'border-border' : 'border-muted opacity-60'
      )}
    >
      {/* Action Menu */}
      <div className="absolute top-2 right-2 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 rounded-full shadow-sm"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(item)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(item)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Image Section */}
      <div className="relative aspect-[4/3] bg-muted">
        {item.imageUrls?.[0] ? (
          <img
            src={item.imageUrls[0]}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImagePlus className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}

        {/* Availability Badge */}
        {!item.isAvailable && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge variant="destructive" className="text-sm font-semibold">
              Out of Stock
            </Badge>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-3">
        {/* Name and Price */}
        <div>
          <h3 className="font-semibold text-lg line-clamp-1">{item.name}</h3>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-primary">
              {currency === 'INR' ? '₹' : currency}
              {amount.toFixed(0)}
            </span>
            {item.preparationTime && (
              <span className="text-xs text-muted-foreground">
                {item.preparationTime} min
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        {item.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {item.description}
          </p>
        )}

        {/* Dietary Badges */}
        {item.dietaryInfo && (
          <div className="flex flex-wrap gap-1">
            {item.dietaryInfo.isVegetarian && (
              <Badge
                variant="secondary"
                className="text-xs bg-green-100 text-green-700 border-green-200"
              >
                <Leaf className="w-3 h-3 mr-1" />
                Veg
              </Badge>
            )}
            {item.dietaryInfo.isVegan && (
              <Badge
                variant="secondary"
                className="text-xs bg-green-100 text-green-800 border-green-200"
              >
                Vegan
              </Badge>
            )}
            {item.dietaryInfo.isSpicy && (
              <Badge
                variant="secondary"
                className="text-xs bg-red-100 text-red-700 border-red-200"
              >
                🌶️ Spicy
              </Badge>
            )}
            {item.dietaryInfo.isHalal && (
              <Badge
                variant="secondary"
                className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200"
              >
                Halal
              </Badge>
            )}
            {item.ingredients?.some(
              (ing: any) => ing.allergens?.length > 0
            ) && (
              <Badge
                variant="secondary"
                className="text-xs bg-orange-100 text-orange-700 border-orange-200"
              >
                <AlertCircle className="w-3 h-3 mr-1" />
                Allergen
              </Badge>
            )}
          </div>
        )}

        {/* Availability Toggle */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Available</span>
            <Switch
              checked={item.isAvailable}
              onCheckedChange={() => onToggleAvailability(item)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
