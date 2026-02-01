import { useEffect } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { useBranchContext } from '@/contexts/BranchContext';
import { baseApi } from '@/store/api/baseApi';

/**
 * Hook that invalidates RTK Query cache when branch changes
 * This ensures data refetches when user switches branches
 */
export function useBranchAwareQueries() {
  const dispatch = useAppDispatch();
  const { currentBranch } = useBranchContext();

  useEffect(() => {
    if (currentBranch) {
      // Invalidate all cache when branch changes to force refetch
      dispatch(baseApi.util.invalidateTags([
        'RestaurantTable',
        'Order',
        'InventoryItem',
        'User',
        'TableStatus'
      ]));
    }
  }, [currentBranch?._id, dispatch]);

  return {
    currentBranchId: currentBranch?._id,
    isReady: !!currentBranch
  };
}

/**
 * Hook that provides current branch context and ensures queries are branch-aware
 */
export function useCurrentBranch() {
  const { currentBranch, isLoading } = useBranchContext();

  return {
    branchId: currentBranch?._id,
    branch: currentBranch,
    isLoading,
    isReady: !isLoading && !!currentBranch
  };
}