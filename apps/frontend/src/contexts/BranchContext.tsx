import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import {
  Branch,
  useGetBranchesQuery,
  useGetMainBranchQuery,
} from '@/store/api/branchesApi';
import { useAppSelector } from '@/store/hooks';

interface BranchContextType {
  branches: Branch[];
  currentBranch: Branch | null;
  isMultiBranch: boolean;
  isLoading: boolean;
  error: string | null;
  switchBranch: (branchId: string) => void;
  canAccessAllBranches: boolean;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

interface BranchProviderProps {
  children: ReactNode;
}

export const BranchProvider: React.FC<BranchProviderProps> = ({ children }) => {
  const [currentBranchId, setCurrentBranchId] = useState<string | null>(null);
  const { session, status } = useAppSelector((state) => state.auth);

  console.log('🏢 BranchProvider - Auth state:', {
    session: session
      ? {
          userId: session.userId,
          restaurantId: session.restaurantId,
          roles: session.roles,
          displayName: session.displayName,
        }
      : null,
    status,
  });

  const {
    data: branches = [],
    isLoading: branchesLoading,
    error: branchesError,
  } = useGetBranchesQuery(undefined, {
    skip: !session || status !== 'authenticated',
  });

  const {
    data: mainBranch,
    isLoading: mainBranchLoading,
    error: mainBranchError,
  } = useGetMainBranchQuery(undefined, {
    skip: !session || status !== 'authenticated' || branches.length === 0,
  });

  const isLoading = branchesLoading || mainBranchLoading;
  const error = branchesError || mainBranchError;

  console.log('🏢 BranchProvider - Query state:', {
    branchesLoading,
    branchesError: branchesError ? String(branchesError) : null,
    branchesCount: branches.length,
    mainBranchLoading,
    skip: !session || status !== 'authenticated',
  });

  // Log branches data when it changes
  useEffect(() => {
    if (branches.length > 0) {
      console.log('🎉 Branches loaded:', branches);
    } else if (
      !branchesLoading &&
      !branchesError &&
      status === 'authenticated'
    ) {
      console.log('⚠️ No branches returned from API');
    }
  }, [branches, branchesLoading, branchesError, status]);

  // Determine if user can access all branches (owners/managers)
  const canAccessAllBranches =
    session?.roles?.includes('owner') ||
    (session?.roles?.includes('manager') && branches.length > 1);

  // Determine if this is a multi-branch setup
  const isMultiBranch = branches.length > 1;

  // Set initial branch
  useEffect(() => {
    if (branches.length > 0 && !currentBranchId) {
      // Get saved branch preference from localStorage
      const savedBranchId = localStorage.getItem('currentBranchId');

      if (savedBranchId && canAccessAllBranches) {
        // Verify the saved branch still exists
        const savedBranch = branches.find((b) => b._id === savedBranchId);
        if (savedBranch) {
          setCurrentBranchId(savedBranchId);
          return;
        }
      }

      // If user is scoped to a specific branch (from backend user.branchId)
      // we would get this from the user object, but for now default to main branch
      if (mainBranch) {
        setCurrentBranchId(mainBranch._id);
      } else if (branches.length === 1) {
        setCurrentBranchId(branches[0]._id);
      }
    }
  }, [branches, mainBranch, currentBranchId, canAccessAllBranches]);

  // Get current branch object
  const currentBranch = currentBranchId
    ? branches.find((b) => b._id === currentBranchId) || null
    : null;

  const switchBranch = (branchId: string) => {
    if (canAccessAllBranches) {
      setCurrentBranchId(branchId);
      localStorage.setItem('currentBranchId', branchId);
    }
  };

  const value: BranchContextType = {
    branches,
    currentBranch,
    isMultiBranch,
    isLoading,
    error: error ? 'Failed to load branch data' : null,
    switchBranch,
    canAccessAllBranches,
  };

  return (
    <BranchContext.Provider value={value}>{children}</BranchContext.Provider>
  );
};

export const useBranchContext = (): BranchContextType => {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error('useBranchContext must be used within a BranchProvider');
  }
  return context;
};

export default BranchContext;
