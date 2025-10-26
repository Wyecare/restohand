import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit2, Trash2, Star } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  useGetGstRatesQuery,
  useCreateGstRateMutation,
  useUpdateGstRateMutation,
  useDeleteGstRateMutation,
  type GstRate,
  type CreateGstRateRequest,
} from '@/store/api/gstApi';
import {
  useGetRestaurantQuery,
  useUpdateRestaurantMutation,
} from '@/store/api/restaurantsApi';

interface GstRateFormData {
  categoryName: string;
  description: string;
  cgstRate: string;
  sgstRate: string;
  igstRate: string;
  totalGstRate: string;
  isActive: boolean;
  isDefault: boolean;
  effectiveFrom: string;
  effectiveTo: string;
  notes: string;
}

const initialFormData: GstRateFormData = {
  categoryName: 'Standard GST',
  description: '',
  cgstRate: '2.5',
  sgstRate: '2.5',
  igstRate: '5',
  totalGstRate: '5',
  isActive: true,
  isDefault: true,
  effectiveFrom: new Date().toISOString().split('T')[0],
  effectiveTo: '',
  notes: '',
};

const GstRateForm = ({
  data,
  onSubmit,
  onClose,
  isLoading,
}: {
  data?: GstRate;
  onSubmit: (data: CreateGstRateRequest) => void;
  onClose: () => void;
  isLoading: boolean;
}) => {
  const [formData, setFormData] = useState<GstRateFormData>(() => {
    if (data) {
      return {
        categoryName: data.categoryName ?? 'Standard GST',
        description: data.description || '',
        cgstRate: data.cgstRate.toString(),
        sgstRate: data.sgstRate.toString(),
        igstRate: data.igstRate.toString(),
        totalGstRate: data.totalGstRate.toString(),
        isActive: data.isActive,
        isDefault: data.isDefault,
        effectiveFrom: data.effectiveFrom.split('T')[0],
        effectiveTo: data.effectiveTo?.split('T')[0] || '',
        notes: data.notes || '',
      };
    }
    return initialFormData;
  });
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload: CreateGstRateRequest = {
      categoryName: formData.categoryName.trim() || undefined,
      description: formData.description || undefined,
      cgstRate: parseFloat(formData.cgstRate),
      sgstRate: parseFloat(formData.sgstRate),
      igstRate: parseFloat(formData.igstRate),
      totalGstRate: parseFloat(formData.totalGstRate),
      isActive: formData.isActive,
      isDefault: formData.isDefault,
      effectiveFrom: formData.effectiveFrom,
      effectiveTo: formData.effectiveTo || undefined,
      notes: formData.notes || undefined,
    };

    const cgst = parseFloat(formData.cgstRate);
    const sgst = parseFloat(formData.sgstRate);
    const igst = parseFloat(formData.igstRate);
    const total = parseFloat(formData.totalGstRate);

    const intraDiff = Math.abs(cgst + sgst - total);
    const interDiff = Math.abs(igst - total);

    if (Number.isFinite(total) && Number.isFinite(cgst) && Number.isFinite(sgst) && Number.isFinite(igst)) {
      if (intraDiff > 0.05 && interDiff > 0.05) {
        setFormError('Total GST should match CGST + SGST for intra-state or equal IGST for inter-state scenarios.');
        return;
      }
    }

    setFormError(null);
    onSubmit(payload);
  };

  const updateField = (field: keyof GstRateFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formError && (
        <Alert variant="destructive">
          <AlertTitle>Check GST percentages</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="categoryName">Rate label (optional)</Label>
          <Input
            id="categoryName"
            value={formData.categoryName}
            onChange={(e) => updateField('categoryName', e.target.value)}
            placeholder="e.g., Standard GST"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Helps you recognise the rate later. Leave blank to use "Standard GST".
          </p>
        </div>
        <div>
          <Label htmlFor="totalGstRate">Total GST Rate (%) *</Label>
          <Input
            id="totalGstRate"
            type="number"
            step="0.01"
            value={formData.totalGstRate}
            onChange={(e) => updateField('totalGstRate', e.target.value)}
            placeholder="e.g., 5.00"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="Optional description"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="cgstRate">CGST Rate (%) *</Label>
          <Input
            id="cgstRate"
            type="number"
            step="0.01"
            value={formData.cgstRate}
            onChange={(e) => updateField('cgstRate', e.target.value)}
            placeholder="e.g., 2.5"
            required
          />
        </div>
        <div>
          <Label htmlFor="sgstRate">SGST Rate (%) *</Label>
          <Input
            id="sgstRate"
            type="number"
            step="0.01"
            value={formData.sgstRate}
            onChange={(e) => updateField('sgstRate', e.target.value)}
            placeholder="e.g., 2.5"
            required
          />
        </div>
        <div>
          <Label htmlFor="igstRate">IGST Rate (%) *</Label>
          <Input
            id="igstRate"
            type="number"
            step="0.01"
            value={formData.igstRate}
            onChange={(e) => updateField('igstRate', e.target.value)}
            placeholder="e.g., 5.0"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="effectiveFrom">Effective From *</Label>
          <Input
            id="effectiveFrom"
            type="date"
            value={formData.effectiveFrom}
            onChange={(e) => updateField('effectiveFrom', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="effectiveTo">Effective To</Label>
          <Input
            id="effectiveTo"
            type="date"
            value={formData.effectiveTo}
            onChange={(e) => updateField('effectiveTo', e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => updateField('notes', e.target.value)}
          placeholder="Additional notes about this GST rate"
        />
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked) => updateField('isActive', checked)}
          />
          <Label htmlFor="isActive">Active</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="isDefault"
            checked={formData.isDefault}
            onCheckedChange={(checked) => updateField('isDefault', checked)}
          />
          <Label htmlFor="isDefault">Default Rate</Label>
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <LoadingSpinner size="sm" /> : data ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
};

const GstSettingsPage = () => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<GstRate | undefined>();

  if (!restaurantId) {
    return <Navigate to="/onboarding" replace />;
  }

  const { data: restaurant } = useGetRestaurantQuery(restaurantId);
  const { data, isLoading, refetch } = useGetGstRatesQuery(restaurantId);
  const [createGstRate, { isLoading: isCreating }] = useCreateGstRateMutation();
  const [updateGstRate, { isLoading: isUpdating }] = useUpdateGstRateMutation();
  const [deleteGstRate, { isLoading: isDeleting }] = useDeleteGstRateMutation();
  const [updateRestaurantSettings, { isLoading: isUpdatingRestaurant }] =
    useUpdateRestaurantMutation();

  const defaultGstRate = data?.data.find(
    (rate) => rate.isDefault && rate.isActive
  );
  const hasDefaultGstRate = Boolean(defaultGstRate);

  const handleSubmit = async (formData: CreateGstRateRequest) => {
    try {
      if (editingRate) {
        await updateGstRate({
          restaurantId,
          id: editingRate.id,
          data: formData,
        }).unwrap();
        toast({ title: 'GST rate updated successfully' });
      } else {
        await createGstRate({
          restaurantId,
          data: formData,
        }).unwrap();
        toast({ title: 'GST rate created successfully' });
      }
      setIsFormOpen(false);
      setEditingRate(undefined);
      refetch();
    } catch (error) {
      toast({
        title: 'Failed to save GST rate',
        description: error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleToggleDefaultGst = async (checked: boolean) => {
    if (checked && !hasDefaultGstRate) {
      toast({
        title: 'Add a default GST rate first',
        description:
          'Set one of your GST rates as the default before applying it to every menu item.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateRestaurantSettings({
        id: restaurantId,
        body: { applyDefaultGstToMenuItems: checked },
      }).unwrap();
      toast({
        title: checked
          ? 'Default GST applied to all items'
          : 'Menu items can use individual GST settings',
      });
    } catch (error) {
      toast({
        title: 'Unable to update GST settings',
        description:
          error instanceof Error
            ? error.message
            : 'Unexpected error occurred while saving the preference',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this GST rate?')) return;

    try {
      await deleteGstRate({ restaurantId, id }).unwrap();
      toast({ title: 'GST rate deleted successfully' });
      refetch();
    } catch (error) {
      toast({
        title: 'Failed to delete GST rate',
        description: error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const openEditForm = (rate: GstRate) => {
    setEditingRate(rate);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingRate(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">GST Settings</h1>
          <p className="text-muted-foreground">
            Set your restaurant's GST once, and override it only when a dish needs a different slab.
          </p>
        </div>
      </div>
      <Alert>
        <AlertTitle>Recommended: 5% GST on dine-in food</AlertTitle>
        <AlertDescription>
          Most Indian restaurants charge 5% GST (2.5% CGST + 2.5% SGST) on cooked food. Leave
          alcohol and retail items out of GST or override them individually when needed.
        </AlertDescription>
      </Alert>
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add GST Rate
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingRate ? 'Edit GST Rate' : 'Create GST Rate'}
            </DialogTitle>
            <DialogDescription>
              Save the GST percentage you collect, then pick the default to apply across your menu.
            </DialogDescription>
          </DialogHeader>
          <GstRateForm
            data={editingRate}
            onSubmit={handleSubmit}
            onClose={closeForm}
            isLoading={isCreating || isUpdating}
          />
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Automatic GST on menu items</CardTitle>
          <CardDescription>
            Apply your default GST rate to every menu item unless you choose to override it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {restaurant?.applyDefaultGstToMenuItems
                  ? 'Every new and updated menu item will automatically use your default GST rate.'
                  : 'Leave this off if different dishes need their own GST rates.'}
              </p>
              {restaurant?.applyDefaultGstToMenuItems && defaultGstRate && (
                <p className="text-xs text-muted-foreground">
                  Default GST: {(defaultGstRate.categoryName || 'Standard GST')} · {defaultGstRate.totalGstRate}%
                </p>
              )}
              {restaurant?.applyDefaultGstToMenuItems && !defaultGstRate && (
                <Alert variant="destructive">
                  <AlertTitle>No default GST rate found</AlertTitle>
                  <AlertDescription>
                    Add a GST rate and mark it as default so menu items pick up the correct tax.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={restaurant?.applyDefaultGstToMenuItems ?? false}
                onCheckedChange={handleToggleDefaultGst}
                disabled={isUpdatingRestaurant || !restaurant}
              />
              <span className="text-sm font-medium">
                Use default GST for every item
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>GST Rates</CardTitle>
          <CardDescription>
            Current GST rates configured for your restaurant
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : data && data.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Total Rate</TableHead>
                  <TableHead>CGST</TableHead>
                  <TableHead>SGST</TableHead>
                  <TableHead>IGST</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Effective From</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{rate.categoryName || 'Standard GST'}</span>
                        {rate.isDefault && (
                          <Badge variant="secondary" className="ml-2">
                            <Star className="mr-1 h-3 w-3" />
                            Default
                          </Badge>
                        )}
                      </div>
                      {rate.description && (
                        <p className="text-sm text-muted-foreground">
                          {rate.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {rate.totalGstRate}%
                    </TableCell>
                    <TableCell>{rate.cgstRate}%</TableCell>
                    <TableCell>{rate.sgstRate}%</TableCell>
                    <TableCell>{rate.igstRate}%</TableCell>
                    <TableCell>
                      <Badge variant={rate.isActive ? 'default' : 'secondary'}>
                        {rate.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(rate.effectiveFrom).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditForm(rate)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(rate.id)}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No GST rates configured yet.</p>
              <p className="text-sm">
                Add your first GST rate to start managing taxes for your menu items.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GstSettingsPage;
