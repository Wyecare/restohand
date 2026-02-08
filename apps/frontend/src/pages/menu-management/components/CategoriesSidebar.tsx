import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  ImagePlus,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoriesSidebarProps {
  categories: any[];
  isLoading: boolean;
  selectedCategoryId?: string;
  onAddCategory: () => void;
  onEditCategory: (category: any) => void;
  onDeleteCategory: (category: any) => void;
  onCategoryClick?: () => void;
}

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

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/menu/items/categories/${categoryId}`);
    onCategoryClick?.();
  };

  return (
    <div className="w-70 border-r bg-muted/30 flex flex-col h-full">
      {/* Header */}
      <div className="p-2 flex border-b flex-shrink-0 grid-cols-2 justify-between">
        <Button onClick={onAddCategory} className="gap-2 w-[48%]">
          Add Category
        </Button>
        <Button
          onClick={() => {
            navigate('/extract-menu');
          }}
          className="gap-2 w-[48%]"
        >
          Extract from pdf
        </Button>
      </div>

      {/* Categories List */}
      <ScrollArea className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">No categories yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create your first category to get started
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {categories.map((category) => {
              const categoryId = category._id || category.id;
              const isSelected = categoryId === selectedCategoryId;

              return (
                <div
                  key={categoryId}
                  className={cn(
                    'group relative rounded-lg border transition-all',
                    isSelected
                      ? 'bg-background border-primary shadow-sm'
                      : 'bg-background/50 border-transparent hover:bg-background hover:border-border'
                  )}
                >
                  <button
                    onClick={() => handleCategoryClick(categoryId)}
                    className="w-full p-3 flex items-center gap-3 text-left"
                  >
                    {/* Category Image */}
                    {category.imageUrl ? (
                      <img
                        src={category.imageUrl}
                        alt={category.name}
                        className="h-12 w-12 rounded-md object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                        <ImagePlus className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}

                    {/* Category Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {category.name}
                      </div>
                      {category.description && (
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                          {category.description}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={cn(
                            'text-xs px-1.5 py-0.5 rounded-full',
                            category.isActive
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          )}
                        >
                          {category.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Actions Menu */}
                  <div className="absolute top-2 right-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onEditCategory(category)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDeleteCategory(category)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {categories.length > 0 && (
        <div className="p-3 border-t bg-background/50 flex-shrink-0">
          <div className="text-xs text-muted-foreground text-center">
            {categories.length}{' '}
            {categories.length === 1 ? 'category' : 'categories'}
          </div>
        </div>
      )}
    </div>
  );
}
