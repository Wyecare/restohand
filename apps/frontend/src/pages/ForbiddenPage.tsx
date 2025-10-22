import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthProvider';
import { useEffect } from 'react';

const ForbiddenPage = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleExit = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-muted/10 p-4">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">
            Access denied
          </CardTitle>
          <CardDescription>
            You don&apos;t have permission to view this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Try signing in with an account that has the right permissions.
          </p>
          <Button onClick={handleExit} variant="outline" className="w-full">
            Back to login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForbiddenPage;
