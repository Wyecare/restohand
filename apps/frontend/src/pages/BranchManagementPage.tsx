import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
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
  Plus,
  Building2,
  MapPin,
  Phone,
  Mail,
  Settings,
  Edit,
  Trash2,
  Star,
  Clock,
  Truck,
  Users,
} from 'lucide-react';
import {
  useGetBranchesQuery,
  useGetBranchCountQuery,
  useCreateBranchMutation,
  useUpdateBranchMutation,
  useDeleteBranchMutation,
  type Branch,
  type CreateBranchPayload,
  type UpdateBranchPayload,
} from '@/store/api/branchesApi';

const BranchManagementPage: React.FC = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);
  const { toast } = useToast();

  const {
    data: branches = [],
    isLoading: branchesLoading,
    error: branchesError,
  } = useGetBranchesQuery();

  const {
    data: branchCount,
    isLoading: countLoading,
  } = useGetBranchCountQuery();

  const [createBranch, { isLoading: isCreating }] = useCreateBranchMutation();
  const [updateBranch, { isLoading: isUpdating }] = useUpdateBranchMutation();
  const [deleteBranch, { isLoading: isDeleting }] = useDeleteBranchMutation();

  const [formData, setFormData] = useState<Partial<CreateBranchPayload>>({
    name: '',
    slug: '',
    description: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'IN',
    },
    contactPhone: '',
    contactEmail: '',
    managerName: '',
    managerPhone: '',
    isActive: true,
    settings: {
      orderNumberPrefix: 'ORD',
      enableTakeout: true,
      enableDineIn: true,
      enableDelivery: false,
      deliveryRadius: 0,
      deliveryFee: 0,
      minimumOrderValue: 0,
      operatingDays: [0, 1, 2, 3, 4, 5, 6],
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      address: {
        line1: '',
        line2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'IN',
      },
      contactPhone: '',
      contactEmail: '',
      managerName: '',
      managerPhone: '',
      isActive: true,
      settings: {
        orderNumberPrefix: 'ORD',
        enableTakeout: true,
        enableDineIn: true,
        enableDelivery: false,
        deliveryRadius: 0,
        deliveryFee: 0,
        minimumOrderValue: 0,
        operatingDays: [0, 1, 2, 3, 4, 5, 6],
      },
    });
  };

  const handleCreateBranch = async () => {
    if (!formData.name || !formData.slug || !formData.address?.line1) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createBranch(formData as CreateBranchPayload).unwrap();
      toast({
        title: 'Success',
        description: 'Branch created successfully',
      });
      setShowCreateDialog(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.data?.message || 'Failed to create branch',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateBranch = async () => {
    if (!editingBranch) return;

    try {
      await updateBranch({
        id: editingBranch._id,
        payload: formData as UpdateBranchPayload,
      }).unwrap();
      toast({
        title: 'Success',
        description: 'Branch updated successfully',
      });
      setEditingBranch(null);
      resetForm();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.data?.message || 'Failed to update branch',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteBranch = async () => {
    if (!deletingBranch) return;

    try {
      await deleteBranch(deletingBranch._id).unwrap();
      toast({
        title: 'Success',
        description: 'Branch deleted successfully',
      });
      setDeletingBranch(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.data?.message || 'Failed to delete branch',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      slug: branch.slug,
      description: branch.description || '',
      address: branch.address,
      contactPhone: branch.contactPhone || '',
      contactEmail: branch.contactEmail || '',
      managerName: branch.managerName || '',
      managerPhone: branch.managerPhone || '',
      isActive: branch.isActive,
      settings: branch.settings,
    });
  };

  if (branchesLoading || countLoading) {
    return <div className="p-6">Loading branch data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Branch Management</h1>
          <p className="text-muted-foreground">
            Manage your restaurant branches and their settings
          </p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Branch
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Branch</DialogTitle>
              <DialogDescription>
                Add a new branch location for your restaurant
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Branch Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Main Branch"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="main-branch"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Branch description"
                />
              </div>

              {/* Address */}
              <div className="space-y-4">
                <h4 className="font-medium">Address Information</h4>
                <div className="grid grid-cols-1 gap-4">
                  <Input
                    value={formData.address?.line1 || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address!, line1: e.target.value },
                      })
                    }
                    placeholder="Address Line 1 *"
                  />
                  <Input
                    value={formData.address?.line2 || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address!, line2: e.target.value },
                      })
                    }
                    placeholder="Address Line 2"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      value={formData.address?.city || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: { ...formData.address!, city: e.target.value },
                        })
                      }
                      placeholder="City *"
                    />
                    <Input
                      value={formData.address?.state || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: { ...formData.address!, state: e.target.value },
                        })
                      }
                      placeholder="State *"
                    />
                  </div>
                  <Input
                    value={formData.address?.postalCode || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address!, postalCode: e.target.value },
                      })
                    }
                    placeholder="Postal Code *"
                  />
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-4">
                <h4 className="font-medium">Contact Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="Phone Number"
                  />
                  <Input
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="Email Address"
                  />
                </div>
              </div>

              {/* Settings */}
              <div className="space-y-4">
                <h4 className="font-medium">Branch Settings</h4>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isActive: checked })
                    }
                  />
                  <Label htmlFor="active">Branch Active</Label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateBranch} disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Branch'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Branches</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{branchCount?.count || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Branches</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {branches.filter(b => b.isActive).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Enabled</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {branches.filter(b => b.settings.enableDelivery).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Main Branch</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {branches.find(b => b.isMainBranch)?.name.slice(0, 8) + '...' || 'None'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Branches Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {branches.map((branch) => (
          <Card key={branch._id} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {branch.name}
                  {branch.isMainBranch && (
                    <Badge variant="secondary">
                      <Star className="h-3 w-3 mr-1" />
                      Main
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(branch)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {!branch.isMainBranch && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingBranch(branch)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              {branch.description && (
                <CardDescription>{branch.description}</CardDescription>
              )}
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                {/* Address */}
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div className="text-sm">
                    <div>{branch.address.line1}</div>
                    {branch.address.line2 && <div>{branch.address.line2}</div>}
                    <div className="text-muted-foreground">
                      {branch.address.city}, {branch.address.state} {branch.address.postalCode}
                    </div>
                  </div>
                </div>

                {/* Contact */}
                {branch.contactPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{branch.contactPhone}</span>
                  </div>
                )}

                {branch.contactEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{branch.contactEmail}</span>
                  </div>
                )}

                {/* Status Badges */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge variant={branch.isActive ? 'default' : 'secondary'}>
                    {branch.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  {branch.settings.enableDelivery && (
                    <Badge variant="outline">
                      <Truck className="h-3 w-3 mr-1" />
                      Delivery
                    </Badge>
                  )}
                  {branch.settings.enableTakeout && (
                    <Badge variant="outline">
                      Takeout
                    </Badge>
                  )}
                  {branch.settings.enableDineIn && (
                    <Badge variant="outline">
                      <Users className="h-3 w-3 mr-1" />
                      Dine-in
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingBranch} onOpenChange={(open) => !open && setEditingBranch(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Branch</DialogTitle>
            <DialogDescription>
              Update branch information and settings
            </DialogDescription>
          </DialogHeader>

          {/* Same form fields as create dialog */}
          <div className="grid gap-4 py-4">
            {/* Similar form structure as create, but with update button */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Branch Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-slug">URL Slug *</Label>
                <Input
                  id="edit-slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-active"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
              <Label htmlFor="edit-active">Branch Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBranch(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateBranch} disabled={isUpdating}>
              {isUpdating ? 'Updating...' : 'Update Branch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingBranch} onOpenChange={() => setDeletingBranch(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the branch "{deletingBranch?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBranch} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BranchManagementPage;