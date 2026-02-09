import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import { TableHeatmapView } from '@/components/tables/TableHeatmapView';
import { useBranchAwareQueries } from '@/hooks/useBranchAwareQuery';

const TableHeatmapPage = () => {
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
          <h1 className="text-3xl font-bold tracking-tight">Table Heatmap</h1>
          <p className="text-muted-foreground">
            Real-time view of table occupancy and status
          </p>
        </div>
      </div>

      <TableHeatmapView />
    </div>
  );
};

export default TableHeatmapPage;
