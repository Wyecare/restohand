import { useState } from 'react';
import { Plus, Edit, Trash2, Receipt, Settings2, Info } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useBranchContext } from '@/contexts/BranchContext';
import {
  BranchCharge,
  useGetBranchChargesQuery,
  useAddBranchChargeMutation,
  useUpdateBranchChargeMutation,
  useDeleteBranchChargeMutation,
} from '@/store/api/branchesApi';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from '@/hooks/use-toast';

const chargeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be less than 50 characters'),
  description: z.string().max(200, 'Description must be less than 200 characters').optional(),
  type: z.enum(['percentage', 'fixed']),
  value: z.number().min(0, 'Value must be positive'),
  applicableFor: z.enum(['dine_in', 'takeout', 'delivery', 'all']),
  isActive: z.boolean(),
  includedInGst: z.boolean(),
  sortOrder: z.number().min(0),
});

type ChargeFormData = z.infer<typeof chargeSchema>;

interface ChargeFormDialogProps {
  charge?: BranchCharge;
  onSave: (charge: BranchCharge) => void;
  onCancel: () => void;
  isOpen: boolean;
}

function ChargeFormDialog({ charge, onSave, onCancel, isOpen }: ChargeFormDialogProps) {
  const form = useForm<ChargeFormData>({
    resolver: zodResolver(chargeSchema),
    defaultValues: {
      name: charge?.name || '',
      description: charge?.description || '',
      type: charge?.type || 'percentage',
      value: charge?.value || 0,
      applicableFor: charge?.applicableFor || 'all',
      isActive: charge?.isActive ?? true,
      includedInGst: charge?.includedInGst ?? true,
      sortOrder: charge?.sortOrder || 0,
    },
  });

  const handleSubmit = (data: ChargeFormData) => {
    onSave(data as BranchCharge);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{charge ? 'Edit Charge' : 'Add New Charge'}</DialogTitle>
          <DialogDescription>
            Configure charges and fees for this branch
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Charge Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Service Charge" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of this charge"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {form.watch('type') === 'percentage' ? 'Percentage (%)' : 'Amount (₹)'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="applicableFor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Applicable For</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">All Order Types</SelectItem>
                      <SelectItem value="dine_in">Dine In Only</SelectItem>
                      <SelectItem value="takeout">Takeout Only</SelectItem>
                      <SelectItem value="delivery">Delivery Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between">
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Enable this charge for orders
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center justify-between">
              <FormField
                control={form.control}
                name="includedInGst"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Include in GST</FormLabel>
                      <FormDescription>
                        Include this charge in GST calculation
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit">
                {charge ? 'Update' : 'Add'} Charge
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function ChargesSettingsPage() {
  const { currentBranch, isLoading: branchLoading } = useBranchContext();
  const [showDialog, setShowDialog] = useState(false);
  const [editingCharge, setEditingCharge] = useState<BranchCharge | undefined>();

  // RTK Query hooks for charges CRUD
  const {
    data: charges = [],
    isLoading: chargesLoading,
    refetch,
  } = useGetBranchChargesQuery(currentBranch?._id || '', {
    skip: !currentBranch?._id,
  });

  const [addCharge, { isLoading: isAdding }] = useAddBranchChargeMutation();
  const [updateCharge, { isLoading: isUpdating }] = useUpdateBranchChargeMutation();
  const [deleteCharge, { isLoading: isDeleting }] = useDeleteBranchChargeMutation();

  const isLoading = branchLoading || chargesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!currentBranch) {
    return (
      <div className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No Branch Selected</AlertTitle>
          <AlertDescription>
            Please select a branch to manage charges and fees.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleSaveCharge = async (chargeData: BranchCharge) => {
    if (!currentBranch) return;

    try {
      if (editingCharge) {
        // Update existing charge
        const chargeIndex = charges.findIndex(c => c.sortOrder === editingCharge.sortOrder);
        await updateCharge({
          branchId: currentBranch._id,
          chargeIndex,
          charge: chargeData,
        }).unwrap();

        toast({
          title: 'Charge Updated',
          description: 'The charge has been updated successfully.',
        });
      } else {
        // Add new charge
        await addCharge({
          branchId: currentBranch._id,
          charge: chargeData,
        }).unwrap();

        toast({
          title: 'Charge Added',
          description: 'The new charge has been added successfully.',
        });
      }

      setShowDialog(false);
      setEditingCharge(undefined);
    } catch (error) {
      console.error('Error saving charge:', error);
      toast({
        title: 'Error',
        description: 'Failed to save charge. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleEditCharge = (charge: BranchCharge) => {
    setEditingCharge(charge);
    setShowDialog(true);
  };

  const handleDeleteCharge = async (charge: BranchCharge) => {
    if (!currentBranch) return;

    try {
      const chargeIndex = charges.findIndex(c => c.sortOrder === charge.sortOrder);
      await deleteCharge({
        branchId: currentBranch._id,
        chargeIndex,
      }).unwrap();

      toast({
        title: 'Charge Deleted',
        description: 'The charge has been removed successfully.',
      });
    } catch (error) {
      console.error('Error deleting charge:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete charge. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const formatChargeValue = (charge: BranchCharge) => {
    if (charge.type === 'percentage') {
      return `${charge.value}%`;
    } else {
      return `₹${charge.value.toFixed(2)}`;
    }
  };

  const getApplicableForLabel = (applicableFor: BranchCharge['applicableFor']) => {
    const labels = {
      all: 'All Types',
      dine_in: 'Dine In',
      takeout: 'Takeout',
      delivery: 'Delivery'
    };
    return labels[applicableFor];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Charges & Fees
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage charges and fees for {currentBranch.name}
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Charge
        </Button>
      </div>

      <Alert>
        <Receipt className="h-4 w-4" />
        <AlertTitle>Branch-Specific Configuration</AlertTitle>
        <AlertDescription>
          These charges apply only to {currentBranch.name}. Configure different charges for each branch as needed.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4">
        {charges.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <Settings2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No Charges Configured</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Add charges and fees that should be applied to orders for this branch.
              </p>
              <Button onClick={() => setShowDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Charge
              </Button>
            </CardContent>
          </Card>
        ) : (
          charges.map((charge, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{charge.name}</CardTitle>
                    {charge.description && (
                      <CardDescription>{charge.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={charge.isActive ? 'default' : 'secondary'}>
                      {charge.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditCharge(charge)}
                      disabled={isUpdating}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCharge(charge)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-muted-foreground">Amount</p>
                    <p className="text-lg font-semibold">{formatChargeValue(charge)}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Applies To</p>
                    <p>{getApplicableForLabel(charge.applicableFor)}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">GST Treatment</p>
                    <p>{charge.includedInGst ? 'Taxable' : 'Non-taxable'}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Order</p>
                    <p>{charge.sortOrder + 1}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <ChargeFormDialog
        charge={editingCharge}
        onSave={handleSaveCharge}
        onCancel={() => {
          setShowDialog(false);
          setEditingCharge(undefined);
        }}
        isOpen={showDialog}
      />
    </div>
  );
}