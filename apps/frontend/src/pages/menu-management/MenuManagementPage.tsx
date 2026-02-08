import { useEffect } from 'react';
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { CategoriesView } from './components/CategoriesView';
import { ModifiersView } from './components/ModifiersView';
import { PriceTagsView } from './components/PriceTagsView';
import { useListMenuCategoriesByBranchQuery } from '@/store/api/restaurantsApi';
import { useJwtAuth } from '@/contexts/JwtAuthProvider';
import { useBranchContext } from '@/contexts/BranchContext';
import { skipToken } from '@reduxjs/toolkit/query/react';

export function MenuManagementPage() {
  const { user } = useJwtAuth();
  const { currentBranch } = useBranchContext();
  const navigate = useNavigate();
  const location = useLocation();
  const restaurantId = user?.restaurantId;
  const branchId = currentBranch?._id;

  const queryParams =
    restaurantId && branchId ? { restaurantId, branchId } : skipToken;
  const { data: categoriesData } =
    useListMenuCategoriesByBranchQuery(queryParams);
  const categories = categoriesData?.data || [];

  // Auto-redirect to first category if on base /menu route
  useEffect(() => {
    if (categories.length > 0 && location.pathname === '/menu') {
      navigate(`/menu/items/${categories[0]._id || categories[0].id}`, {
        replace: true,
      });
    }
  }, [categories, location.pathname, navigate]);

  return (
    <div className=" mx-auto px-1 py-1">
      <Routes>
        {/* Base redirect */}

        {/* Items routes - previously under /menu/categories */}
        <Route path="/items" element={<CategoriesView />} />
        <Route
          path="/items/categories/:categoryId"
          element={<CategoriesView />}
        />

        {/* Modifiers route */}
        <Route path="/modifiers" element={<ModifiersView />} />

        {/* Price tags route */}
        <Route path="/price-tags" element={<PriceTagsView />} />
      </Routes>
    </div>
  );
}
