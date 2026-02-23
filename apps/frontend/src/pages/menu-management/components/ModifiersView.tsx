import { useState } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Settings2,
  Search,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { ModifierFormDialog } from './ModifierFormDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { useListMenuModifiersByBranchQuery } from '@/store/api/menuModifiersApi';
import { useJwtAuth } from '@/contexts/JwtAuthProvider';
import { useBranchContext } from '@/contexts/BranchContext';
import { skipToken } from '@reduxjs/toolkit/query/react';
import type { MenuModifier } from '@/store/api/menuModifiersApi';
import { cn } from '@/lib/utils';

export function ModifiersView() {
  const { user } = useJwtAuth();
  const { currentBranch } = useBranchContext();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [isModifierDialogOpen, setIsModifierDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedModifier, setSelectedModifier] = useState<MenuModifier | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'modifier';
    data: MenuModifier;
  } | null>(null);

  const restaurantId = user?.restaurantId;
  const branchId = currentBranch?._id;

  const queryParams =
    restaurantId && branchId
      ? { restaurantId, branchId, search: search || undefined }
      : skipToken;

  const {
    data: modifiersData,
    isLoading,
    error,
  } = useListMenuModifiersByBranchQuery(queryParams);
  const modifiers = modifiersData?.data || [];

  const handleAddModifier = () => {
    setSelectedModifier(null);
    setIsModifierDialogOpen(true);
  };

  const handleEditModifier = (modifier: MenuModifier) => {
    setSelectedModifier(modifier);
    setIsModifierDialogOpen(true);
  };

  const handleDeleteModifier = (modifier: MenuModifier) => {
    setDeleteTarget({ type: 'modifier', data: modifier });
    setIsDeleteDialogOpen(true);
  };

  const formatPrice = (amount: number, currency: string = 'INR') => {
    if (amount === 0) return 'Free';
    const symbol = currency === 'INR' ? '₹' : '$';
    return amount > 0 ? `+${symbol}${amount}` : `${symbol}${amount}`;
  };

  if (error) {
    return (
      <div className="flex items-center justify-center p-12">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <p className="font-semibold">Failed to load modifiers</p>
              <p className="text-sm text-muted-foreground mt-2">
                Please try again later
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Menu Modifiers</h2>
          <p className="text-muted-foreground mt-1">
            Manage customization options like toppings, sizes, and add-ons
          </p>
        </div>
        <Button
          onClick={handleAddModifier}
          size="lg"
          className="w-full sm:w-auto gap-2"
        >
          <Plus className="h-5 w-5" />
          Add Modifier
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
        <Input
          placeholder="Search modifiers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-12 text-base"
        />
      </div>

      {/* Stats Card */}
      {modifiers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{modifiers.length}</div>
              <p className="text-sm text-muted-foreground">Total Modifiers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {modifiers.filter((m) => m.isActive).length}
              </div>
              <p className="text-sm text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {modifiers.filter((m) => m.isRequired).length}
              </div>
              <p className="text-sm text-muted-foreground">Required</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modifiers Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-48 bg-muted rounded-lg"></div>
            </div>
          ))}
        </div>
      ) : modifiers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Settings2 className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No modifiers found</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-sm">
              {search
                ? 'No modifiers match your search criteria.'
                : 'Start by creating your first modifier like toppings, sizes, or add-ons.'}
            </p>
            <Button onClick={handleAddModifier} size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              Add First Modifier
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modifiers.map((modifier) => (
            <ModifierCard
              key={modifier.id}
              modifier={modifier}
              onEdit={handleEditModifier}
              onDelete={handleDeleteModifier}
              formatPrice={formatPrice}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <ModifierFormDialog
        open={isModifierDialogOpen}
        onOpenChange={setIsModifierDialogOpen}
        modifier={selectedModifier}
      />

      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        target={deleteTarget}
      />
    </div>
  );
}

// Modifier Card Component
function ModifierCard({
  modifier,
  onEdit,
  onDelete,
  formatPrice,
}: {
  modifier: MenuModifier;
  onEdit: (modifier: MenuModifier) => void;
  onDelete: (modifier: MenuModifier) => void;
  formatPrice: (amount: number, currency?: string) => string;
}) {
  return (
    <Card
      className={cn(
        'hover:shadow-lg transition-all border-2',
        modifier.isActive ? 'border-border' : 'border-muted opacity-60'
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg line-clamp-1">
              {modifier.name}
            </CardTitle>
            {modifier.description && (
              <CardDescription className="line-clamp-2 mt-1">
                {modifier.description}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(modifier)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onDelete(modifier)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mt-3">
          <Badge
            variant={
              modifier.selectionType === 'single' ? 'default' : 'secondary'
            }
          >
            {modifier.selectionType === 'single'
              ? 'Single Choice'
              : 'Multiple Choice'}
          </Badge>
          {modifier.isRequired && <Badge variant="destructive">Required</Badge>}
          {modifier.freeOptions > 0 && (
            <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
              {modifier.freeOptions} Free
            </Badge>
          )}
          {!modifier.unique && (
            <Badge variant="outline" className="border-blue-200 text-blue-700">
              Quantity
            </Badge>
          )}
          {!modifier.isActive && (
            <Badge variant="outline" className="border-muted-foreground/50">
              Inactive
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Selection Rules */}
        <div className="flex items-center justify-between text-sm bg-muted/50 p-3 rounded-lg">
          <div>
            <span className="text-muted-foreground">Min:</span>
            <span className="font-semibold ml-1">{modifier.minSelections}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Max:</span>
            <span className="font-semibold ml-1">{modifier.maxSelections}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Options:</span>
            <span className="font-semibold ml-1">
              {modifier.options.length}
            </span>
          </div>
        </div>

        {/* Options Preview */}
        <div>
          <div className="text-sm font-medium mb-2 text-muted-foreground">
            Available Options:
          </div>
          <div className="space-y-1.5">
            {modifier.options.slice(0, 4).map((option) => (
              <div
                key={option.id}
                className={`flex items-center justify-between text-sm px-3 py-2 rounded ${
                  !option.isAvailable || !option.inStock
                    ? 'bg-muted/50 opacity-60'
                    : 'bg-muted/30'
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={`font-medium truncate ${
                    !option.isAvailable || !option.inStock
                      ? 'text-muted-foreground line-through'
                      : ''
                  }`}>
                    {option.name}
                  </span>
                  {!option.inStock && (
                    <span className="text-xs bg-red-100 text-red-700 px-1 py-0.5 rounded">
                      Out of Stock
                    </span>
                  )}
                </div>
                <span className="text-muted-foreground shrink-0 ml-2">
                  {formatPrice(option.priceAdjustment, option.currency)}
                </span>
              </div>
            ))}
            {modifier.options.length > 4 && (
              <div className="text-sm text-muted-foreground text-center py-2">
                +{modifier.options.length - 4} more options
              </div>
            )}
          </div>
        </div>

        {/* Status Toggle */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm font-medium">Active</span>
          <Switch checked={modifier.isActive} readOnly />
        </div>
      </CardContent>
    </Card>
  );
}
