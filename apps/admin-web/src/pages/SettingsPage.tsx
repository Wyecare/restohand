import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/contexts/ThemeContext';
import { Settings, Moon, Sun, Monitor, Bell, Shield } from 'lucide-react';

const SettingsPage = () => {
  const { theme: currentTheme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize the look and feel of the admin portal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Theme</h3>
            <div className="grid grid-cols-3 gap-4">
              <Button
                variant={currentTheme === 'light' ? 'default' : 'outline'}
                onClick={() => setTheme('light')}
                className="flex items-center gap-2 h-auto p-4"
              >
                <Sun className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Light</div>
                  <div className="text-xs opacity-70">Bright interface</div>
                </div>
              </Button>
              <Button
                variant={currentTheme === 'dark' ? 'default' : 'outline'}
                onClick={() => setTheme('dark')}
                className="flex items-center gap-2 h-auto p-4"
              >
                <Moon className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Dark</div>
                  <div className="text-xs opacity-70">Low light interface</div>
                </div>
              </Button>
              <Button
                variant="outline"
                onClick={() => setTheme('system')}
                className="flex items-center gap-2 h-auto p-4"
              >
                <Monitor className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">System</div>
                  <div className="text-xs opacity-70">Matches system preference</div>
                </div>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription>
            Manage your account security settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="two-factor">Two-Factor Authentication</Label>
              <div className="text-sm text-muted-foreground">
                Add an extra layer of security to your account
              </div>
            </div>
            <Switch id="two-factor" disabled />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="session-timeout">Auto-logout</Label>
              <div className="text-sm text-muted-foreground">
                Automatically log out after period of inactivity
              </div>
            </div>
            <Switch id="session-timeout" defaultChecked disabled />
          </div>

          <div className="pt-4">
            <Button variant="outline" disabled>
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Configure notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <div className="text-sm text-muted-foreground">
                Receive important updates via email
              </div>
            </div>
            <Switch id="email-notifications" defaultChecked disabled />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="settlement-alerts">Settlement Alerts</Label>
              <div className="text-sm text-muted-foreground">
                Get notified when settlements require attention
              </div>
            </div>
            <Switch id="settlement-alerts" defaultChecked disabled />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="system-alerts">System Alerts</Label>
              <div className="text-sm text-muted-foreground">
                Receive notifications about system issues
              </div>
            </div>
            <Switch id="system-alerts" defaultChecked disabled />
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>
            Information about the admin portal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Version</span>
            <span className="font-mono">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span>Environment</span>
            <span className="font-mono">Production</span>
          </div>
          <div className="flex justify-between">
            <span>Last Updated</span>
            <span>{new Date().toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;