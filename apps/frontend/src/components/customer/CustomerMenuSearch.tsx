import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Loader2, ShoppingBag, Tag, Clock, X } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { useSearchPublicMenuBySlugQuery, type MenuSearchResultItem } from '@/store/api/restaurantsApi';
import { skipToken } from '@reduxjs/toolkit/query/react';
import { motion, AnimatePresence } from 'framer-motion';

// Add styles for highlighted search results
const searchHighlightStyles = `
  .customer-menu-search mark {
    background-color: #fef3c7;
    color: #92400e;
    padding: 1px 2px;
    border-radius: 2px;
    font-weight: 600;
  }
`;

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('customer-menu-search-styles')) {
  const style = document.createElement('style');
  style.id = 'customer-menu-search-styles';
  style.textContent = searchHighlightStyles;
  document.head.appendChild(style);
}

interface CustomerMenuSearchProps {
  slug: string;
  tableId?: string;
  table?: string;
  onResultSelect?: (result: MenuSearchResultItem) => void;
  onCategorySelect?: (categoryId: string) => void;
  onItemHighlight?: (itemId: string, categoryId: string) => void;
  placeholder?: string;
  className?: string;
}

export function CustomerMenuSearch({
  slug,
  tableId,
  table,
  onResultSelect,
  onCategorySelect,
  onItemHighlight,
  placeholder = "Search menu...",
  className
}: CustomerMenuSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  const searchParams = useMemo(() => {
    if (!slug || !debouncedQuery.trim() || debouncedQuery.trim().length < 1) {
      return skipToken;
    }
    return {
      slug,
      query: debouncedQuery.trim(),
      ...(table && { table }),
      ...(tableId && { tableId }),
      limit: 10,
    };
  }, [slug, debouncedQuery, table, tableId]);

  const {
    data: searchResults,
    isLoading,
    error
  } = useSearchPublicMenuBySlugQuery(searchParams);

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

    // Default customer menu behavior
    if (result.type === 'category') {
      onCategorySelect?.(result.id);
    } else if (result.type === 'item') {
      if (result.categoryId) {
        onItemHighlight?.(result.id, result.categoryId);
      }
    }
  };

  const handleFocus = () => {
    if (query.length > 0) {
      setIsOpen(true);
    }
  };

  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
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
    <div ref={searchRef} className="rh-search-bar-wrap customer-menu-search" style={{ position: 'relative', marginBottom: 0 }}>
      <Search size={16} className="rh-search-icon" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        className="rh-search-input"
      />

      {/* Loading indicator */}
      {isLoading && (
        <div className="rh-search-clear">
          <Loader2 size={14} className="animate-spin" />
        </div>
      )}

      {/* Clear button */}
      {query && !isLoading && (
        <button className="rh-search-clear" onClick={handleClear}>
          <X size={14} />
        </button>
      )}

      {/* Results Dropdown */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 50,
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              maxHeight: '400px',
              overflowY: 'auto',
              marginTop: '4px'
            }}
          >
            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span style={{ fontSize: '14px', color: '#6b7280' }}>Searching...</span>
              </div>
            )}

            {error && (
              <div style={{ padding: '16px', textAlign: 'center' }}>
                <p style={{ fontSize: '14px', color: '#dc2626' }}>
                  Search failed. Please try again.
                </p>
              </div>
            )}

            {searchResults && (
              <>
                {/* Search Stats */}
                <div style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #f3f4f6',
                  background: '#f9fafb'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    color: '#6b7280'
                  }}>
                    <span>
                      {searchResults.totalResults} result{searchResults.totalResults !== 1 ? 's' : ''}
                      {searchResults.categoriesFound > 0 && ` (${searchResults.categoriesFound} categories, ${searchResults.itemsFound} items)`}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock className="h-3 w-3" />
                      {searchResults.searchTime}ms
                    </span>
                  </div>
                </div>

                {/* Results */}
                {searchResults.results.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center' }}>
                    <p style={{ fontSize: '14px', color: '#6b7280' }}>
                      No results found for "{searchResults.query}"
                    </p>
                  </div>
                ) : (
                  <div style={{ padding: '8px 0' }}>
                    {searchResults.results.map((result, index) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleResultClick(result)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '12px 16px',
                          border: 'none',
                          background: selectedIndex === index ? '#f3f4f6' : 'transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          transition: 'background-color 0.15s'
                        }}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        <div style={{ marginTop: '2px' }}>
                          {getResultIcon(result)}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{
                              fontSize: '14px',
                              fontWeight: 600,
                              color: '#111827',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {result.highlightedName ? (
                                <span dangerouslySetInnerHTML={{ __html: result.highlightedName }} />
                              ) : (
                                result.name
                              )}
                            </span>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '2px 6px',
                              borderRadius: '12px',
                              background: result.type === 'category' ? '#dbeafe' : '#f0fdf4',
                              color: result.type === 'category' ? '#1e40af' : '#166534'
                            }}>
                              {result.type === 'category' ? 'Category' : 'Item'}
                            </span>
                          </div>

                          {result.description && (
                            <p style={{
                              fontSize: '13px',
                              color: '#6b7280',
                              margin: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              marginBottom: '4px'
                            }}>
                              {result.highlightedDescription ? (
                                <span dangerouslySetInnerHTML={{ __html: result.highlightedDescription }} />
                              ) : (
                                result.description
                              )}
                            </p>
                          )}

                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '12px',
                            color: '#6b7280'
                          }}>
                            {result.categoryName && result.type === 'item' && (
                              <span>in {result.categoryName}</span>
                            )}
                            {result.pricing && (
                              <span style={{ fontWeight: 600, color: '#059669' }}>
                                {formatPrice(result.pricing)}
                              </span>
                            )}
                            {result.isAvailable === false && (
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                padding: '2px 6px',
                                borderRadius: '8px',
                                background: '#fef2f2',
                                color: '#dc2626'
                              }}>
                                Unavailable
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}