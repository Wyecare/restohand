import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
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
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const selectedCategoryRef = useRef<HTMLButtonElement>(null);

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/menu/items/categories/${categoryId}`);
    onCategoryClick?.();
  };

  // Auto-scroll to selected category
  useEffect(() => {
    if (selectedCategoryId && selectedCategoryRef.current && scrollAreaRef.current) {
      // Small timeout to ensure DOM has updated after navigation
      const timeoutId = setTimeout(() => {
        const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        const selectedElement = selectedCategoryRef.current;

        if (scrollContainer && selectedElement) {
          const containerRect = scrollContainer.getBoundingClientRect();
          const elementRect = selectedElement.getBoundingClientRect();

          // Check if element is outside the visible area
          const isAboveView = elementRect.top < containerRect.top;
          const isBelowView = elementRect.bottom > containerRect.bottom;

          if (isAboveView || isBelowView) {
            // Calculate scroll position to center the element
            const scrollTop = selectedElement.offsetTop - scrollContainer.clientHeight / 2 + selectedElement.clientHeight / 2;
            scrollContainer.scrollTo({
              top: Math.max(0, scrollTop),
              behavior: 'smooth'
            });
          }
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [selectedCategoryId]);

  return (
    <div className="w-70 border-r bg-muted/30 flex flex-col h-full overflow-x-auto">
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
      <ScrollArea ref={scrollAreaRef} className="flex-1 overflow-y-auto overflow-x-auto">
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
          <div className="p-2 space-y-1 overflow-x-auto">
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
                    ref={isSelected ? selectedCategoryRef : undefined}
                    onClick={() => handleCategoryClick(categoryId)}
                    className="w-full p-3 flex items-start gap-3 text-left"
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
                    <div className="flex-1 min-w-0 pr-8">
                      <div className="font-medium text-sm leading-tight line-clamp-2 break-words">
                        {category.name}
                      </div>
                      {category.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1 mt-1 break-words">
                          {category.description}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span
                          className={cn(
                            'text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap',
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
