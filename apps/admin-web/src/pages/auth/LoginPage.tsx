import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useSuperAdminLoginMutation } from '@/store/api/authApi';
import { setCredentials, selectIsAuthenticated } from '@/store/slices/authSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [login, { isLoading }] = useSuperAdminLoginMutation();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const { toast } = useToast();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await login({ email, password }).unwrap();

      dispatch(setCredentials({
        idToken: result.token,
        user: result.user,
        expiresIn: result.expiresIn,
      }));

      toast({
        title: 'Login successful',
        description: `Welcome back, ${result.user.name}`,
      });
    } catch (error: any) {
      toast({
        title: 'Login failed',
        description: error.data?.message || 'Invalid credentials',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Super Admin Login</CardTitle>
          <CardDescription>
            Sign in to access the Restohand Admin Portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-4 p-3 bg-muted rounded-md">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span>Super Admin access only</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;