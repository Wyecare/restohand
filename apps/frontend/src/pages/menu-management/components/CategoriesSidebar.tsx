import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Search,
  FileText,
  Loader2,
  UtensilsCrossed,
  Wine,
  Coffee,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlobalMenuSearch } from '@/components/menu/GlobalMenuSearch';
import { useToast } from '@/hooks/use-toast';
import { MenuSearchResultItem } from '@/store/api/restaurantsApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CategoriesSidebarProps {
  categories: any[];
  isLoading: boolean;
  selectedCategoryId?: string;
  onAddCategory: () => void;
  onEditCategory: (category: any) => void;
  onDeleteCategory: (category: any) => void;
  onCategoryClick?: () => void;
}

// ─── Food Category Config ─────────────────────────────────────────────────────

const FOOD_CATEGORY_META: Record<
  string,
  { label: string; icon: React.ElementType; accent: string; dot: string }
> = {
  cooked_food: {
    label: 'Food',
    icon: UtensilsCrossed,
    accent: 'text-amber-600',
    dot: 'bg-amber-400',
  },
  alcohol: {
    label: 'Alcohol',
    icon: Wine,
    accent: 'text-violet-600',
    dot: 'bg-violet-400',
  },
  beverages: {
    label: 'Beverages',
    icon: Coffee,
    accent: 'text-blue-600',
    dot: 'bg-blue-400',
  },
  other: {
    label: 'Other',
    icon: Layers,
    accent: 'text-slate-500',
    dot: 'bg-slate-400',
  },
};

function getFoodCategoryMeta(key: string) {
  return FOOD_CATEGORY_META[key] || FOOD_CATEGORY_META['other'];
}

// ─── Category Item ────────────────────────────────────────────────────────────

function CategoryItem({
  category,
  isSelected,
  onClick,
  onEdit,
  onDelete,
}: {
  category: any;
  isSelected: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={cn(
        'group relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer border-l-2 transition-all duration-100',
        isSelected
          ? 'bg-slate-900 border-l-slate-900 text-white'
          : 'border-l-transparent hover:bg-slate-100 text-slate-700'
      )}
      onClick={onClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Active dot */}
      <div
        className={cn(
          'h-1.5 w-1.5 rounded-full shrink-0 transition-colors',
          category.isActive
            ? isSelected
              ? 'bg-emerald-400'
              : 'bg-emerald-500'
            : isSelected
            ? 'bg-slate-500'
            : 'bg-slate-300'
        )}
      />

      {/* Name */}
      <span
        className={cn(
          'flex-1 text-sm font-medium truncate leading-tight',
          isSelected ? 'text-white' : 'text-slate-800'
        )}
      >
        {category.name}
      </span>

      {/* Actions — shown on hover, hidden when selected to avoid clutter */}
      {showActions && !isSelected && (
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <Edit className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Selected indicator arrow */}
      {isSelected && (
        <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      )}
    </div>
  );
}

// ─── Category Group ───────────────────────────────────────────────────────────

function CategoryGroup({
  foodCategory,
  categories,
  selectedCategoryId,
  onCategoryClick,
  onEdit,
  onDelete,
  defaultOpen = true,
}: {
  foodCategory: string;
  categories: any[];
  selectedCategoryId?: string;
  onCategoryClick: (id: string) => void;
  onEdit: (cat: any) => void;
  onDelete: (cat: any) => void;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const meta = getFoodCategoryMeta(foodCategory);
  const Icon = meta.icon;
  const hasSelected = categories.some(
    (c) => (c._id || c.id) === selectedCategoryId
  );

  // Auto-open if a selected category is in this group
  useEffect(() => {
    if (hasSelected) setIsOpen(true);
  }, [hasSelected]);

  return (
    <div className="mb-1">
      {/* Group header */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-100 transition-colors group"
      >
        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', meta.dot)} />
        <Icon className={cn('h-3.5 w-3.5 shrink-0', meta.accent)} />
        <span className={cn('text-xs font-semibold uppercase tracking-wider flex-1 text-left', meta.accent)}>
          {meta.label}
        </span>
        <span className="text-xs text-slate-400 font-medium">
          {categories.length}
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-slate-400 transition-transform duration-200',
            !isOpen && '-rotate-90'
          )}
        />
      </button>

      {/* Category items */}
      {isOpen && (
        <div className="ml-2 mt-0.5 space-y-0.5 border-l border-slate-100 pl-2">
          {categories.map((category) => {
            const categoryId = category._id || category.id;
            return (
              <CategoryItem
                key={categoryId}
                category={category}
                isSelected={categoryId === selectedCategoryId}
                onClick={() => onCategoryClick(categoryId)}
                onEdit={() => onEdit(category)}
                onDelete={() => onDelete(category)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SidebarSkeleton() {
  return (
    <div className="space-y-3 p-3 animate-pulse">
      {[1, 2, 3].map((g) => (
        <div key={g}>
          <div className="h-3 bg-slate-100 rounded w-20 mb-2" />
          <div className="space-y-1 pl-2">
            {Array.from({ length: g + 1 }).map((_, i) => (
              <div key={i} className="h-8 bg-slate-100 rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

export function CategoriesSidebar({
  categories,
  isLoading,
  selectedCategoryId,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onCategoryClick,
}: CategoriesSidebarProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/menu/items/categories/${categoryId}`);
    onCategoryClick?.();
  };

  const handleSearchResultSelect = (result: MenuSearchResultItem) => {
    if (result.type === 'category') {
      navigate(`/menu/items/categories/${result.id}`);
    } else if (result.type === 'item' && result.categoryId) {
      navigate(
        `/menu/items/categories/${result.categoryId}?highlight=${result.id}`
      );
    }
  };

  // Group categories by foodCategory
  const grouped = categories.reduce((acc: Record<string, any[]>, cat) => {
    const key = cat.foodCategory || 'other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(cat);
    return acc;
  }, {});

  // Sort groups: cooked_food first, then alcohol, beverages, other
  const groupOrder = ['cooked_food', 'alcohol', 'beverages'];
  const sortedGroups = [
    ...groupOrder.filter((k) => grouped[k]),
    ...Object.keys(grouped).filter((k) => !groupOrder.includes(k)),
  ];

  const activeCount = categories.filter((c) => c.isActive).length;

  return (
    <div className="w-64 flex flex-col bg-white border-r border-slate-200 h-full shrink-0">

      {/* Header */}
      <div className="p-3 border-b border-slate-100">
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Categories</h2>
            {!isLoading && categories.length > 0 && (
              <p className="text-xs text-slate-400 mt-0.5">
                {categories.length} total · {activeCount} active
              </p>
            )}
          </div>
          <button
            onClick={onAddCategory}
            className="h-7 w-7 flex items-center justify-center rounded-lg bg-slate-900 hover:bg-slate-700 text-white transition-colors"
            title="Add category"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Search */}
        <GlobalMenuSearch
          onResultSelect={handleSearchResultSelect}
          placeholder="Search menu..."
          className="w-full"
        />
      </div>

      {/* Extract from PDF — secondary action */}
      <div className="px-3 py-2 border-b border-slate-100">
        <button
          onClick={() => navigate('/extract-menu')}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors border border-slate-200 border-dashed"
        >
          <FileText className="h-3.5 w-3.5" />
          Extract from PDF
        </button>
      </div>

      {/* Category list */}
      <div className="flex-1 overflow-y-auto py-2 px-2">
        {isLoading ? (
          <SidebarSkeleton />
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <UtensilsCrossed className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-xs font-medium text-slate-600 mb-1">No categories yet</p>
            <p className="text-xs text-slate-400">Add your first category to get started</p>
          </div>
        ) : (
          sortedGroups.map((foodCategory) => (
            <CategoryGroup
              key={foodCategory}
              foodCategory={foodCategory}
              categories={grouped[foodCategory]}
              selectedCategoryId={selectedCategoryId}
              onCategoryClick={handleCategoryClick}
              onEdit={onEditCategory}
              onDelete={onDeleteCategory}
              defaultOpen={true}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {!isLoading && categories.length > 0 && (
        <div className="px-3 py-2 border-t border-slate-100 bg-slate-50/50">
          <p className="text-xs text-slate-400 text-center">
            {categories.length} {categories.length === 1 ? 'category' : 'categories'}
          </p>
        </div>
      )}
    </div>
  );
}