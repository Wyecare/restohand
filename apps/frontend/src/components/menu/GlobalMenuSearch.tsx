import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, ShoppingBag, Tag, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useDebounce } from '@/hooks/use-debounce';
import { useSearchMenuByBranchQuery, type MenuSearchResultItem } from '@/store/api/restaurantsApi';
import { useJwtAuth } from '@/contexts/JwtAuthProvider';
import { useBranchContext } from '@/contexts/BranchContext';
import { skipToken } from '@reduxjs/toolkit/query/react';
import { cn } from '@/lib/utils';

interface GlobalMenuSearchProps {
  onResultSelect?: (result: MenuSearchResultItem) => void;
  placeholder?: string;
  className?: string;
}

export function GlobalMenuSearch({
  onResultSelect,
  placeholder = "Search menu items and categories...",
  className
}: GlobalMenuSearchProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useJwtAuth();
  const { currentBranch } = useBranchContext();

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  const restaurantId = user?.restaurantId;
  const branchId = currentBranch?._id;

  const searchParams = useMemo(() => {
    if (!restaurantId || !branchId || !debouncedQuery.trim() || debouncedQuery.trim().length < 1) {
      return skipToken;
    }
    return {
      restaurantId,
      branchId,
      query: debouncedQuery.trim(),
      limit: 10,
    };
  }, [restaurantId, branchId, debouncedQuery]);

  const {
    data: searchResults,
    isLoading,
    error
  } = useSearchMenuByBranchQuery(searchParams);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!isOpen || !searchResults?.results.length) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex(prev =>
            prev < searchResults.results.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex(prev =>
            prev > 0 ? prev - 1 : searchResults.results.length - 1
          );
          break;
        case 'Enter':
          event.preventDefault();
          if (selectedIndex >= 0) {
            handleResultClick(searchResults.results[selectedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSelectedIndex(-1);
          inputRef.current?.blur();
          break;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchResults, selectedIndex]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(value.length > 0);
    setSelectedIndex(-1);
  };

  const handleResultClick = (result: MenuSearchResultItem) => {
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(-1);

    // Handle custom callback
    if (onResultSelect) {
      onResultSelect(result);
      return;
    }

    // Default navigation logic
    if (result.type === 'category') {
      navigate(`/menu/items/categories/${result.id}`);
    } else if (result.type === 'item') {
      // Navigate to the item's category and highlight the item
      if (result.categoryId) {
        navigate(`/menu/items/categories/${result.categoryId}?highlight=${result.id}`);
      } else {
        toast({
          variant: 'destructive',
          title: 'Navigation Error',
          description: 'Unable to navigate to item location',
        });
      }
    }
  };

  const handleFocus = () => {
    if (query.length > 0) {
      setIsOpen(true);
    }
  };

  const formatPrice = (pricing?: { amount: number; currency: string }) => {
    if (!pricing) return '';
    const symbol = pricing.currency === 'INR' ? '₹' : '$';
    return `${symbol}${pricing.amount}`;
  };

  const getResultIcon = (result: MenuSearchResultItem) => {
    if (result.type === 'category') {
      return <Tag className="h-4 w-4 text-blue-500" />;
    }
    return <ShoppingBag className="h-4 w-4 text-green-500" />;
  };

  const showResults = isOpen && (searchResults?.results.length || isLoading || error);

  return (
    <div ref={searchRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          ref={inputRef}
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          className="pl-10 pr-4 h-10"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Results Dropdown */}
      {showResults && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 shadow-lg border">
          <CardContent className="p-0 max-h-96 overflow-y-auto">
            {isLoading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Searching...</span>
              </div>
            )}

            {error && (
              <div className="p-4 text-center">
                <p className="text-sm text-destructive">
                  Search failed. Please try again.
                </p>
              </div>
            )}

            {searchResults && (
              <>
                {/* Search Stats */}
                <div className="p-3 border-b bg-muted/30">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {searchResults.totalResults} result{searchResults.totalResults !== 1 ? 's' : ''}
                      {searchResults.categoriesFound > 0 && ` (${searchResults.categoriesFound} categories, ${searchResults.itemsFound} items)`}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {searchResults.searchTime}ms
                    </span>
                  </div>
                </div>

                {/* Results */}
                {searchResults.results.length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      No results found for "{searchResults.query}"
                    </p>
                  </div>
                ) : (
                  <div className="py-2">
                    {searchResults.results.map((result, index) => (
                      <Button
                        key={`${result.type}-${result.id}`}
                        variant="ghost"
                        className={cn(
                          "w-full justify-start h-auto p-3 hover:bg-muted/50",
                          selectedIndex === index && "bg-muted"
                        )}
                        onClick={() => handleResultClick(result)}
                      >
                        <div className="flex items-start gap-3 w-full">
                          <div className="mt-0.5">
                            {getResultIcon(result)}
                          </div>

                          <div className="flex-1 text-left min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium truncate">
                                {result.name}
                              </span>
                              <Badge
                                variant={result.type === 'category' ? 'secondary' : 'outline'}
                                className="text-xs"
                              >
                                {result.type === 'category' ? 'Category' : 'Item'}
                              </Badge>
                            </div>

                            {result.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1 mb-1">
                                {result.description}
                              </p>
                            )}

                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {result.categoryName && result.type === 'item' && (
                                <span>in {result.categoryName}</span>
                              )}
                              {result.pricing && (
                                <span className="font-medium text-green-600">
                                  {formatPrice(result.pricing)}
                                </span>
                              )}
                              {result.isAvailable === false && (
                                <Badge variant="destructive" className="text-xs">
                                  Unavailable
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}