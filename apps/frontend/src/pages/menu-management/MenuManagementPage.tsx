import { useEffect, useMemo } from 'react';
import {
  Routes,
  Route,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { CategoriesView } from './components/CategoriesView';
import { ModifiersView } from './components/ModifiersView';
import { PriceTagsView } from './components/PriceTagsView';
import { GlobalMenuSearch } from '@/components/menu/GlobalMenuSearch';
import { useListMenuCategoriesByBranchQuery, type MenuSearchResultItem } from '@/store/api/restaurantsApi';
import { useJwtAuth } from '@/contexts/JwtAuthProvider';
import { useBranchContext } from '@/contexts/BranchContext';
import { useToast } from '@/components/ui/use-toast';
import { skipToken } from '@reduxjs/toolkit/query/react';

export function MenuManagementPage() {
  const { user } = useJwtAuth();
  const { currentBranch } = useBranchContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const restaurantId = user?.restaurantId;
  const branchId = currentBranch?._id;

  const queryParams =
    restaurantId && branchId ? { restaurantId, branchId } : skipToken;
  const { data: categoriesData } =
    useListMenuCategoriesByBranchQuery(queryParams);

  const categories = useMemo(() => categoriesData?.data || [], [categoriesData?.data]);

  // Auto-redirect to first category if on base /menu route
  useEffect(() => {
    if (categories.length > 0 && location.pathname === '/menu') {
      navigate(`/menu/items/categories/${categories[0].id}`, {
        replace: true,
      });
    }
  }, [categories, location.pathname, navigate]);

  const handleSearchResultSelect = (result: MenuSearchResultItem) => {
    if (result.type === 'category') {
      navigate(`/menu/items/categories/${result.id}`);
      toast({
        title: 'Category Selected',
        description: `Navigated to ${result.name}`,
      });
    } else if (result.type === 'item') {
      // Navigate to the item's category with highlight parameter
      if (result.categoryId) {
        navigate(`/menu/items/categories/${result.categoryId}?highlight=${result.id}`);
        toast({
          title: 'Menu Item Found',
          description: `Found "${result.name}" in ${result.categoryName || 'category'}`,
        });
      }
    }
  };

  return (
    <div className="mx-auto px-1 py-1 space-y-4">
      {/* Global Search Bar */}
      <div className="max-w-2xl mx-auto">
        <GlobalMenuSearch
          onResultSelect={handleSearchResultSelect}
          placeholder="Search menu categories and items..."
          className="w-full"
        />
      </div>

      <Routes>
        {/* Items routes - matching existing sidebar navigation */}
        <Route index element={<CategoriesView />} />
        <Route path="items" element={<CategoriesView />} />
        <Route path="items/categories/:categoryId" element={<CategoriesView />} />

        {/* Modifiers route */}
        <Route path="modifiers" element={<ModifiersView />} />

        {/* Price tags route */}
        <Route path="price-tags" element={<PriceTagsView />} />
      </Routes>
    </div>
  );
}
