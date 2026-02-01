import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/slices/authSlice';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Mail, Calendar, Shield, Settings } from 'lucide-react';

const ProfilePage = () => {
  const user = useAppSelector(selectAuthUser);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-destructive">Profile not found</h3>
          <p className="text-muted-foreground">Unable to load user profile</p>
        </div>
      </div>
    );
  }

  const initials = user.name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'SA';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <User className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Profile</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarFallback className="text-lg font-bold bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{user.name}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Member since {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Super Administrator</span>
            </div>

            <div className="pt-2">
              <h4 className="text-sm font-medium mb-2">Roles</h4>
              <div className="flex gap-2 flex-wrap">
                {user.roles.map((role) => (
                  <Badge key={role} variant="secondary">
                    {role.replace('_', ' ').toUpperCase()}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <Badge
                variant={user.isActive ? 'default' : 'destructive'}
                className="text-sm"
              >
                {user.isActive ? 'Active Account' : 'Inactive Account'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Account Management
            </CardTitle>
            <CardDescription>
              Manage your account settings and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-start" disabled>
              <User className="h-4 w-4 mr-2" />
              Edit Profile Information
            </Button>

            <Button variant="outline" className="w-full justify-start" disabled>
              <Shield className="h-4 w-4 mr-2" />
              Change Password
            </Button>

            <Button variant="outline" className="w-full justify-start" disabled>
              <Settings className="h-4 w-4 mr-2" />
              Notification Preferences
            </Button>

            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Account ID: {user.id}
              </p>
              <p className="text-xs text-muted-foreground">
                Last login: {new Date().toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Security Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Security & Permissions</CardTitle>
            <CardDescription>
              Your current access levels and security information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">Full Platform Access</h4>
                <p className="text-sm text-green-700">
                  You have complete access to all administrative functions including
                  restaurant management, settlements, analytics, and user management.
                </p>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Security Status</h4>
                <p className="text-sm text-blue-700">
                  Your account is protected with secure authentication.
                  Consider enabling two-factor authentication for additional security.
                </p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2">Important Responsibilities</h4>
              <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                <li>Ensure settlement processing is completed regularly</li>
                <li>Monitor platform health and respond to issues promptly</li>
                <li>Maintain security of super admin credentials</li>
                <li>Review and approve new restaurant partnerships</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;