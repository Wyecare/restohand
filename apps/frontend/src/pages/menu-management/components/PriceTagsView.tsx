import { useState } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Tag,
  Search,
  Power,
  Calendar,
  Clock,
  Users,
  Zap,
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
import { PriceTagFormDialog } from './PriceTagFormDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import {
  useListMenuPriceTagsByBranchQuery,
  useActivateMenuPriceTagMutation,
  useGetActivePriceTagQuery,
} from '@/store/api/menuPriceTagsApi';
import { useJwtAuth } from '@/contexts/JwtAuthProvider';
import { useBranchContext } from '@/contexts/BranchContext';
import { skipToken } from '@reduxjs/toolkit/query/react';
import type { MenuPriceTag } from '@/store/api/menuPriceTagsApi';
import { cn } from '@/lib/utils';

export function PriceTagsView() {
  const { user } = useJwtAuth();
  const { currentBranch } = useBranchContext();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [isPriceTagDialogOpen, setIsPriceTagDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPriceTag, setSelectedPriceTag] = useState<MenuPriceTag | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'priceTag';
    data: MenuPriceTag;
  } | null>(null);

  const restaurantId = user?.restaurantId;
  const branchId = currentBranch?._id;

  const queryParams =
    restaurantId && branchId
      ? { restaurantId, branchId, search: search || undefined }
      : skipToken;

  const {
    data: priceTagsData,
    isLoading,
    error,
  } = useListMenuPriceTagsByBranchQuery(queryParams);
  const { data: activePriceTagData } = useGetActivePriceTagQuery(
    restaurantId && branchId ? { restaurantId, branchId } : skipToken
  );

  const [activatePriceTag] = useActivateMenuPriceTagMutation();

  const priceTags = priceTagsData?.data || [];
  const activePriceTag =
    activePriceTagData && 'id' in activePriceTagData
      ? activePriceTagData
      : null;

  const handleAddPriceTag = () => {
    setSelectedPriceTag(null);
    setIsPriceTagDialogOpen(true);
  };

  const handleEditPriceTag = (priceTag: MenuPriceTag) => {
    setSelectedPriceTag(priceTag);
    setIsPriceTagDialogOpen(true);
  };

  const handleDeletePriceTag = (priceTag: MenuPriceTag) => {
    setDeleteTarget({ type: 'priceTag', data: priceTag });
    setIsDeleteDialogOpen(true);
  };

  const handleToggleActive = async (priceTag: MenuPriceTag) => {
    if (!restaurantId || !branchId) return;

    try {
      await activatePriceTag({
        restaurantId,
        branchId,
        priceTagId: priceTag.id,
        body: {
          isActive: !priceTag.isActive,
          force: false,
        },
      }).unwrap();

      toast({
        title: 'Success',
        description: `Price tag ${
          priceTag.isActive ? 'deactivated' : 'activated'
        } successfully`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error?.data?.message || 'Failed to toggle price tag',
      });
    }
  };

  const formatRuleDescription = (priceTag: MenuPriceTag) => {
    if (!priceTag.applicabilityRule) return 'Always active';

    const rule = priceTag.applicabilityRule;
    switch (rule.type) {
      case 'always':
        return 'Always active';
      case 'date_range':
        return `${new Date(rule.startDate!).toLocaleDateString()} - ${new Date(
          rule.endDate!
        ).toLocaleDateString()}`;
      case 'day_of_week':
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return rule.daysOfWeek!.map((day) => days[day]).join(', ');
      case 'time_range':
        return `${rule.startTime} - ${rule.endTime}`;
      default:
        return 'Custom rule';
    }
  };

  const getRuleIcon = (type: string) => {
    switch (type) {
      case 'date_range':
        return <Calendar className="h-4 w-4" />;
      case 'time_range':
        return <Clock className="h-4 w-4" />;
      case 'day_of_week':
        return <Users className="h-4 w-4" />;
      default:
        return <Tag className="h-4 w-4" />;
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center p-12">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <p className="font-semibold">Failed to load price tags</p>
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
    <div className="space-y-3 p-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Price Tags</h2>
          <p className="text-muted-foreground mt-1">
            Dynamic pricing for special offers, happy hours, and promotions
          </p>
        </div>
        <Button
          onClick={handleAddPriceTag}
          size="lg"
          className="w-full sm:w-auto gap-2"
        >
          <Plus className="h-5 w-5" />
          Add Price Tag
        </Button>
      </div>

      {/* Active Price Tag Alert */}
      {activePriceTag && (
        <Card className="border-2 border-green-500 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-500 shrink-0">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-green-900 text-lg">
                  Currently Active: {activePriceTag.name}
                </div>
                <div className="text-sm text-green-700">
                  {activePriceTag.itemPrices.length} items with special pricing
                </div>
              </div>
              <Badge className="bg-green-600 text-white text-sm shrink-0">
                ACTIVE NOW
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
        <Input
          placeholder="Search price tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-12 text-base"
        />
      </div>

      {/* Stats Cards */}
      {priceTags.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{priceTags.length}</div>
              <p className="text-sm text-muted-foreground">Total Price Tags</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {priceTags.filter((pt) => pt.isActive).length}
              </div>
              <p className="text-sm text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {priceTags.filter((pt) => pt.autoActivate).length}
              </div>
              <p className="text-sm text-muted-foreground">Auto-Activate</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Price Tags Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-56 bg-muted rounded-lg"></div>
            </div>
          ))}
        </div>
      ) : priceTags.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Tag className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No price tags found</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-sm">
              {search
                ? 'No price tags match your search criteria.'
                : 'Start by creating your first price tag for special offers or happy hours.'}
            </p>
            <Button onClick={handleAddPriceTag} size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              Add First Price Tag
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {priceTags.map((priceTag) => (
            <PriceTagCard
              key={priceTag.id}
              priceTag={priceTag}
              onEdit={handleEditPriceTag}
              onDelete={handleDeletePriceTag}
              onToggleActive={handleToggleActive}
              formatRuleDescription={formatRuleDescription}
              getRuleIcon={getRuleIcon}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <PriceTagFormDialog
        open={isPriceTagDialogOpen}
        onOpenChange={setIsPriceTagDialogOpen}
        priceTag={selectedPriceTag}
      />

      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        target={deleteTarget}
      />
    </div>
  );
}

// Price Tag Card Component
function PriceTagCard({
  priceTag,
  onEdit,
  onDelete,
  onToggleActive,
  formatRuleDescription,
  getRuleIcon,
}: {
  priceTag: MenuPriceTag;
  onEdit: (priceTag: MenuPriceTag) => void;
  onDelete: (priceTag: MenuPriceTag) => void;
  onToggleActive: (priceTag: MenuPriceTag) => void;
  formatRuleDescription: (priceTag: MenuPriceTag) => string;
  getRuleIcon: (type: string) => JSX.Element;
}) {
  return (
    <Card
      className={cn(
        'hover:shadow-lg transition-all border-2',
        priceTag.isActive ? 'border-green-500 bg-green-50/50' : 'border-border'
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              className="w-10 h-10 rounded-full shrink-0 border-2 border-white shadow-sm"
              style={{ backgroundColor: priceTag.color }}
            />
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg line-clamp-1 flex items-center gap-2">
                {priceTag.name}
                {priceTag.isDefault && (
                  <Badge variant="outline" className="text-xs">
                    DEFAULT
                  </Badge>
                )}
              </CardTitle>
              {priceTag.description && (
                <CardDescription className="line-clamp-2 mt-1">
                  {priceTag.description}
                </CardDescription>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(priceTag)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            {!priceTag.isDefault && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => onDelete(priceTag)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mt-3">
          {priceTag.isActive && (
            <Badge className="bg-green-600 text-white">Active</Badge>
          )}
          {priceTag.autoActivate && (
            <Badge variant="secondary">
              <Zap className="h-3 w-3 mr-1" />
              Auto-Activate
            </Badge>
          )}
          <Badge variant="outline">Priority {priceTag.priority}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Rule Info */}
        <div className="bg-muted/50 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            {getRuleIcon(priceTag.applicabilityRule?.type || 'always')}
            <span className="text-sm font-medium">Pricing Rule</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatRuleDescription(priceTag)}
          </p>
        </div>

        {/* Items Count */}
        <div className="flex items-center justify-between text-sm bg-muted/30 p-3 rounded-lg">
          <div>
            <span className="text-muted-foreground">Total Items:</span>
            <span className="font-semibold ml-1">
              {priceTag.itemPrices.length}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Active:</span>
            <span className="font-semibold ml-1 text-green-600">
              {priceTag.itemPrices.filter((item) => item.isActive).length}
            </span>
          </div>
        </div>

        {/* Active Toggle */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm font-medium">Active Status</span>
          <Switch
            checked={priceTag.isActive}
            onCheckedChange={() => onToggleActive(priceTag)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
