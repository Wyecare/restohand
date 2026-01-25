import { useState, useEffect } from 'react';
import {
  Routes,
  Route,
  Navigate,
  useParams,
  useNavigate,
} from 'react-router-dom';
import { ChefHat } from 'lucide-react';
import { CategoriesView } from './components/CategoriesView';
import { useListMenuCategoriesByBranchQuery } from '@/store/api/restaurantsApi';
import { useJwtAuth } from '@/contexts/JwtAuthProvider';
import { useBranchContext } from '@/contexts/BranchContext';
import { skipToken } from '@reduxjs/toolkit/query/react';

export function MenuManagementPage() {
  const { user } = useJwtAuth();
  const { currentBranch } = useBranchContext();
  const navigate = useNavigate();

  const restaurantId = user?.restaurantId;
  const branchId = currentBranch?._id;

  const queryParams =
    restaurantId && branchId ? { restaurantId, branchId } : skipToken;

  const { data: categoriesData } =
    useListMenuCategoriesByBranchQuery(queryParams);
  const categories = categoriesData?.data || [];

  // Auto-redirect to first category if on base /menu route
  useEffect(() => {
    if (categories.length > 0 && window.location.pathname === '/menu') {
      navigate(`/menu/categories/${categories[0]._id || categories[0].id}`, {
        replace: true,
      });
    }
  }, [categories, navigate]);

  return (
    <div className="min-h-screen">
      <Routes>
        <Route
          path="/"
          element={
            <Navigate
              to={
                categories[0]
                  ? `/menu/categories/${categories[0]._id || categories[0].id}`
                  : '/menu'
              }
              replace
            />
          }
        />
        <Route path="/categories/:categoryId" element={<CategoriesView />} />
      </Routes>
    </div>
  );
}
