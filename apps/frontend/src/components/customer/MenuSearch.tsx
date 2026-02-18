import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface FilterOptions {
  vegetarian: boolean;
  nonVegetarian: boolean;
  spicy: boolean;
  popular: boolean;
  quickPrep: boolean;
}

interface MenuSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  className?: string;
}

const filterLabels = {
  vegetarian: { label: 'Vegetarian', emoji: '🌱' },
  nonVegetarian: { label: 'Non-Vegetarian', emoji: '🍖' },
  spicy: { label: 'Spicy', emoji: '🌶️' },
  popular: { label: 'Popular', emoji: '⭐' },
  quickPrep: { label: 'Quick Prep', emoji: '⚡' },
};

export function MenuSearch({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  className,
}: MenuSearchProps) {
  const [filterOpen, setFilterOpen] = useState(false);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const handleFilterChange = (key: keyof FilterOptions, checked: boolean) => {
    onFiltersChange({
      ...filters,
      [key]: checked,
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      vegetarian: false,
      nonVegetarian: false,
      spicy: false,
      popular: false,
      quickPrep: false,
    });
  };

  const getActiveFilterBadges = () => {
    return Object.entries(filters)
      .filter(([_, active]) => active)
      .map(([key, _]) => ({
        key: key as keyof FilterOptions,
        ...filterLabels[key as keyof FilterOptions],
      }));
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Search and Filter Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search for dishes, ingredients..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-4"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSearchChange('')}
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0 hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'relative',
                activeFilterCount > 0 && 'border-primary bg-primary/5'
              )}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filter
              {activeFilterCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-2 h-5 w-5 rounded-full p-0 text-xs"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filter Options</h4>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear all
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                {Object.entries(filterLabels).map(([key, { label, emoji }]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={key}
                      checked={filters[key as keyof FilterOptions]}
                      onCheckedChange={(checked) =>
                        handleFilterChange(
                          key as keyof FilterOptions,
                          checked as boolean
                        )
                      }
                    />
                    <Label
                      htmlFor={key}
                      className="text-sm font-normal cursor-pointer flex items-center gap-2"
                    >
                      <span>{emoji}</span>
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filter Badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {getActiveFilterBadges().map(({ key, label, emoji }) => (
            <Badge
              key={key}
              variant="secondary"
              className="text-xs flex items-center gap-1 cursor-pointer hover:bg-secondary/80"
              onClick={() => handleFilterChange(key, false)}
            >
              <span>{emoji}</span>
              {label}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
