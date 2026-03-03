import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  Leaf,
  Wheat,
  Milk,
  Nut,
  Flame,
  Package,
  UtensilsCrossed,
  Tag,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ImageOff,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useUpdateMenuItemMutation } from '@/store/api/restaurantsApi';
import { useJwtAuth } from '@/contexts/JwtAuthProvider';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MenuItemsPanelProps {
  category: any;
  items: any[];
  isLoading: boolean;
  onAddItem: () => void;
  onEditItem: (item: any) => void;
  onDeleteItem: (item: any) => void;
  highlightItemId?: string | null;
  isMobile?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency: string = 'INR'): string {
  const symbol = currency === 'INR' ? '₹' : '$';
  return `${symbol}${amount.toFixed(0)}`;
}

// ─── Dietary Badge ────────────────────────────────────────────────────────────

function DietaryBadge({
  label,
  color,
  icon: Icon,
}: {
  label: string;
  color: string;
  icon: React.ElementType;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium ring-1',
        color
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

function ItemDietaryBadges({ item }: { item: any }) {
  const badges = [];

  if (item.isVegetarian)
    badges.push(
      <DietaryBadge
        key="veg"
        label="Veg"
        color="bg-emerald-50 text-emerald-700 ring-emerald-200"
        icon={Leaf}
      />
    );
  if (item.isVegan)
    badges.push(
      <DietaryBadge
        key="vegan"
        label="Vegan"
        color="bg-green-50 text-green-700 ring-green-200"
        icon={Leaf}
      />
    );
  if (item.isGlutenFree)
    badges.push(
      <DietaryBadge
        key="gf"
        label="GF"
        color="bg-amber-50 text-amber-700 ring-amber-200"
        icon={Wheat}
      />
    );
  if (item.isDairyFree)
    badges.push(
      <DietaryBadge
        key="df"
        label="Dairy-free"
        color="bg-sky-50 text-sky-700 ring-sky-200"
        icon={Milk}
      />
    );
  if (item.hasNuts)
    badges.push(
      <DietaryBadge
        key="nuts"
        label="Nuts"
        color="bg-orange-50 text-orange-700 ring-orange-200"
        icon={Nut}
      />
    );
  if (item.allergens?.length > 0)
    badges.push(
      <DietaryBadge
        key="allergen"
        label="Allergens"
        color="bg-red-50 text-red-600 ring-red-200"
        icon={AlertTriangle}
      />
    );

  return badges.length > 0 ? (
    <div className="flex items-center gap-1 flex-wrap">{badges}</div>
  ) : null;
}

// ─── Image Carousel (for side panel) ─────────────────────────────────────────

function ImageCarousel({ images, name }: { images: string[]; name: string }) {
  const [idx, setIdx] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <ImageOff className="h-8 w-8 text-slate-300 mx-auto mb-1" />
          <p className="text-xs text-slate-400">No image</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-video bg-slate-100 rounded-lg overflow-hidden group">
      <img
        src={images[idx]}
        alt={name}
        className="w-full h-full object-cover"
      />
      {images.length > 1 && (
        <>
          <button
            onClick={() => setIdx((i) => (i === 0 ? images.length - 1 : i - 1))}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIdx((i) => (i === images.length - 1 ? 0 : i + 1))}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_: string, i: number) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-colors',
                  i === idx ? 'bg-white' : 'bg-white/50'
                )}
              />
            ))}
          </div>
          <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded-full">
            {idx + 1}/{images.length}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Item Detail Side Panel ───────────────────────────────────────────────────

function ItemDetailPanel({
  item,
  onClose,
  onEdit,
  onDelete,
  onToggleAvailability,
  isUpdating,
}: {
  item: any | null;
  onClose: () => void;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
  onToggleAvailability: (item: any) => void;
  isUpdating: boolean;
}) {
  const isOpen = !!item;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const amount = item?.pricing?.amount || 0;
  const currency = item?.pricing?.currency || 'INR';
  const symbol = currency === 'INR' ? '₹' : '$';

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-black/10 z-20 transition-opacity duration-200',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'absolute top-0 right-0 h-full w-80 bg-white border-l border-slate-200 shadow-xl z-30 flex flex-col transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {item && (
          <>
            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'h-2 w-2 rounded-full',
                    item.isAvailable ? 'bg-emerald-500' : 'bg-slate-300'
                  )}
                />
                <span className="text-sm font-semibold text-slate-800 truncate max-w-[180px]">
                  {item.name}
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Image */}
              <ImageCarousel images={item.imageUrls || []} name={item.name} />

              {/* Price */}
              <div className="flex items-baseline justify-between">
                <div>
                  {item.hasSpecialPrice && item.specialPrice > 0 ? (
                    <div className="space-y-0.5">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-emerald-600">
                          {symbol}{item.specialPrice.toFixed(0)}
                        </span>
                        <span className="text-sm text-slate-400 line-through">
                          {formatCurrency(amount, currency)}
                        </span>
                      </div>
                      {item.specialPriceLabel && (
                        <p className="text-xs text-emerald-600 font-medium">
                          {item.specialPriceLabel}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-2xl font-bold text-slate-900">
                      {formatCurrency(amount, currency)}
                    </span>
                  )}
                  <p className="text-xs text-slate-400 mt-0.5">
                    {item.pricing?.isTaxInclusive ? 'Tax inclusive' : 'Tax exclusive'}
                    {item.exemptFromGst && ' · GST exempt'}
                  </p>
                </div>

                {/* Availability toggle */}
                <div className="flex items-center gap-2">
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  ) : (
                    <Switch
                      checked={item.isAvailable}
                      onCheckedChange={() => onToggleAvailability(item)}
                    />
                  )}
                  <span className="text-xs text-slate-500 font-medium">
                    {item.isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                </div>
              </div>

              {/* Description */}
              {item.description && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Description
                  </p>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              )}

              {/* Dietary Info */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Dietary & Allergens
                </p>
                <ItemDietaryBadges item={item} />
                {!item.isVegetarian && !item.isVegan && !item.isGlutenFree &&
                  !item.isDairyFree && !item.hasNuts && !item.allergens?.length && (
                  <p className="text-xs text-slate-400">No dietary info set</p>
                )}
              </div>

              {/* Tags */}
              {item.tags?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Tags
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map((tag: string, i: number) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full"
                      >
                        <Tag className="h-2.5 w-2.5" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Modifiers */}
              {item.applicableModifiers?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Modifiers
                  </p>
                  <div className="bg-slate-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-slate-600">
                      {item.applicableModifiers.length} modifier
                      {item.applicableModifiers.length !== 1 ? 's' : ''} applied
                    </p>
                  </div>
                </div>
              )}

              {/* Kitchen Stations */}
              {item.kitchenStations?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Kitchen Stations
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.kitchenStations.map((s: string, i: number) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full"
                      >
                        <UtensilsCrossed className="h-2.5 w-2.5" />
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Nutritional Info */}
              {item.nutritionalInfo?.servingSize && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Nutritional Info
                  </p>
                  <p className="text-xs text-slate-600">
                    Serving size: {item.nutritionalInfo.servingSize}
                  </p>
                </div>
              )}

              {/* Meta */}
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Details
                </p>
                <div className="space-y-1.5 text-xs text-slate-500">
                  <div className="flex justify-between">
                    <span>Display order</span>
                    <span className="font-medium text-slate-700">{item.displayOrder}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Food category</span>
                    <span className="font-medium text-slate-700 capitalize">
                      {(item.foodCategory || '').replace('_', ' ')}
                    </span>
                  </div>
                  {item.exemptFromGst && (
                    <div className="flex justify-between">
                      <span>GST</span>
                      <span className="font-medium text-emerald-600">Exempt</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Panel Footer */}
            <div className="border-t border-slate-100 p-3 space-y-2 bg-white">
              <Button
                className="w-full bg-slate-900 hover:bg-slate-800 text-white h-9 text-sm font-medium gap-1.5"
                onClick={() => onEdit(item)}
              >
                <Edit className="h-3.5 w-3.5" />
                Edit Item
              </Button>
              <Button
                variant="outline"
                className="w-full border-red-200 text-red-600 hover:bg-red-50 h-9 text-sm font-medium gap-1.5"
                onClick={() => onDelete(item)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Item
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── Item Row ─────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  isSelected,
  isHighlighted,
  onClick,
  onToggleAvailability,
  isUpdating,
}: {
  item: any;
  isSelected: boolean;
  isHighlighted: boolean;
  onClick: () => void;
  onToggleAvailability: (item: any) => void;
  isUpdating: boolean;
}) {
  const amount = item.pricing?.amount || 0;
  const currency = item.pricing?.currency || 'INR';
  const hasImage = item.imageUrls?.length > 0;

  return (
    <div
      onClick={onClick}
      className={cn(
        'group flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-b-0 cursor-pointer transition-colors duration-100',
        isSelected
          ? 'bg-slate-50 border-l-2 border-l-slate-900'
          : isHighlighted
          ? 'bg-amber-50 border-l-2 border-l-amber-400'
          : 'bg-white border-l-2 border-l-transparent hover:bg-slate-50/70'
      )}
    >
      {/* Thumbnail */}
      <div className="h-10 w-10 rounded-lg overflow-hidden bg-slate-100 shrink-0">
        {hasImage ? (
          <img
            src={item.imageUrls[0]}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Package className="h-4 w-4 text-slate-300" />
          </div>
        )}
      </div>

      {/* Name + dietary */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className={cn(
              'text-sm font-semibold truncate',
              !item.isAvailable && 'text-slate-400'
            )}
          >
            {item.name}
          </span>
          {/* Inline dietary dots */}
          <div className="flex items-center gap-1 shrink-0">
            {item.isVegetarian && (
              <div className="h-3 w-3 rounded-full bg-emerald-100 flex items-center justify-center" title="Vegetarian">
                <Leaf className="h-2 w-2 text-emerald-600" />
              </div>
            )}
            {item.isVegan && (
              <div className="h-3 w-3 rounded-full bg-green-100 flex items-center justify-center" title="Vegan">
                <Leaf className="h-2 w-2 text-green-700" />
              </div>
            )}
            {item.hasNuts && (
              <div className="h-3 w-3 rounded-full bg-orange-100 flex items-center justify-center" title="Contains nuts">
                <AlertTriangle className="h-2 w-2 text-orange-600" />
              </div>
            )}
            {item.applicableModifiers?.length > 0 && (
              <span className="text-xs text-slate-400 bg-slate-100 px-1 rounded font-mono">
                +{item.applicableModifiers.length}
              </span>
            )}
          </div>
        </div>
        {item.description && (
          <p className="text-xs text-slate-400 truncate">{item.description}</p>
        )}
      </div>

      {/* Price */}
      <div className="text-right shrink-0">
        {item.hasSpecialPrice && item.specialPrice > 0 ? (
          <div>
            <p className="text-sm font-bold text-emerald-600">
              {formatCurrency(item.specialPrice, currency)}
            </p>
            <p className="text-xs text-slate-400 line-through">
              {formatCurrency(amount, currency)}
            </p>
          </div>
        ) : (
          <p className="text-sm font-bold text-slate-800">
            {formatCurrency(amount, currency)}
          </p>
        )}
      </div>

      {/* Availability toggle */}
      <div
        className="shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {isUpdating ? (
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        ) : (
          <Switch
            checked={item.isAvailable}
            onCheckedChange={() => onToggleAvailability(item)}
          />
        )}
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ItemRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 animate-pulse">
      <div className="h-10 w-10 rounded-lg bg-slate-100 shrink-0" />
      <div className="flex-1">
        <div className="h-3.5 bg-slate-100 rounded w-40 mb-2" />
        <div className="h-3 bg-slate-100 rounded w-56" />
      </div>
      <div className="h-3.5 bg-slate-100 rounded w-12 shrink-0" />
      <div className="h-5 w-9 bg-slate-100 rounded-full shrink-0" />
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ filtered, onAdd }: { filtered: boolean; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <UtensilsCrossed className="h-5 w-5 text-slate-400" />
      </div>
      <p className="text-sm font-semibold text-slate-700 mb-1">
        {filtered ? 'No items match your search' : 'No items yet'}
      </p>
      <p className="text-xs text-slate-400 max-w-xs mb-5">
        {filtered
          ? 'Try a different search term'
          : 'Add your first menu item to this category'}
      </p>
      {!filtered && (
        <Button
          onClick={onAdd}
          className="gap-1.5 bg-slate-900 hover:bg-slate-800 text-white h-9 text-sm"
        >
          <Plus className="h-3.5 w-3.5" />
          Add First Item
        </Button>
      )}
    </div>
  );
}

// ─── No Category Selected ─────────────────────────────────────────────────────

function NoCategorySelected() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <UtensilsCrossed className="h-7 w-7 text-slate-300" />
      </div>
      <p className="text-sm font-semibold text-slate-600 mb-1">
        Select a category
      </p>
      <p className="text-xs text-slate-400">
        Choose a category from the left to view and manage its items
      </p>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function MenuItemsPanel({
  category,
  items,
  isLoading,
  onAddItem,
  onEditItem,
  onDeleteItem,
  highlightItemId,
  isMobile = false,
}: MenuItemsPanelProps) {
  const { toast } = useToast();
  const { user } = useJwtAuth();
  const restaurantId = user?.restaurantId;

  const [updateMenuItem] = useUpdateMenuItemMutation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  // Keep selected item in sync when items refresh
  useEffect(() => {
    if (selectedItem && items.length) {
      const updated = items.find((i) => i.id === selectedItem.id);
      if (updated) setSelectedItem(updated);
    }
  }, [items]);

  // Auto-select highlighted item
  useEffect(() => {
    if (highlightItemId && items.length) {
      const target = items.find((i) => i.id === highlightItemId);
      if (target) setSelectedItem(target);
    }
  }, [highlightItemId, items]);

  const handleToggleAvailability = async (item: any) => {
    if (!restaurantId) return;
    setUpdatingItemId(item.id);
    try {
      await updateMenuItem({
        restaurantId,
        itemId: item.id,
        body: { isAvailable: !item.isAvailable },
      }).unwrap();
      toast({
        title: `${item.name} is now ${!item.isAvailable ? 'available' : 'unavailable'}`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error?.data?.message || 'Failed to update item',
      });
    } finally {
      setUpdatingItemId(null);
    }
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableCount = items.filter((i) => i.isAvailable).length;

  if (!category) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <NoCategorySelected />
      </div>
    );
  }

  return (
    <div className={cn('flex-1 flex flex-col min-w-0 relative overflow-hidden', isMobile && 'h-full')}>

      {/* Panel Header */}
      <div className="bg-white border-b border-slate-200 px-5 py-4 shrink-0">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900 truncate">
              {category.name}
            </h2>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
              {!isLoading && (
                <>
                  <span>{items.length} items</span>
                  <span>·</span>
                  <span className="text-emerald-600 font-medium">
                    {availableCount} available
                  </span>
                  {items.length - availableCount > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-slate-400">
                        {items.length - availableCount} unavailable
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
          <Button
            onClick={onAddItem}
            className="gap-1.5 bg-slate-900 hover:bg-slate-800 text-white h-9 text-sm shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Item
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm bg-slate-50 border-slate-200"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* List Header */}
      {!isLoading && filteredItems.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50/80 border-b border-slate-100">
          <div className="flex items-center gap-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <span className="w-10 invisible">img</span>
            <span>Item</span>
          </div>
          <div className="flex items-center gap-6 text-xs font-semibold text-slate-400 uppercase tracking-wider pr-1">
            <span>Price</span>
            <span>Available</span>
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="flex-1 overflow-y-auto bg-white">
        {isLoading ? (
          Array.from({ length: 7 }).map((_, i) => <ItemRowSkeleton key={i} />)
        ) : filteredItems.length === 0 ? (
          <EmptyState filtered={!!searchQuery} onAdd={onAddItem} />
        ) : (
          filteredItems.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              isSelected={selectedItem?.id === item.id}
              isHighlighted={highlightItemId === item.id && selectedItem?.id !== item.id}
              onClick={() =>
                setSelectedItem((prev: any) =>
                  prev?.id === item.id ? null : item
                )
              }
              onToggleAvailability={handleToggleAvailability}
              isUpdating={updatingItemId === item.id}
            />
          ))
        )}
      </div>

      {/* Footer hint */}
      {!isLoading && filteredItems.length > 0 && (
        <div className="px-4 py-2 bg-slate-50/50 border-t border-slate-100 shrink-0">
          <p className="text-xs text-slate-400 text-center">
            Click any item to view details · Toggle switch to change availability
          </p>
        </div>
      )}

      {/* Item Detail Side Panel — overlays on top of list */}
      <ItemDetailPanel
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onEdit={(item) => {
          onEditItem(item);
          setSelectedItem(null);
        }}
        onDelete={(item) => {
          onDeleteItem(item);
          setSelectedItem(null);
        }}
        onToggleAvailability={handleToggleAvailability}
        isUpdating={updatingItemId === selectedItem?.id}
      />
    </div>
  );
}