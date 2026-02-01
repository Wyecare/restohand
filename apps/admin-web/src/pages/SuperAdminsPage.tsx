import { useState } from 'react';
import {
  useGetSuperAdminsQuery,
  useCreateSuperAdminMutation,
} from '@/store/api/adminApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Shield, Plus, Mail, Calendar, UserCheck } from 'lucide-react';

const SuperAdminsPage = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const { data: superAdmins, isLoading, error } = useGetSuperAdminsQuery();
  const [createSuperAdmin, { isLoading: creating }] =
    useCreateSuperAdminMutation();
  const { toast } = useToast();

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await createSuperAdmin(formData).unwrap();

      toast({
        title: 'Super Admin created',
        description: `Successfully created admin account for ${result.name}`,
      });

      setShowCreateDialog(false);
      setFormData({ name: '', email: '', password: '' });
    } catch (error: any) {
      toast({
        title: 'Creation failed',
        description: error.data?.message || 'Failed to create super admin',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-destructive">
            Error loading super admins
          </h3>
          <p className="text-muted-foreground">
            Please try refreshing the page
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Super Admin Management</h1>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Super Admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Super Admin</DialogTitle>
              <DialogDescription>
                Create a new super admin account with full platform access.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="admin@restohand.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Admin'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {superAdmins?.superAdmins && superAdmins.superAdmins?.length > 0 ? (
          superAdmins.superAdmins?.map((admin) => (
            <Card key={admin.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{admin.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant={admin.isActive ? 'default' : 'destructive'}
                        >
                          {admin.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {admin.roles?.map((role) => (
                          <Badge key={role} variant="secondary">
                            {role.replace('_', ' ').toUpperCase()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-muted-foreground">
                      Verified
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{admin.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Created {new Date(admin.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-96">
              <Shield className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No Super Admins</h3>
              <p className="text-muted-foreground mb-4">
                Create the first super admin account
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Super Admin
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Security Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            • Super admin accounts have full access to the platform and should
            be created sparingly
          </p>
          <p>
            • Use strong passwords and enable two-factor authentication when
            available
          </p>
          <p>• Regularly review and audit super admin access</p>
          <p>• Deactivate accounts immediately when no longer needed</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminsPage;
