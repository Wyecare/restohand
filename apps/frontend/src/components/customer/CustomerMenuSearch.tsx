import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  Loader2,
  ShoppingBag,
  Tag,
  Clock,
  X,
  TrendingUp,
} from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import {
  useSearchPublicMenuBySlugQuery,
  type MenuSearchResultItem,
} from '@/store/api/restaurantsApi';
import { skipToken } from '@reduxjs/toolkit/query/react';
import { motion, AnimatePresence } from 'framer-motion';

const searchStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  .elegant-search-container {
    position: relative;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  /* Search Input */
  .elegant-search-input-wrap {
    position: relative;
  }

  .elegant-search-input {
    width: 100%;
    height: 48px;
    padding: 0 48px 0 48px;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    background: white;
    font-size: 15px;
    font-family: inherit;
    color: #1a1a1a;
    outline: none;
    transition: all 0.2s;
  }

  .elegant-search-input:focus {
    border-color: #0f172a;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.1);
  }

  .elegant-search-input::placeholder {
    color: #9ca3af;
  }

  .elegant-search-icon {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    color: #6b7280;
    pointer-events: none;
  }

  .elegant-search-action {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6b7280;
    transition: all 0.2s;
  }

  .elegant-search-action:hover {
    background: #f3f4f6;
    color: #1a1a1a;
  }

  /* Results Dropdown */
  .elegant-search-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    z-index: 50;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
    max-height: 480px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* Stats Header */
  .elegant-search-stats {
    padding: 14px 18px;
    background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }

  .elegant-search-stats-text {
    font-size: 13px;
    font-weight: 600;
    color: #6b7280;
  }

  .elegant-search-stats-time {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #9ca3af;
  }

  /* Results List */
  .elegant-search-results {
    overflow-y: auto;
    flex: 1;
  }

  .elegant-search-result-item {
    width: 100%;
    text-align: left;
    padding: 14px 18px;
    border: none;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: flex-start;
    gap: 14px;
    transition: all 0.15s;
    border-bottom: 1px solid #f3f4f6;
  }

  .elegant-search-result-item:last-child {
    border-bottom: none;
  }

  .elegant-search-result-item:hover,
  .elegant-search-result-item.selected {
    background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
  }

  .elegant-search-result-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .elegant-search-result-icon.category {
    background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
    color: #1e40af;
  }

  .elegant-search-result-icon.item {
    background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
    color: #047857;
  }

  .elegant-search-result-content {
    flex: 1;
    min-width: 0;
  }

  .elegant-search-result-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  .elegant-search-result-name {
    font-size: 15px;
    font-weight: 600;
    color: #1a1a1a;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .elegant-search-result-name mark {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    color: #92400e;
    padding: 2px 4px;
    border-radius: 4px;
    font-weight: 700;
  }

  .elegant-search-result-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    flex-shrink: 0;
  }

  .elegant-search-result-badge.category {
    background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
    color: #1e40af;
  }

  .elegant-search-result-badge.item {
    background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
    color: #047857;
  }

  .elegant-search-result-desc {
    font-size: 13px;
    color: #6b7280;
    line-height: 1.4;
    margin: 0 0 6px 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .elegant-search-result-desc mark {
    background: #fef3c7;
    color: #92400e;
    padding: 1px 3px;
    border-radius: 3px;
    font-weight: 600;
  }

  .elegant-search-result-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    color: #9ca3af;
  }

  .elegant-search-result-category {
    font-weight: 500;
    color: #6b7280;
  }

  .elegant-search-result-price {
    font-weight: 700;
    font-family: 'Inter', monospace;
    color: #059669;
  }

  .elegant-search-result-unavailable {
    font-size: 10px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 6px;
    background: #fef2f2;
    color: #dc2626;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  /* Loading State */
  .elegant-search-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px;
    gap: 12px;
  }

  .elegant-search-loading-text {
    font-size: 14px;
    color: #6b7280;
    font-weight: 500;
  }

  /* Empty State */
  .elegant-search-empty {
    padding: 32px;
    text-align: center;
  }

  .elegant-search-empty-icon {
    font-size: 48px;
    margin-bottom: 12px;
  }

  .elegant-search-empty-text {
    font-size: 15px;
    color: #6b7280;
    font-weight: 500;
  }

  .elegant-search-empty-query {
    font-weight: 700;
    color: #1a1a1a;
  }

  /* Error State */
  .elegant-search-error {
    padding: 24px;
    text-align: center;
  }

  .elegant-search-error-text {
    font-size: 14px;
    color: #dc2626;
    font-weight: 500;
  }
`;

// Inject styles
if (
  typeof document !== 'undefined' &&
  !document.getElementById('elegant-search-styles')
) {
  const style = document.createElement('style');
  style.id = 'elegant-search-styles';
  style.textContent = searchStyles;
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
  placeholder = 'Search dishes, categories...',
  className,
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
    error,
  } = useSearchPublicMenuBySlugQuery(searchParams);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
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
          setSelectedIndex((prev) =>
            prev < searchResults.results.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex((prev) =>
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

    if (onResultSelect) {
      onResultSelect(result);
      return;
    }

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

  const showResults =
    isOpen && (searchResults?.results.length || isLoading || error);

  return (
    <div
      ref={searchRef}
      className={`elegant-search-container ${className || ''}`}
    >
      {/* Search Input */}
      <div className="elegant-search-input-wrap">
        <Search size={20} className="elegant-search-icon" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          className="elegant-search-input"
        />

        {isLoading && (
          <div className="elegant-search-action">
            <Loader2 size={18} className="animate-spin" />
          </div>
        )}

        {query && !isLoading && (
          <button className="elegant-search-action" onClick={handleClear}>
            <X size={18} />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="elegant-search-dropdown"
          >
            {isLoading && (
              <div className="elegant-search-loading">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                <p className="elegant-search-loading-text">Searching menu...</p>
              </div>
            )}

            {error && (
              <div className="elegant-search-error">
                <p className="elegant-search-error-text">
                  Search failed. Please try again.
                </p>
              </div>
            )}

            {searchResults && (
              <>
                {/* Stats Header */}
                <div className="elegant-search-stats">
                  <span className="elegant-search-stats-text">
                    {searchResults.totalResults} result
                    {searchResults.totalResults !== 1 ? 's' : ''}
                    {searchResults.categoriesFound > 0 &&
                      ` • ${searchResults.categoriesFound} categories, ${searchResults.itemsFound} items`}
                  </span>
                  <div className="elegant-search-stats-time">
                    <Clock className="h-3 w-3" />
                    {searchResults.searchTime}ms
                  </div>
                </div>

                {/* Results or Empty */}
                {searchResults.results.length === 0 ? (
                  <div className="elegant-search-empty">
                    <div className="elegant-search-empty-icon">🔍</div>
                    <p className="elegant-search-empty-text">
                      No results for{' '}
                      <span className="elegant-search-empty-query">
                        "{searchResults.query}"
                      </span>
                    </p>
                  </div>
                ) : (
                  <div className="elegant-search-results">
                    {searchResults.results.map((result, index) => (
                      <motion.button
                        key={`${result.type}-${result.id}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => handleResultClick(result)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`elegant-search-result-item ${
                          selectedIndex === index ? 'selected' : ''
                        }`}
                      >
                        <div
                          className={`elegant-search-result-icon ${result.type}`}
                        >
                          {result.type === 'category' ? (
                            <Tag className="w-5 h-5" />
                          ) : (
                            <ShoppingBag className="w-5 h-5" />
                          )}
                        </div>

                        <div className="elegant-search-result-content">
                          <div className="elegant-search-result-header">
                            <div
                              className="elegant-search-result-name"
                              dangerouslySetInnerHTML={{
                                __html: result.highlightedName || result.name,
                              }}
                            />
                            <span
                              className={`elegant-search-result-badge ${result.type}`}
                            >
                              {result.type}
                            </span>
                          </div>

                          {result.description && (
                            <p
                              className="elegant-search-result-desc"
                              dangerouslySetInnerHTML={{
                                __html:
                                  result.highlightedDescription ||
                                  result.description,
                              }}
                            />
                          )}

                          <div className="elegant-search-result-meta">
                            {result.categoryName && result.type === 'item' && (
                              <span className="elegant-search-result-category">
                                in {result.categoryName}
                              </span>
                            )}
                            {result.pricing && (
                              <span className="elegant-search-result-price">
                                {formatPrice(result.pricing)}
                              </span>
                            )}
                            {result.isAvailable === false && (
                              <span className="elegant-search-result-unavailable">
                                Unavailable
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.button>
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
