import React, { useState } from 'react';
import { FloorPlanDashboard } from '@/components/floor-plan/FloorPlanDashboard';
import { FloorPlanErrorBoundary } from '@/components/floor-plan/ErrorBoundary';
import { FloorPlanFullPageLoading } from '@/components/floor-plan/LoadingStates';
import { useAppSelector } from '@/store/hooks';
import { selectAuthSession } from '@/store/slices/authSlice';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

const FloorPlanDashboardPage: React.FC = () => {
  const session = useAppSelector(selectAuthSession);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!session?.restaurantId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please complete your restaurant setup to access the floor plan dashboard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <FloorPlanErrorBoundary>
      <React.Suspense fallback={<FloorPlanFullPageLoading />}>
        <FloorPlanDashboard
          restaurantId={session.restaurantId}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          className="h-full"
        />
      </React.Suspense>
    </FloorPlanErrorBoundary>
  );
};

export default FloorPlanDashboardPage;