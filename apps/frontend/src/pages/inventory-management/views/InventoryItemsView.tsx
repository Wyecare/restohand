import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { skipToken } from '@reduxjs/toolkit/query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAppSelector } from '@/store/hooks';
import {
  selectActiveRestaurantId,
  selectAuthSession,
} from '@/store/slices/authSlice';
import {
  useGetInventoryItemsByBranchQuery,
  useGetInventoryAnalyticsByBranchQuery,
  useGetStockAlertsByBranchQuery,
  useGetInventoryCategoriesQuery,
  useUpdateStockMutation,
  useUpdateInventoryItemMutation,
  useMarkAlertAsReadMutation,
  useCreateInventoryItemMutation,
  useGetInventoryUnitsQuery,
} from '@/store/api/inventoryApi';
import { useGetSuppliersQuery } from '@/store/api/suppliersApi';
import {
  Package,
  AlertTriangle,
  TrendingUp,
  Search,
  Plus,
  Eye,
  AlertCircle,
  Edit,
  ShoppingCart,
  Sparkles,
  Check,
  Loader2,
  X,
  MoreHorizontal,
  Boxes,
  IndianRupee,
  ChevronRight,
} from 'lucide-react';
import {
  searchInventoryItems,
  type InventoryItemTemplate,
} from '@/lib/indian-inventory-items';
import { useBranchContext } from '@/contexts/BranchContext';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

// ─── Form Field ────────────────────────────────────────────────────────────────

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Stock Status Badge ────────────────────────────────────────────────────────

function StockBadge({ item }: { item: any }) {
  if (item.tracking.isOutOfStock)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 ring-1 ring-red-500/20">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Out of Stock
      </span>
    );
  if (item.tracking.isLowStock)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Low Stock
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      In Stock
    </span>
  );
}

// ─── Item Row Skeleton ─────────────────────────────────────────────────────────

function ItemRowSkeleton() {
  return (
    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_40px] gap-4 px-4 py-3.5 border-b border-border animate-pulse items-center">
      <div className="space-y-1.5">
        <div className="h-3.5 bg-muted rounded w-36" />
        <div className="h-3 bg-muted rounded w-52" />
      </div>
      <div className="h-5 bg-muted rounded w-20" />
      <div className="h-3.5 bg-muted rounded w-16" />
      <div className="h-3.5 bg-muted rounded w-10" />
      <div className="h-5 bg-muted rounded w-20" />
      <div className="h-6 w-6 bg-muted rounded" />
    </div>
  );
}

// ─── Add/Edit Item Dialog ──────────────────────────────────────────────────────

function ItemFormDialog({
  open,
  onOpenChange,
  title,
  description,
  form,
  onChange,
  onSubmit,
  isLoading,
  submitLabel,
  categoriesData,
  unitsData,
  suppliersData,
  // Add-only props
  showSmartSearch,
  itemSuggestions,
  showSuggestions,
  selectedSuggestionIndex,
  onNameChange,
  onKeyDown,
  onSelectSuggestion,
}: any) {
  const QUICK_ITEMS = [
    { name: 'Onion', category: 'vegetables' },
    { name: 'Tomato', category: 'vegetables' },
    { name: 'Basmati Rice', category: 'grains' },
    { name: 'Paneer', category: 'dairy' },
    { name: 'Chicken', category: 'meat' },
    { name: 'Turmeric Powder', category: 'spices' },
  ];

  const isValid =
    form.name && form.category && form.unit && form.costPerUnit &&
    form.minimumStock && form.reorderPoint && form.reorderQuantity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] p-0 gap-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border">
          <DialogTitle className="text-base font-bold">{title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-0.5">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4">
          {/* Quick add — only on create form */}
          {showSmartSearch && (
            <div className="rounded-xl border border-border bg-muted/30 p-3.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Quick add common items
              </p>
              <div className="grid grid-cols-3 gap-2">
                {QUICK_ITEMS.map((qi) => {
                  const s = searchInventoryItems(qi.name).find(
                    (x) => x.name === qi.name && x.category === qi.category
                  );
                  return s ? (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => onSelectSuggestion(s)}
                      className="text-left p-2.5 text-xs bg-card hover:bg-muted/60 border border-border rounded-lg transition-colors"
                    >
                      <div className="font-semibold text-foreground">{s.name}</div>
                      <div className="text-muted-foreground mt-0.5">
                        ₹{s.estimatedCostPerUnit}/{s.unit}
                      </div>
                    </button>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Name + Category */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label={showSmartSearch ? 'Item Name ✦' : 'Item Name'}>
              <div className="relative">
                <Input
                  value={form.name}
                  onChange={(e) =>
                    showSmartSearch
                      ? onNameChange(e.target.value)
                      : onChange({ name: e.target.value })
                  }
                  onKeyDown={showSmartSearch ? onKeyDown : undefined}
                  placeholder={showSmartSearch ? 'Type to search…' : 'Item name'}
                  className="h-9 text-sm"
                  autoComplete="off"
                />
                {showSmartSearch && showSuggestions && itemSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    <p className="px-3 py-2 text-xs text-muted-foreground border-b border-border">
                      Common restaurant items
                    </p>
                    {itemSuggestions.slice(0, 5).map((s: InventoryItemTemplate, i: number) => (
                      <div
                        key={`${s.name}-${s.category}`}
                        className={cn(
                          'px-3 py-2.5 cursor-pointer border-b border-border/50 hover:bg-muted/50 transition-colors',
                          selectedSuggestionIndex === i && 'bg-muted/50'
                        )}
                        onClick={() => onSelectSuggestion(s)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">{s.name}</p>
                            {s.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                                {s.category}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {s.unit} · ₹{s.estimatedCostPerUnit}
                              </span>
                            </div>
                          </div>
                          <Check className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </FormField>

            <FormField label="Category *">
              <Select
                value={form.category}
                onValueChange={(v) => onChange({ category: v })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categoriesData?.predefinedCategories?.map((c: string) => (
                    <SelectItem key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          {/* Description */}
          <FormField label="Description">
            <Input
              value={form.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Optional description"
              className="h-9 text-sm"
            />
          </FormField>

          {/* Unit + Cost */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Unit *">
              <Select
                value={form.unit}
                onValueChange={(v) => onChange({ unit: v })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {unitsData?.units?.map((u: string) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Cost Per Unit (₹) *">
              <Input
                type="number"
                step="0.01"
                value={form.costPerUnit}
                onChange={(e) => onChange({ costPerUnit: e.target.value })}
                placeholder="0.00"
                className="h-9 text-sm"
              />
            </FormField>
          </div>

          {/* Stock levels */}
          <div className="grid grid-cols-3 gap-4">
            {showSmartSearch && (
              <FormField label="Current Stock">
                <Input
                  type="number"
                  value={form.currentStock}
                  onChange={(e) => onChange({ currentStock: e.target.value })}
                  placeholder="0"
                  className="h-9 text-sm"
                />
              </FormField>
            )}
            <FormField label="Min Stock *">
              <Input
                type="number"
                value={form.minimumStock}
                onChange={(e) => onChange({ minimumStock: e.target.value })}
                placeholder="0"
                className="h-9 text-sm"
              />
            </FormField>
            <FormField label="Reorder Point *">
              <Input
                type="number"
                value={form.reorderPoint}
                onChange={(e) => onChange({ reorderPoint: e.target.value })}
                placeholder="0"
                className="h-9 text-sm"
              />
            </FormField>
            <FormField label="Reorder Qty *">
              <Input
                type="number"
                value={form.reorderQuantity}
                onChange={(e) => onChange({ reorderQuantity: e.target.value })}
                placeholder="0"
                className="h-9 text-sm"
              />
            </FormField>
          </div>

          {/* Supplier + Storage */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Default Supplier">
              <Select
                value={form.supplier || 'none'}
                onValueChange={(v) => onChange({ supplier: v === 'none' ? '' : v })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {suppliersData?.suppliers?.map((s: any) => (
                    <SelectItem key={s._id || s.id} value={s.name}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Storage Location">
              <Input
                value={form.storageLocation || ''}
                onChange={(e) => onChange({ storageLocation: e.target.value })}
                placeholder="e.g. cold storage, shelf 3"
                className="h-9 text-sm"
              />
            </FormField>
          </div>

          {/* Tags */}
          <FormField label="Tags (comma separated)">
            <Input
              value={form.tags}
              onChange={(e) => onChange({ tags: e.target.value })}
              placeholder="e.g. perishable, frozen, organic"
              className="h-9 text-sm"
            />
          </FormField>
        </div>

        <DialogFooter className="px-5 py-3 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onSubmit}
            disabled={isLoading || !isValid}
          >
            {isLoading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Stock Update Dialog ───────────────────────────────────────────────────────

function StockUpdateDialog({
  open,
  onOpenChange,
  itemName,
  quantity,
  onQuantityChange,
  type,
  onTypeChange,
  onSubmit,
}: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px] p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border">
          <DialogTitle className="text-base font-bold">Update Stock</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-0.5">
            {itemName}
          </DialogDescription>
        </DialogHeader>
        <div className="px-5 py-4 space-y-4">
          <FormField label="Quantity">
            <Input
              type="number"
              value={quantity}
              onChange={(e) => onQuantityChange(e.target.value)}
              placeholder="Enter quantity"
              className="h-9 text-sm"
              autoFocus
            />
          </FormField>
          <FormField label="Transaction Type">
            <Select value={type} onValueChange={onTypeChange}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="purchase">Purchase (Add Stock)</SelectItem>
                <SelectItem value="consumption">Consumption (Use Stock)</SelectItem>
                <SelectItem value="waste">Waste (Remove Stock)</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </div>
        <DialogFooter className="px-5 py-3 border-t border-border">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={onSubmit} disabled={!quantity}>
            Update Stock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── View Item Dialog ──────────────────────────────────────────────────────────

function ViewItemDialog({
  open,
  onOpenChange,
  item,
  onEdit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: any;
  onEdit: () => void;
}) {
  if (!item) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border">
          <DialogTitle className="text-base font-bold">{item.name}</DialogTitle>
          <DialogDescription className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="capitalize">{item.category}</span>
            <span>·</span>
            <span>{item.unit}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4">
          {item.description && (
            <p className="text-sm text-muted-foreground">{item.description}</p>
          )}

          {/* Key stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">Current Stock</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {item.stockLevels.currentStock}
                <span className="text-sm font-normal text-muted-foreground ml-1">{item.unit}</span>
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">Cost Per Unit</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {formatCurrency(item.pricing.costPerUnit)}
              </p>
            </div>
          </div>

          {/* Stock levels */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Min Stock', val: item.stockLevels.minimumStock },
              { label: 'Reorder At', val: item.stockLevels.reorderPoint },
              { label: 'Reorder Qty', val: item.stockLevels.reorderQuantity },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border bg-muted/20 px-3 py-2.5 text-center">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-sm font-bold text-foreground mt-0.5 tabular-nums">{stat.val}</p>
              </div>
            ))}
          </div>

          {/* Meta */}
          <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
            {item.pricing.supplier && (
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs text-muted-foreground">Supplier</span>
                <span className="text-xs font-semibold text-foreground">{item.pricing.supplier}</span>
              </div>
            )}
            {item.storageLocation && (
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs text-muted-foreground">Storage</span>
                <span className="text-xs font-semibold text-foreground">{item.storageLocation}</span>
              </div>
            )}
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-muted-foreground">Total Value</span>
              <span className="text-xs font-semibold text-foreground">
                {formatCurrency(item.stockLevels.currentStock * item.pricing.costPerUnit)}
              </span>
            </div>
          </div>

          {/* Tags */}
          {item.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((t: string) => (
                <span key={t} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="px-5 py-3 border-t border-border">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button size="sm" onClick={onEdit}>
            <Edit className="h-3.5 w-3.5 mr-1.5" />
            Edit Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main View ─────────────────────────────────────────────────────────────────

const EMPTY_ADD_FORM = {
  name: '', description: '', category: '', unit: '',
  costPerUnit: '', minimumStock: '', reorderPoint: '',
  reorderQuantity: '', currentStock: '', supplier: '', storageLocation: '', tags: '',
};

const EMPTY_EDIT_FORM = {
  name: '', description: '', category: '', unit: '',
  costPerUnit: '', minimumStock: '', reorderPoint: '',
  reorderQuantity: '', supplier: '', storageLocation: '', tags: '',
};

export function InventoryItemsView() {
  const session = useAppSelector(selectAuthSession);
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const { currentBranch } = useBranchContext();
  const { toast } = useToast();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockFilter, setStockFilter] = useState('');

  // Dialogs
  const [showAddItem, setShowAddItem] = useState(false);
  const [showEditItem, setShowEditItem] = useState(false);
  const [showViewItem, setShowViewItem] = useState(false);
  const [showStockUpdate, setShowStockUpdate] = useState(false);
  const [selectedItemData, setSelectedItemData] = useState<any>(null);

  // Forms
  const [addForm, setAddForm] = useState({ ...EMPTY_ADD_FORM });
  const [editForm, setEditForm] = useState({ ...EMPTY_EDIT_FORM });
  const [stockQty, setStockQty] = useState('');
  const [stockType, setStockType] = useState<'purchase' | 'consumption' | 'waste' | 'adjustment'>('purchase');

  // Smart suggestions
  const [itemSuggestions, setItemSuggestions] = useState<InventoryItemTemplate[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  // Mutations
  const [updateStock] = useUpdateStockMutation();
  const [updateInventoryItem, { isLoading: isUpdating }] = useUpdateInventoryItemMutation();
  const [markAlertAsRead] = useMarkAlertAsReadMutation();
  const [createInventoryItem, { isLoading: isCreating }] = useCreateInventoryItemMutation();

  // Queries
  const branchParams = restaurantId && currentBranch?._id
    ? { restaurantId, branchId: currentBranch._id }
    : skipToken;

  const { data: items, isLoading: itemsLoading, isError: itemsError } =
    useGetInventoryItemsByBranchQuery(
      restaurantId && currentBranch?._id
        ? {
            restaurantId,
            branchId: currentBranch._id,
            search: searchQuery || undefined,
            category: selectedCategory || undefined,
            lowStock: stockFilter === 'low' ? true : undefined,
            outOfStock: stockFilter === 'out' ? true : undefined,
          }
        : skipToken
    );

  const { data: analytics } = useGetInventoryAnalyticsByBranchQuery(branchParams);
  const { data: alerts } = useGetStockAlertsByBranchQuery(branchParams);
  const { data: categoriesData } = useGetInventoryCategoriesQuery(restaurantId ?? skipToken);
  const { data: unitsData } = useGetInventoryUnitsQuery(restaurantId ?? skipToken);
  const { data: suppliersData } = useGetSuppliersQuery(
    restaurantId ? { restaurantId, isActive: true } : skipToken
  );

  const filteredItems = useMemo(() => {
    if (!items) return [];
    return items.filter((item) => {
      const matchSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = !selectedCategory || item.category === selectedCategory;
      const matchStock =
        !stockFilter ||
        (stockFilter === 'low' && item.tracking.isLowStock) ||
        (stockFilter === 'out' && item.tracking.isOutOfStock);
      return matchSearch && matchCat && matchStock;
    });
  }, [items, searchQuery, selectedCategory, stockFilter]);

  const criticalAlerts = alerts?.filter((a) => a.severity === 'critical') || [];
  const warningAlerts = alerts?.filter((a) => a.severity === 'warning') || [];

  // Handlers
  const handleNameChange = (value: string) => {
    setAddForm((f) => ({ ...f, name: value }));
    if (value.trim()) {
      setItemSuggestions(searchInventoryItems(value));
      setShowSuggestions(true);
      setSelectedSuggestionIndex(-1);
    } else {
      setShowSuggestions(false);
      setItemSuggestions([]);
    }
  };

  const selectSuggestion = (s: InventoryItemTemplate) => {
    setAddForm({
      name: s.name,
      description: s.description || '',
      category: s.category,
      unit: s.unit,
      costPerUnit: s.estimatedCostPerUnit.toString(),
      minimumStock: s.minimumStock.toString(),
      reorderPoint: s.reorderPoint.toString(),
      reorderQuantity: s.reorderQuantity.toString(),
      currentStock: '0',
      supplier: '',
      storageLocation: '',
      tags: s.tags.join(', '),
    });
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || !itemSuggestions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex((p) => Math.min(p + 1, itemSuggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex((p) => Math.max(p - 1, 0));
    } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
      e.preventDefault();
      selectSuggestion(itemSuggestions[selectedSuggestionIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleAddItem = async () => {
    if (!restaurantId) return;
    try {
      await createInventoryItem({
        restaurantId,
        name: addForm.name,
        description: addForm.description || undefined,
        category: addForm.category,
        unit: addForm.unit,
        costPerUnit: parseFloat(addForm.costPerUnit),
        minimumStock: parseFloat(addForm.minimumStock),
        reorderPoint: parseFloat(addForm.reorderPoint),
        reorderQuantity: parseFloat(addForm.reorderQuantity),
        currentStock: parseFloat(addForm.currentStock) || 0,
        supplier: addForm.supplier || undefined,
        tags: addForm.tags ? addForm.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      }).unwrap();
      toast({ title: `"${addForm.name}" added to inventory` });
      setShowAddItem(false);
      setAddForm({ ...EMPTY_ADD_FORM });
    } catch {
      toast({ title: 'Failed to add item', variant: 'destructive' });
    }
  };

  const openEdit = (item: any) => {
    setSelectedItemData(item);
    setEditForm({
      name: item.name,
      description: item.description || '',
      category: item.category,
      unit: item.unit,
      costPerUnit: String(item.pricing.costPerUnit),
      minimumStock: String(item.stockLevels.minimumStock),
      reorderPoint: String(item.stockLevels.reorderPoint),
      reorderQuantity: String(item.stockLevels.reorderQuantity),
      supplier: item.pricing.supplier || '',
      storageLocation: item.storageLocation || '',
      tags: (item.tags || []).join(', '),
    });
    setShowEditItem(true);
  };

  const handleEditItem = async () => {
    if (!restaurantId || !selectedItemData) return;
    try {
      await updateInventoryItem({
        restaurantId,
        itemId: selectedItemData._id || selectedItemData.id,
        name: editForm.name,
        description: editForm.description || undefined,
        category: editForm.category,
        unit: editForm.unit,
        costPerUnit: parseFloat(editForm.costPerUnit),
        minimumStock: parseFloat(editForm.minimumStock),
        reorderPoint: parseFloat(editForm.reorderPoint),
        reorderQuantity: parseFloat(editForm.reorderQuantity),
        supplier: editForm.supplier || undefined,
        storageLocation: editForm.storageLocation || undefined,
        tags: editForm.tags ? editForm.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      }).unwrap();
      toast({ title: `"${editForm.name}" updated` });
      setShowEditItem(false);
    } catch {
      toast({ title: 'Failed to update item', variant: 'destructive' });
    }
  };

  const handleStockUpdate = async () => {
    if (!restaurantId || !selectedItemData || !stockQty) return;
    try {
      await updateStock({
        restaurantId,
        itemId: selectedItemData.id,
        quantity: parseFloat(stockQty),
        type: stockType,
      });
      toast({ title: 'Stock updated successfully' });
      setShowStockUpdate(false);
      setSelectedItemData(null);
      setStockQty('');
    } catch {
      toast({ title: 'Failed to update stock', variant: 'destructive' });
    }
  };

  if (!session) return <Navigate to="/login" replace />;
  if (!restaurantId) return <Navigate to="/onboarding" replace />;

  const KPI_STATS = analytics
    ? [
        {
          label: 'Total Items',
          value: analytics.totalItems,
          icon: Boxes,
          color: 'text-foreground',
        },
        {
          label: 'Low Stock',
          value: analytics.lowStockItems,
          icon: AlertTriangle,
          color: analytics.lowStockItems > 0 ? 'text-amber-600' : 'text-foreground',
        },
        {
          label: 'Out of Stock',
          value: analytics.outOfStockItems,
          icon: AlertCircle,
          color: analytics.outOfStockItems > 0 ? 'text-red-600' : 'text-foreground',
        },
        {
          label: 'Total Value',
          value: formatCurrency(analytics.totalInventoryValue),
          icon: IndianRupee,
          color: 'text-foreground',
          isText: true,
        },
      ]
    : [];

  return (
    <div className="container mx-auto px-6 py-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground tracking-tight">
          Inventory Items
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Track stock levels, monitor consumption, and manage inventory
        </p>
      </div>

      {/* KPI strip */}
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {KPI_STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card"
              >
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className={cn('text-xl font-bold tabular-nums', stat.color)}>
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Alerts panel */}
      {(criticalAlerts.length > 0 || warningAlerts.length > 0) && (
        <div className="rounded-xl border border-border bg-card overflow-hidden mb-5">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <p className="text-sm font-semibold text-foreground">Stock Alerts</p>
              <span className="text-xs bg-red-500/10 text-red-600 ring-1 ring-red-500/20 px-1.5 py-0.5 rounded-full font-medium">
                {criticalAlerts.length + warningAlerts.length}
              </span>
            </div>
          </div>
          <div className="divide-y divide-border">
            {criticalAlerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between px-4 py-3 group hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-7 w-7 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                    <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                  </div>
                  <p className="text-sm text-foreground truncate">{alert.message}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 ring-1 ring-red-500/20">
                    Critical
                  </span>
                  <button
                    onClick={() => markAlertAsRead({ restaurantId: restaurantId!, alertId: alert.id })}
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {warningAlerts.slice(0, 3).map((alert) => (
              <div key={alert.id} className="flex items-center justify-between px-4 py-3 group hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  <p className="text-sm text-foreground truncate">{alert.message}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20">
                    Warning
                  </span>
                  <button
                    onClick={() => markAlertAsRead({ restaurantId: restaurantId!, alertId: alert.id })}
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {warningAlerts.length > 3 && (
              <div className="px-4 py-2.5 text-xs text-muted-foreground text-center bg-muted/20">
                +{warningAlerts.length - 3} more warnings
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main panel */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 py-3.5 border-b border-border">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search items…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-sm w-full"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 shrink-0">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-9 text-sm w-[160px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categoriesData?.categories?.map((c: string) => (
                  <SelectItem key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="h-9 text-sm w-[130px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
              </SelectContent>
            </Select>

            <Button
              size="sm"
              className="h-9 gap-1.5 text-sm"
              onClick={() => { setAddForm({ ...EMPTY_ADD_FORM }); setShowAddItem(true); }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Item
            </Button>
          </div>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1.5fr_40px] gap-4 px-4 py-2.5 border-b border-border bg-muted/30">
          {['Item', 'Category', 'Stock', 'Unit', 'Status / Cost', ''].map((h) => (
            <span
              key={h}
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            >
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        <div className="divide-y divide-border">
          {itemsLoading ? (
            Array.from({ length: 8 }).map((_, i) => <ItemRowSkeleton key={i} />)
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                {itemsError ? 'Error loading items' : searchQuery ? 'No items match your search' : 'No inventory items yet'}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                {!itemsError && !searchQuery && 'Add your first item to start tracking stock'}
              </p>
              {!itemsError && !searchQuery && (
                <Button
                  size="sm"
                  className="mt-4 gap-1.5"
                  onClick={() => { setAddForm({ ...EMPTY_ADD_FORM }); setShowAddItem(true); }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add First Item
                </Button>
              )}
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1.5fr_40px] gap-4 px-4 py-3.5 items-center hover:bg-muted/30 transition-colors group"
              >
                {/* Name */}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{item.description}</p>
                  )}
                </div>

                {/* Category */}
                <span className="inline-flex items-center text-xs font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full capitalize w-fit">
                  {item.category}
                </span>

                {/* Stock */}
                <div>
                  <p className="text-sm font-semibold text-foreground tabular-nums">
                    {item.stockLevels.currentStock}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    min {item.stockLevels.minimumStock}
                  </p>
                </div>

                {/* Unit */}
                <span className="text-sm text-muted-foreground">{item.unit}</span>

                {/* Status + Cost */}
                <div>
                  <StockBadge item={item} />
                  <p className="text-xs text-muted-foreground mt-1 tabular-nums">
                    {formatCurrency(item.pricing.costPerUnit)}/unit
                  </p>
                </div>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedItemData(item);
                        setShowViewItem(true);
                      }}
                    >
                      <Eye className="h-3.5 w-3.5 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedItemData(item);
                        setStockQty('');
                        setShowStockUpdate(true);
                      }}
                    >
                      <ShoppingCart className="h-3.5 w-3.5 mr-2" />
                      Update Stock
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => openEdit(item)}>
                      <Edit className="h-3.5 w-3.5 mr-2" />
                      Edit Item
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {!itemsLoading && filteredItems.length > 0 && (
          <div className="px-4 py-2.5 border-t border-border bg-muted/20">
            <p className="text-xs text-muted-foreground">
              Showing {filteredItems.length} of {items?.length ?? 0} items
            </p>
          </div>
        )}
      </div>

      {/* ─── Dialogs ─────────────────────────────────── */}

      {/* Add Item */}
      <ItemFormDialog
        open={showAddItem}
        onOpenChange={(v: boolean) => { setShowAddItem(v); if (!v) setAddForm({ ...EMPTY_ADD_FORM }); }}
        title="Add Inventory Item"
        description="Create a new item to track in your inventory"
        form={addForm}
        onChange={(patch: any) => setAddForm((f) => ({ ...f, ...patch }))}
        onSubmit={handleAddItem}
        isLoading={isCreating}
        submitLabel={isCreating ? 'Adding…' : 'Add Item'}
        categoriesData={categoriesData}
        unitsData={unitsData}
        suppliersData={suppliersData}
        showSmartSearch
        itemSuggestions={itemSuggestions}
        showSuggestions={showSuggestions}
        selectedSuggestionIndex={selectedSuggestionIndex}
        onNameChange={handleNameChange}
        onKeyDown={handleKeyDown}
        onSelectSuggestion={selectSuggestion}
      />

      {/* Edit Item */}
      <ItemFormDialog
        open={showEditItem}
        onOpenChange={(v: boolean) => setShowEditItem(v)}
        title={`Edit "${selectedItemData?.name}"`}
        description="Update item details and stock thresholds"
        form={editForm}
        onChange={(patch: any) => setEditForm((f) => ({ ...f, ...patch }))}
        onSubmit={handleEditItem}
        isLoading={isUpdating}
        submitLabel={isUpdating ? 'Saving…' : 'Save Changes'}
        categoriesData={categoriesData}
        unitsData={unitsData}
        suppliersData={suppliersData}
        showSmartSearch={false}
      />

      {/* View Item */}
      <ViewItemDialog
        open={showViewItem}
        onOpenChange={setShowViewItem}
        item={selectedItemData}
        onEdit={() => { setShowViewItem(false); openEdit(selectedItemData); }}
      />

      {/* Stock Update */}
      <StockUpdateDialog
        open={showStockUpdate}
        onOpenChange={(v: boolean) => { setShowStockUpdate(v); if (!v) setStockQty(''); }}
        itemName={selectedItemData?.name}
        quantity={stockQty}
        onQuantityChange={setStockQty}
        type={stockType}
        onTypeChange={setStockType}
        onSubmit={handleStockUpdate}
      />
    </div>
  );
}