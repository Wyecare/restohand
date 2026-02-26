import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Search, Leaf } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MenuItem, MenuCategory } from '@/store/api/types';

interface MenuGridProps {
  categories: MenuCategory[];
  items: MenuItem[];
  isLoading: boolean;
  onSelectItem: (item: MenuItem) => void;
}

export function MenuGrid({ categories, items, isLoading, onSelectItem }: MenuGridProps) {
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [search, setSearch] = React.useState('');

  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      if (!item.isAvailable) return false;
      if (selectedCategory !== 'all' && item.categoryId !== selectedCategory) return false;
      if (search) {
        const q = search.toLowerCase();
        return item.name.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [items, selectedCategory, search]);

  const sortedCategories = React.useMemo(
    () => categories.filter((c) => c.isActive).sort((a, b) => a.displayOrder - b.displayOrder),
    [categories],
  );

  const isVeg = (item: MenuItem) => item.tags?.includes('vegetarian') || item.tags?.includes('veg');

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-4 pt-3 pb-2 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Category Strip — square tiles */}
      <div className="flex gap-3 px-4 pb-3 overflow-x-auto scrollbar-none flex-shrink-0">
        {/* All */}
        <button
          onClick={() => setSelectedCategory('all')}
          className="flex flex-col items-center gap-1.5 flex-shrink-0"
        >
          <div
            className={cn(
              'w-16 h-16 rounded-xl flex items-center justify-center text-2xl border-2 transition-all',
              selectedCategory === 'all'
                ? 'border-primary ring-2 ring-primary/20 bg-primary/10'
                : 'border-border bg-muted/40 hover:border-primary/40',
            )}
          >
            🍽️
          </div>
          <span
            className={cn(
              'text-xs font-medium text-center leading-tight max-w-[64px] line-clamp-2',
              selectedCategory === 'all' ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            All
          </span>
        </button>

        {sortedCategories.map((cat) => {
          const imageUrl = (cat as any).imageUrl as string | undefined;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0"
            >
              <div
                className={cn(
                  'w-16 h-16 rounded-xl overflow-hidden border-2 transition-all',
                  isSelected
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/40',
                )}
              >
                {imageUrl ? (
                  <img src={imageUrl} alt={cat.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center">
                    <span className="text-xl font-bold text-muted-foreground/60">
                      {cat.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <span
                className={cn(
                  'text-xs font-medium text-center leading-tight max-w-[64px] line-clamp-2',
                  isSelected ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Items Grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {isLoading ? (
          <div className="grid grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-muted/30 aspect-[3/4] animate-pulse" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
            <Search className="h-8 w-8 opacity-30" />
            <p className="text-sm">No items found</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
            {filteredItems
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((item) => {
                const firstImage = item.imageUrls?.[0];
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectItem(item)}
                    className="group rounded-xl border bg-card hover:border-primary hover:shadow-md active:scale-[0.98] transition-all text-left overflow-hidden flex flex-col"
                  >
                    {/* Square image area */}
                    <div className="aspect-square w-full relative overflow-hidden bg-muted">
                      {firstImage ? (
                        <img
                          src={firstImage}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-muted to-muted/40 flex items-center justify-center">
                          <span className="text-3xl font-bold text-muted-foreground/30 select-none">
                            {item.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      {/* Veg indicator */}
                      {isVeg(item) && (
                        <div className="absolute top-1.5 left-1.5 bg-white/90 rounded-full p-0.5 shadow-sm">
                          <Leaf className="h-3 w-3 text-green-600" />
                        </div>
                      )}
                    </div>

                    {/* Name + price */}
                    <div className="p-2 flex-1 flex flex-col justify-between">
                      <p className="text-xs font-medium leading-tight line-clamp-2 text-foreground">
                        {item.name}
                      </p>
                      <p className="text-sm font-bold text-primary mt-1">
                        ₹{item.pricing.amount}
                      </p>
                    </div>
                  </button>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
