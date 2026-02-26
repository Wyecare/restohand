import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { skipToken } from '@reduxjs/toolkit/query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { useAppSelector } from '@/store/hooks';
import {
  selectActiveRestaurantId,
  selectAuthSession,
} from '@/store/slices/authSlice';
import {
  useGetSuppliersQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
} from '@/store/api/suppliersApi';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Star,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Users,
  TrendingUp,
  CheckCircle,
  Loader2,
} from 'lucide-react';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

export function SuppliersView() {
  const session = useAppSelector(selectAuthSession);
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<string | null>(null);

  const [supplierForm, setSupplierForm] = useState({
    name: '',
    supplierCode: '',
    contactPerson: '',
    phone: '',
    email: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    gstin: '',
    panNumber: '',
    creditDays: '30',
    paymentMethod: 'credit' as 'cash' | 'credit' | 'advance' | 'cod',
    categories: [] as string[],
    notes: '',
  });

  const [createSupplier, { isLoading: isCreating }] = useCreateSupplierMutation();
  const [updateSupplier, { isLoading: isUpdating }] = useUpdateSupplierMutation();
  const [deleteSupplier] = useDeleteSupplierMutation();

  const {
    data: suppliersResponse,
    isLoading: suppliersLoading,
    isError: suppliersError,
  } = useGetSuppliersQuery(
    restaurantId
      ? {
          restaurantId,
          search: searchQuery || undefined,
          category: categoryFilter || undefined,
          isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
        }
      : skipToken
  );

  const suppliers = suppliersResponse?.suppliers || [];

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      const matchesSearch =
        !searchQuery ||
        supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.contact.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.contact.email?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        !categoryFilter || supplier.categories.includes(categoryFilter);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && supplier.isActive) ||
        (statusFilter === 'inactive' && !supplier.isActive);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [suppliers, searchQuery, categoryFilter, statusFilter]);

  const resetForm = () => {
    setSupplierForm({
      name: '',
      supplierCode: '',
      contactPerson: '',
      phone: '',
      email: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India',
      gstin: '',
      panNumber: '',
      creditDays: '30',
      paymentMethod: 'credit',
      categories: [],
      notes: '',
    });
  };

  const handleSubmit = async () => {
    if (!restaurantId || !supplierForm.name) return;

    try {
      const payload = {
        restaurantId,
        name: supplierForm.name,
        supplierCode: supplierForm.supplierCode || undefined,
        contact: {
          contactPerson: supplierForm.contactPerson || undefined,
          phone: supplierForm.phone || undefined,
          email: supplierForm.email || undefined,
        },
        address: {
          line1: supplierForm.line1 || undefined,
          line2: supplierForm.line2 || undefined,
          city: supplierForm.city || undefined,
          state: supplierForm.state || undefined,
          postalCode: supplierForm.postalCode || undefined,
          country: supplierForm.country,
        },
        gstin: supplierForm.gstin || undefined,
        panNumber: supplierForm.panNumber || undefined,
        paymentTerms: {
          creditDays: parseInt(supplierForm.creditDays),
          paymentMethod: supplierForm.paymentMethod,
        },
        categories: supplierForm.categories,
        notes: supplierForm.notes || undefined,
      };

      if (editingSupplier) {
        await updateSupplier({
          ...payload,
          supplierId: editingSupplier
        }).unwrap();
        toast({
          title: 'Supplier updated successfully',
          description: `${supplierForm.name} has been updated`,
        });
      } else {
        await createSupplier(payload).unwrap();
        toast({
          title: 'Supplier added successfully',
          description: `${supplierForm.name} has been added`,
        });
      }

      setShowAddSupplier(false);
      setEditingSupplier(null);
      resetForm();
    } catch (error) {
      console.error('Failed to save supplier:', error);
      toast({
        title: 'Error',
        description: 'Failed to save supplier. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (supplier: any) => {
    setSupplierForm({
      name: supplier.name,
      supplierCode: supplier.supplierCode || '',
      contactPerson: supplier.contact.contactPerson || '',
      phone: supplier.contact.phone || '',
      email: supplier.contact.email || '',
      line1: supplier.address?.line1 || '',
      line2: supplier.address?.line2 || '',
      city: supplier.address?.city || '',
      state: supplier.address?.state || '',
      postalCode: supplier.address?.postalCode || '',
      country: supplier.address?.country || 'India',
      gstin: supplier.gstin || '',
      panNumber: supplier.panNumber || '',
      creditDays: supplier.paymentTerms.creditDays.toString(),
      paymentMethod: supplier.paymentTerms.paymentMethod,
      categories: supplier.categories,
      notes: supplier.notes || '',
    });
    setEditingSupplier(supplier.id);
    setShowAddSupplier(true);
  };

  const handleDelete = async (supplierId: string) => {
    if (!restaurantId) return;

    try {
      await deleteSupplier({ restaurantId, supplierId }).unwrap();
      toast({
        title: 'Supplier deleted successfully',
        description: 'The supplier has been removed from your list',
      });
    } catch (error) {
      console.error('Failed to delete supplier:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete supplier. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!restaurantId) {
    return <Navigate to="/onboarding" replace />;
  }

  if (suppliersLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Calculate summary stats
  const totalSuppliers = suppliers.length;
  const activeSuppliers = suppliers.filter(s => s.isActive).length;
  const avgRating = suppliers.reduce((acc, s) => acc + s.performance.rating, 0) / (suppliers.length || 1);

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground">
            Manage your supplier network and vendor relationships
          </p>
        </div>
        <Button onClick={() => setShowAddSupplier(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Supplier
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Suppliers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSuppliers}</div>
            <p className="text-xs text-muted-foreground">
              Registered vendors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Suppliers</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {activeSuppliers}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgRating.toFixed(1)}/5
            </div>
            <p className="text-xs text-muted-foreground">
              Supplier performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Array.from(new Set(suppliers.flatMap(s => s.categories))).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Product categories
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card>
        <CardHeader>
          <CardTitle>Supplier Directory</CardTitle>
          <CardDescription>
            Manage your vendor relationships and contact information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search suppliers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Suppliers Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Categories</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead>Payment Terms</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers?.length ? (
                  filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{supplier.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {supplier.supplierCode && `Code: ${supplier.supplierCode}`}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {supplier.contact.contactPerson && (
                            <div className="text-sm">
                              {supplier.contact.contactPerson}
                            </div>
                          )}
                          {supplier.contact.phone && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {supplier.contact.phone}
                            </div>
                          )}
                          {supplier.contact.email && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {supplier.contact.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {supplier.categories.slice(0, 2).map((category) => (
                            <Badge key={category} variant="outline" className="text-xs">
                              {category}
                            </Badge>
                          ))}
                          {supplier.categories.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{supplier.categories.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm">{supplier.performance.rating}/5</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {supplier.performance.totalOrders} orders
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            {supplier.paymentTerms.paymentMethod.charAt(0).toUpperCase() +
                             supplier.paymentTerms.paymentMethod.slice(1)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {supplier.paymentTerms.creditDays} days
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={supplier.isActive ? "default" : "secondary"}>
                          {supplier.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(supplier)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(supplier.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {suppliersError
                          ? 'Error loading suppliers'
                          : 'No suppliers found'}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Supplier Modal */}
      {showAddSupplier && (
        <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background border rounded-lg shadow-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <CardHeader className="px-0 pt-0">
              <CardTitle>
                {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
              </CardTitle>
              <CardDescription>
                {editingSupplier ? 'Update supplier information' : 'Add a new supplier to your network'}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Supplier Name *</label>
                    <Input
                      value={supplierForm.name}
                      onChange={(e) =>
                        setSupplierForm({ ...supplierForm, name: e.target.value })
                      }
                      placeholder="Supplier name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Supplier Code</label>
                    <Input
                      value={supplierForm.supplierCode}
                      onChange={(e) =>
                        setSupplierForm({ ...supplierForm, supplierCode: e.target.value })
                      }
                      placeholder="Unique code"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Contact Person</label>
                    <Input
                      value={supplierForm.contactPerson}
                      onChange={(e) =>
                        setSupplierForm({ ...supplierForm, contactPerson: e.target.value })
                      }
                      placeholder="Contact person name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input
                      value={supplierForm.phone}
                      onChange={(e) =>
                        setSupplierForm({ ...supplierForm, phone: e.target.value })
                      }
                      placeholder="Phone number"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={supplierForm.email}
                    onChange={(e) =>
                      setSupplierForm({ ...supplierForm, email: e.target.value })
                    }
                    placeholder="Email address"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Credit Days</label>
                    <Input
                      type="number"
                      value={supplierForm.creditDays}
                      onChange={(e) =>
                        setSupplierForm({ ...supplierForm, creditDays: e.target.value })
                      }
                      placeholder="30"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Payment Method</label>
                    <Select
                      value={supplierForm.paymentMethod}
                      onValueChange={(value: any) =>
                        setSupplierForm({ ...supplierForm, paymentMethod: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="credit">Credit</SelectItem>
                        <SelectItem value="advance">Advance</SelectItem>
                        <SelectItem value="cod">COD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <Input
                    value={supplierForm.notes}
                    onChange={(e) =>
                      setSupplierForm({ ...supplierForm, notes: e.target.value })
                    }
                    placeholder="Additional notes"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddSupplier(false);
                      setEditingSupplier(null);
                      resetForm();
                    }}
                    disabled={isCreating || isUpdating}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isCreating || isUpdating || !supplierForm.name}
                    className="flex-1"
                  >
                    {(isCreating || isUpdating) && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {editingSupplier ? 'Update Supplier' : 'Add Supplier'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      )}
    </div>
  );
}