import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import { ZoneManagementPanel } from '@/components/tables/ZoneManagementPanel';
import { useBranchAwareQueries } from '@/hooks/useBranchAwareQuery';

const ZonesManagementPage = () => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);

  // Enable branch-aware queries to auto-refetch when branch changes
  useBranchAwareQueries();

  if (!restaurantId) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Zones Management
          </h1>
          <p className="text-muted-foreground">
            Manage your restaurant zones and table assignments
          </p>
        </div>
      </div>

      <ZoneManagementPanel restaurantId={restaurantId} />
    </div>
  );
};

export default ZonesManagementPage;