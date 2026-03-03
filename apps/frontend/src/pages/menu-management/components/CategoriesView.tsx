import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CategoriesSidebar } from './CategoriesSidebar';
import { MenuItemsPanel } from './MenuItemsPanel';
import { CategoryFormDialog } from './CategoryFormDialog';
import { MenuItemFormDialog } from './MenuItemFormDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useJwtAuth } from '@/contexts/JwtAuthProvider';
import { useBranchContext } from '@/contexts/BranchContext';
import { skipToken } from '@reduxjs/toolkit/query/react';
import {
  useListMenuCategoriesByBranchQuery,
  useListMenuItemsQuery,
} from '@/store/api/restaurantsApi';

export function CategoriesView() {
  const { categoryId } = useParams();
  const [searchParams] = useSearchParams();
  const highlightItemId = searchParams.get('highlight');
  const { user } = useJwtAuth();
  const { currentBranch } = useBranchContext();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const restaurantId = user?.restaurantId;
  const branchId = currentBranch?._id;

  const categoriesQueryParams =
    restaurantId && branchId ? { restaurantId, branchId } : skipToken;

  const { data: categoriesData, isLoading: categoriesLoading } =
    useListMenuCategoriesByBranchQuery(categoriesQueryParams, {
      limit: 1000,
    });
  const categories = categoriesData?.data || [];

  const itemsQueryParams =
    restaurantId && categoryId ? { restaurantId, categoryId } : skipToken;

  const { data: itemsData, isLoading: itemsLoading, refetch: refetchItems } =
    useListMenuItemsQuery(itemsQueryParams);
  const items = itemsData?.data || [];

  const currentCategory = categories.find(
    (cat: any) => (cat._id || cat.id) === categoryId
  );

  // Dialog states
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isMenuItemDialogOpen, setIsMenuItemDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMobileItemsOpen, setIsMobileItemsOpen] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [selectedMenuItem, setSelectedMenuItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'category' | 'item';
    data: any;
  } | null>(null);

  const handleAddCategory = () => {
    setSelectedCategory(null);
    setIsCategoryDialogOpen(true);
  };

  const handleEditCategory = (category: any) => {
    setSelectedCategory(category);
    setIsCategoryDialogOpen(true);
  };

  const handleDeleteCategory = (category: any) => {
    setDeleteTarget({ type: 'category', data: category });
    setIsDeleteDialogOpen(true);
  };

  const handleAddMenuItem = () => {
    setSelectedMenuItem(null);
    setIsMenuItemDialogOpen(true);
  };

  const handleEditMenuItem = (item: any) => {
    setSelectedMenuItem(item);
    setIsMenuItemDialogOpen(true);
  };

  const handleDeleteMenuItem = (item: any) => {
    setDeleteTarget({ type: 'item', data: item });
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="flex h-[calc(100vh-50px)] bg-slate-50/50 overflow-hidden">
      {isDesktop ? (
        <>
          <CategoriesSidebar
            categories={categories}
            isLoading={categoriesLoading}
            selectedCategoryId={categoryId}
            onAddCategory={handleAddCategory}
            onEditCategory={handleEditCategory}
            onDeleteCategory={handleDeleteCategory}
          />
          <MenuItemsPanel
            category={currentCategory}
            items={items}
            isLoading={itemsLoading}
            onAddItem={handleAddMenuItem}
            onEditItem={handleEditMenuItem}
            onDeleteItem={handleDeleteMenuItem}
            highlightItemId={highlightItemId}
          />
        </>
      ) : (
        <>
          <CategoriesSidebar
            categories={categories}
            isLoading={categoriesLoading}
            selectedCategoryId={categoryId}
            onAddCategory={handleAddCategory}
            onEditCategory={handleEditCategory}
            onDeleteCategory={handleDeleteCategory}
            onCategoryClick={() => setIsMobileItemsOpen(true)}
          />
          <Dialog open={isMobileItemsOpen} onOpenChange={setIsMobileItemsOpen}>
            <DialogContent className="max-w-4xl max-h-[85vh] p-0">
              <MenuItemsPanel
                category={currentCategory}
                items={items}
                isLoading={itemsLoading}
                onAddItem={handleAddMenuItem}
                onEditItem={handleEditMenuItem}
                onDeleteItem={handleDeleteMenuItem}
                highlightItemId={highlightItemId}
                isMobile
              />
            </DialogContent>
          </Dialog>
        </>
      )}

      <CategoryFormDialog
        open={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        category={selectedCategory}
      />

      <MenuItemFormDialog
        open={isMenuItemDialogOpen}
        onOpenChange={setIsMenuItemDialogOpen}
        menuItem={selectedMenuItem}
        categoryId={categoryId}
      />

      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        target={deleteTarget}
      />
    </div>
  );
}