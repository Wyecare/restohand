import { useMemo, useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/components/ui/use-toast';
import {
  useGetPublicMenuQuery,
  useCreateCustomerSessionMutation,
  useCreatePublicOrderMutation,
} from '@/store/api/restaurantsApi';
import { useAddItemsToOrderMutation } from '@/store/api/ordersApi';
import { useOrdersSocket } from '@/hooks/useOrdersSocket';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Plus,
  Minus,
  Search,
  X,
  Sparkles,
  ShoppingBag,
  Receipt,
  RefreshCcw,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { MenuItemPricing, PublicMenuCategory } from '@/store/api/types';
import { formatCurrency } from '@/lib/billing';
import { CallWaiterButton } from '@/components/customer/CallWaiterButton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type DisplayCategory = {
  id: string;
  name: string;
  icon: {
    symbol: string;
    label: string;
  };
};

type AugmentedMenuItem = PublicMenuCategory['items'][number] & {
  _categoryId: string;
  _categoryName: string;
  _isVegetarian: boolean;
  _isSpicy: boolean;
  _isPopular: boolean;
  _isQuick: boolean;
};

/* ── Styles ── */
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');

  .rh-menu-root {
    --clr-bg:        #f0ede8;
    --clr-paper:     #faf9f7;
    --clr-border:    #e2ddd6;
    --clr-text:      #1a1a1a;
    --clr-muted:     #7a756e;
    --clr-accent:    #1a1a1a;
    --clr-primary:   #1a1a1a;
    --clr-primary-fg:#fff;
    font-family: 'DM Sans', system-ui, sans-serif;
    background: var(--clr-bg);
    min-height: 100vh;
    padding-bottom: 140px;
  }

  /* ── header ── */
  .rh-menu-header {
    position: sticky;
    top: 0;
    z-index: 30;
    background: rgba(250, 249, 247, 0.97);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--clr-border);
  }
  .rh-menu-header-inner {
    max-width: 640px;
    margin: 0 auto;
    padding: 14px 16px;
  }
  .rh-menu-top-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
  }
  .rh-menu-title-area {
    flex: 1;
  }
  .rh-menu-title {
    font-size: 22px;
    font-weight: 600;
    color: var(--clr-text);
    letter-spacing: -0.3px;
    margin: 0 0 2px;
  }
  .rh-menu-subtitle {
    font-size: 12px;
    color: var(--clr-muted);
    margin: 0;
  }
  .rh-search-toggle {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--clr-paper);
    border: 1px solid var(--clr-border);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.15s;
  }
  .rh-search-toggle:hover {
    background: #f5f3f0;
  }

  /* ── search bar ── */
  .rh-search-bar-wrap {
    position: relative;
    margin-bottom: 10px;
  }
  .rh-search-input {
    width: 100%;
    height: 40px;
    padding-left: 38px;
    padding-right: 38px;
    border: 1px solid var(--clr-border);
    border-radius: 8px;
    background: var(--clr-paper);
    font-size: 14px;
    font-family: inherit;
    color: var(--clr-text);
    outline: none;
  }
  .rh-search-input:focus {
    border-color: #a89f95;
  }
  .rh-search-input::placeholder {
    color: #b5b0a8;
  }
  .rh-search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--clr-muted);
  }
  .rh-search-clear {
    position: absolute;
    right: 6px;
    top: 50%;
    transform: translateY(-50%);
    width: 28px;
    height: 28px;
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--clr-muted);
    border-radius: 6px;
    transition: background 0.15s;
  }
  .rh-search-clear:hover {
    background: #ebe8e3;
  }

  /* ── banner (session / order) ── */
  .rh-banner {
    background: var(--clr-paper);
    border: 1px solid var(--clr-border);
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .rh-banner-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .rh-banner-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #16a34a;
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  .rh-banner-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--clr-text);
  }
  .rh-banner-meta {
    font-size: 11px;
    color: var(--clr-muted);
    margin-left: 6px;
  }
  .rh-banner-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 5px 10px;
    font-size: 11px;
    font-weight: 500;
    background: #f5f3f0;
    color: var(--clr-text);
    border: 1px solid var(--clr-border);
    border-radius: 6px;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s;
  }
  .rh-banner-btn:hover {
    background: #ebe8e3;
  }

  /* ── categories ── */
  .rh-categories-wrap {
    border-top: 1px solid var(--clr-border);
    padding-top: 10px;
    padding-bottom: 4px;
  }
  .rh-category-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    font-size: 13px;
    font-weight: 500;
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
    border: 1px solid var(--clr-border);
    background: var(--clr-paper);
    color: var(--clr-text);
  }
  .rh-category-pill.active {
    background: var(--clr-primary);
    color: var(--clr-primary-fg);
    border-color: var(--clr-primary);
  }
  .rh-category-pill:hover:not(.active) {
    background: #f5f3f0;
  }

  /* ── menu grid ── */
  .rh-menu-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    max-width: 640px;
    margin: 0 auto;
    padding: 0 16px;
  }

  /* ── menu item card ── */
  .rh-item-card {
    background: var(--clr-paper);
    border: 1px solid var(--clr-border);
    border-radius: 10px;
    padding: 8px;
    display: flex;
    flex-direction: column;
    transition: all 0.15s;
  }
  .rh-item-card:hover {
    border-color: #b5b0a8;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }

  /* ── item image ── */
  .rh-item-image-wrap {
    position: relative;
    width: 100%;
    aspect-ratio: 1;
    border-radius: 8px;
    overflow: hidden;
    background: linear-gradient(135deg, #f0ede8, #e8e4df);
    margin-bottom: 8px;
  }
  .rh-item-image {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .rh-item-placeholder {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 36px;
    opacity: 0.3;
  }
  .rh-item-popular-badge {
    position: absolute;
    top: 6px;
    right: 6px;
    background: #facc15;
    border-radius: 50%;
    padding: 4px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.15);
  }
  .rh-item-tags {
    position: absolute;
    bottom: 6px;
    left: 6px;
    display: flex;
    gap: 4px;
  }
  .rh-item-tag {
    background: rgba(255,255,255,0.95);
    backdrop-filter: blur(4px);
    border-radius: 4px;
    padding: 2px 5px;
    font-size: 11px;
  }

  /* ── item details ── */
  .rh-item-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 0 4px;
  }
  .rh-item-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--clr-text);
    line-height: 1.3;
    margin: 0 0 6px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .rh-item-price {
    font-size: 15px;
    font-weight: 600;
    color: var(--clr-text);
    font-family: 'DM Mono', monospace;
    margin-bottom: 8px;
  }

  /* ── add button / quantity controls ── */
  .rh-add-btn {
    width: 100%;
    height: 30px;
    border-radius: 15px;
    background: var(--clr-primary);
    color: var(--clr-primary-fg);
    border: none;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s;
  }
  .rh-add-btn:hover {
    background: #333;
  }
  .rh-qty-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: var(--clr-primary);
    border-radius: 15px;
    padding: 4px 6px;
    height: 30px;
  }
  .rh-qty-btn {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: rgba(255,255,255,0.2);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--clr-primary-fg);
    transition: background 0.15s;
  }
  .rh-qty-btn:hover {
    background: rgba(255,255,255,0.3);
  }
  .rh-qty-value {
    min-width: 20px;
    text-align: center;
    font-weight: 600;
    font-size: 13px;
    color: var(--clr-primary-fg);
  }

  /* ── floating cart ── */
  .rh-floating-cart {
    position: fixed;
    bottom: 20px;
    left: 16px;
    right: 16px;
    z-index: 40;
  }
  .rh-floating-cart-inner {
    max-width: 640px;
    margin: 0 auto;
    background: var(--clr-paper);
    border: 2px solid var(--clr-primary);
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  }
  .rh-cart-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .rh-cart-info h4 {
    font-size: 16px;
    font-weight: 600;
    color: var(--clr-text);
    margin: 0 0 3px;
  }
  .rh-cart-info p {
    font-size: 13px;
    color: var(--clr-muted);
    margin: 0;
  }
  .rh-cart-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 11px 20px;
    font-size: 14px;
    font-weight: 600;
    background: var(--clr-primary);
    color: var(--clr-primary-fg);
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s;
  }
  .rh-cart-btn:hover {
    background: #333;
  }
  .rh-cart-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* ── empty state ── */
  .rh-empty-state {
    text-align: center;
    padding: 64px 32px;
  }
  .rh-empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
  }
  .rh-empty-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--clr-text);
    margin: 0 0 8px;
  }
  .rh-empty-desc {
    font-size: 14px;
    color: var(--clr-muted);
    margin: 0 0 16px;
  }
  .rh-empty-btn {
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 500;
    background: var(--clr-paper);
    color: var(--clr-text);
    border: 1px solid var(--clr-border);
    border-radius: 8px;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s;
  }
  .rh-empty-btn:hover {
    background: #f5f3f0;
  }

  /* ── loading / error screens ── */
  .rh-loading-screen, .rh-error-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    text-align: center;
    padding: 32px;
  }
  .rh-loading-screen img {
    width: 192px;
    height: 192px;
    border-radius: 16px;
    margin-bottom: 16px;
  }
  .rh-loading-screen p {
    font-size: 14px;
    color: var(--clr-muted);
  }
  .rh-error-icon {
    font-size: 64px;
    margin-bottom: 16px;
  }
  .rh-error-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--clr-text);
    margin: 0 0 8px;
  }
  .rh-error-desc {
    font-size: 14px;
    color: var(--clr-muted);
    margin: 0 0 20px;
  }
  .rh-error-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    font-size: 14px;
    font-weight: 500;
    background: var(--clr-paper);
    color: var(--clr-text);
    border: 1px solid var(--clr-border);
    border-radius: 8px;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s;
  }
  .rh-error-btn:hover {
    background: #f5f3f0;
  }
`;

const AccessibleEmoji = ({
  symbol,
  label,
  className,
}: {
  symbol: string;
  label: string;
  className?: string;
}) => (
  <span role="img" aria-label={label} className={className}>
    {symbol}
  </span>
);

const determineCategoryIcon = (name: string): DisplayCategory['icon'] => {
  const lower = name.toLowerCase();
  if (lower.includes('drink') || lower.includes('beverage')) {
    return { symbol: '🥤', label: `${name} category` };
  }
  if (lower.includes('dessert') || lower.includes('sweet')) {
    return { symbol: '🍨', label: `${name} category` };
  }
  if (lower.includes('starter') || lower.includes('snack')) {
    return { symbol: '🥟', label: `${name} category` };
  }
  if (lower.includes('veg') || lower.includes('vegetarian')) {
    return { symbol: '🥦', label: `${name} category` };
  }
  if (lower.includes('non-veg') || lower.includes('meat')) {
    return { symbol: '🍗', label: `${name} category` };
  }
  return { symbol: '🍴', label: `${name} category` };
};

export default function CustomerMenuPageNew() {
  const params = useParams<{ slug: string; tableId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { slug, tableId } = params;
  const tableFromUrl = searchParams.get('table');
  const tableIdFromUrl = searchParams.get('tableId') || tableId;

  const [createCustomerSession] = useCreateCustomerSessionMutation();

  const STORAGE_KEY = 'customerSession';

  const getStoredSession = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  const storeSession = (sessionData: {
    sessionId: string;
    restaurantId: string;
    restaurantName: string;
    restaurantSlug: string;
    tableId: string;
    tableNumber: string;
    expiresAt: string;
    createdAt: string;
  }) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
    } catch (error) {
      console.error('Failed to store session:', error);
    }
  };

  const clearSession = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  };

  useEffect(() => {
    const initializeSession = async () => {
      if (!slug || !tableIdFromUrl) return;

      const storedSession = getStoredSession();
      if (
        storedSession?.tableId === tableIdFromUrl &&
        storedSession?.restaurantSlug === slug
      ) {
        const expiresAt = new Date(storedSession.expiresAt);
        if (expiresAt > new Date()) {
          console.log('Using existing session:', storedSession.sessionId);
          return;
        }
      }

      try {
        console.log('Creating new customer session for table:', tableIdFromUrl);
        const sessionResponse = await createCustomerSession({
          slug: slug!,
          tableId: tableIdFromUrl,
        }).unwrap();

        const sessionData = {
          sessionId: sessionResponse.sessionId,
          restaurantId: sessionResponse.restaurant.id,
          restaurantName: sessionResponse.restaurant.name,
          restaurantSlug: sessionResponse.restaurant.slug,
          tableId: sessionResponse.table.id,
          tableNumber: sessionResponse.table.tableNumber,
          expiresAt: sessionResponse.expiresAt,
          createdAt: new Date().toISOString(),
        };

        storeSession(sessionData);

        toast({
          title: 'Welcome! 👋',
          description: `Session created for ${sessionResponse.restaurant.name} - ${sessionResponse.table.tableNumber}`,
        });

        console.log('Customer session created:', sessionResponse.sessionId);
      } catch (error) {
        console.error('Failed to create customer session:', error);
        toast({
          title: 'Session Error',
          description:
            'Failed to create customer session. You can still browse the menu.',
          variant: 'destructive',
        });
      }
    };

    initializeSession();
  }, [slug, tableIdFromUrl, createCustomerSession, toast]);

  const [cart, setCart] = useState<
    Array<{
      menuItemId: string;
      name: string;
      quantity: number;
      price: number;
    }>
  >([]);

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [unavailableItemsDialog, setUnavailableItemsDialog] = useState<{
    open: boolean;
    unavailableItems: string[];
  }>({ open: false, unavailableItems: [] });

  const { data, isLoading, isError, refetch } = useGetPublicMenuQuery(
    {
      slug: slug!,
      table: tableFromUrl || undefined,
      tableId: tableIdFromUrl || undefined,
    },
    { skip: !slug }
  );

  const [createOrder, { isLoading: isPlacingOrder }] =
    useCreatePublicOrderMutation();
  const [addItemsToOrder, { isLoading: isAddingItems }] =
    useAddItemsToOrderMutation();

  const restaurant = data?.restaurant;
  const menu = data?.menu;
  const activeOrderFromAPI = data?.activeOrder;

  const currentSession = getStoredSession();

  useEffect(() => {
    if (
      currentSession &&
      tableIdFromUrl &&
      !searchParams.get('addMore') &&
      !searchParams.get('sessionView') &&
      activeOrderFromAPI
    ) {
      navigate(`/c/${slug}/session?tableId=${tableIdFromUrl}`, {
        replace: true,
      });
    }
  }, [
    currentSession,
    tableIdFromUrl,
    searchParams,
    navigate,
    slug,
    activeOrderFromAPI,
  ]);

  useOrdersSocket({
    onEvent: (order) => {
      if (activeOrderFromAPI && order.id === activeOrderFromAPI.id) {
        refetch();
      }
    },
    enabled: !!activeOrderFromAPI,
  });

  const categories = useMemo(() => menu?.categories ?? [], [menu]);
  const uncategorised = useMemo(() => menu?.uncategorised ?? [], [menu]);

  const allProducts = useMemo<AugmentedMenuItem[]>(() => {
    const grouped = categories.flatMap((c) =>
      c.items.map(
        (i) =>
          ({
            ...i,
            _categoryId: c.id,
            _categoryName: c.name,
            _isVegetarian:
              i.tags?.includes('vegetarian') || i.tags?.includes('veg'),
            _isSpicy: i.tags?.includes('spicy') || i.tags?.includes('hot'),
            _isPopular:
              i.tags?.includes('popular') || i.tags?.includes('bestseller'),
            _isQuick: i.tags?.includes('quick') || i.tags?.includes('fast'),
          } satisfies AugmentedMenuItem)
      )
    );
    return [
      ...grouped,
      ...uncategorised.map(
        (i) =>
          ({
            ...i,
            _categoryId: 'uncategorised',
            _categoryName: 'Others',
            _isVegetarian:
              i.tags?.includes('vegetarian') || i.tags?.includes('veg'),
            _isSpicy: i.tags?.includes('spicy') || i.tags?.includes('hot'),
            _isPopular:
              i.tags?.includes('popular') || i.tags?.includes('bestseller'),
            _isQuick: i.tags?.includes('quick') || i.tags?.includes('fast'),
          } satisfies AugmentedMenuItem)
      ),
    ];
  }, [categories, uncategorised]);

  const filteredProducts = useMemo(() => {
    let filtered = allProducts;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item._categoryName.toLowerCase().includes(query) ||
          item.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [allProducts, searchQuery]);

  const displayItems = useMemo(() => {
    if (activeCategory === 'all') {
      return filteredProducts;
    }
    return filteredProducts.filter((p) => p._categoryId === activeCategory);
  }, [filteredProducts, activeCategory]);

  const availableCategories = useMemo<DisplayCategory[]>(() => {
    const categoriesWithItems = categories.filter((c) =>
      filteredProducts.some((item) => item._categoryId === c.id)
    );

    const hasUncategorised = filteredProducts.some(
      (item) => item._categoryId === 'uncategorised'
    );

    const displayCategories: DisplayCategory[] = [
      { id: 'all', name: 'All', icon: { symbol: '🍽️', label: 'All dishes' } },
      ...categoriesWithItems.map((c) => ({
        id: c.id,
        name: c.name,
        icon: determineCategoryIcon(c.name),
      })),
    ];

    if (hasUncategorised) {
      displayCategories.push({
        id: 'uncategorised',
        name: 'Others',
        icon: { symbol: '✨', label: 'Other items' },
      });
    }

    return displayCategories;
  }, [categories, filteredProducts]);

  const hasActiveOrder = !!activeOrderFromAPI;
  const hasTableSession = !!currentSession && !!tableIdFromUrl;

  const handleAddToCart = (
    id: string,
    name: string,
    pricing: MenuItemPricing
  ) => {
    const existingIndex = cart.findIndex((item) => item.menuItemId === id);

    if (existingIndex >= 0) {
      setCart((prev) =>
        prev.map((item, index) =>
          index === existingIndex
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart((prev) => [
        ...prev,
        {
          menuItemId: id,
          name,
          quantity: 1,
          price: pricing.amount,
        },
      ]);
    }
  };

  const handleRemoveFromCart = (id: string) => {
    const existingIndex = cart.findIndex((item) => item.menuItemId === id);

    if (existingIndex >= 0) {
      const item = cart[existingIndex];
      if (item.quantity === 1) {
        setCart((prev) => prev.filter((_, index) => index !== existingIndex));
      } else {
        setCart((prev) =>
          prev.map((item, index) =>
            index === existingIndex
              ? { ...item, quantity: item.quantity - 1 }
              : item
          )
        );
      }
    }
  };

  const getItemQuantity = (menuItemId: string): number => {
    const item = cart.find((item) => item.menuItemId === menuItemId);
    return item ? item.quantity : 0;
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handlePlaceOrder = async () => {
    if (!restaurant || cart.length === 0) return;

    const orderItems = cart.map((item) => ({
      menuItemId: item.menuItemId,
      name: item.name,
      quantity: item.quantity,
      pricing: {
        unitAmount: item.price,
        currency: 'INR',
      },
    }));

    try {
      const customerInfo = {
        customerName: 'Guest Customer',
        tableNumber: tableFromUrl || undefined,
        tableId: tableIdFromUrl || undefined,
      };

      if (hasActiveOrder && activeOrderFromAPI) {
        await addItemsToOrder({
          restaurantId: restaurant.id,
          orderId: activeOrderFromAPI.id,
          items: orderItems,
          notes: `Additional items ordered at ${new Date().toLocaleTimeString()}`,
        }).unwrap();

        toast({
          title: 'Items added to your order! 🎉',
          description: `${cartItemCount} items added to order #${activeOrderFromAPI.orderNumber}`,
        });
      } else {
        const currentSession = getStoredSession();
        const result = await createOrder({
          slug: slug!,
          items: orderItems,
          ...customerInfo,
          paymentMethod: 'upi',
        }).unwrap();

        toast({
          title: 'Order placed! 🎉',
          description: `Order #${result.orderNumber} sent to kitchen`,
        });

        setCart([]);

        const params = new URLSearchParams();
        if (tableIdFromUrl) params.set('tableId', tableIdFromUrl);
        if (tableFromUrl) params.set('table', tableFromUrl);
        const queryString = params.toString() ? `?${params.toString()}` : '';
        navigate(`/c/${slug}/session${queryString}`);
      }

      if (hasActiveOrder) {
        setCart([]);
      }
    } catch (error: any) {
      console.error('Order placement error:', error);

      if (
        error?.status === 400 &&
        error?.data?.message?.includes('not available')
      ) {
        const message = error.data.message;
        const itemIdsMatch = message.match(/not available:\s*([a-f0-9,\s]+)/);
        const unavailableItemIds = itemIdsMatch
          ? itemIdsMatch[1].split(',').map((id: string) => id.trim())
          : [];

        setUnavailableItemsDialog({
          open: true,
          unavailableItems: unavailableItemIds,
        });

        setCart((prevCart) =>
          prevCart.filter(
            (cartItem) => !unavailableItemIds.includes(cartItem.menuItemId)
          )
        );
      } else {
        toast({
          title: 'Failed to place order',
          description: 'Please try again or ask for assistance.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleViewOrder = () => {
    const orderId = activeOrderFromAPI?.id;
    if (orderId) {
      const tableSuffix = tableFromUrl
        ? `?table=${encodeURIComponent(tableFromUrl)}`
        : '';
      navigate(`/c/${slug}/order/${orderId}${tableSuffix}`);
    }
  };

  if (isLoading) {
    return (
      <div className="rh-menu-root">
        <style>{STYLE}</style>
        <div className="rh-loading-screen">
          <img src="/gifs/food-pending.gif" alt="Loading menu" />
          <p>Loading menu...</p>
        </div>
      </div>
    );
  }

  if (isError || !restaurant) {
    return (
      <div className="rh-menu-root">
        <style>{STYLE}</style>
        <div className="rh-error-screen">
          <div className="rh-error-icon">😕</div>
          <h2 className="rh-error-title">Menu Unavailable</h2>
          <p className="rh-error-desc">
            Unable to load the menu. Please try refreshing or ask for
            assistance.
          </p>
          <button
            className="rh-error-btn"
            onClick={() => window.location.reload()}
          >
            <RefreshCcw size={16} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rh-menu-root">
      <style>{STYLE}</style>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rh-menu-header"
      >
        <div className="rh-menu-header-inner">
          <div className="rh-menu-top-row">
            <div className="rh-menu-title-area">
              <h1 className="rh-menu-title">{restaurant?.name || 'Menu'}</h1>
              <p className="rh-menu-subtitle">
                {allProducts.length} items
                {tableFromUrl && ` • Table ${tableFromUrl}`}
              </p>
            </div>
            <button
              className="rh-search-toggle"
              onClick={() => setShowSearch(!showSearch)}
            >
              {showSearch ? <X size={18} /> : <Search size={18} />}
            </button>
          </div>

          {/* Search Bar */}
          <AnimatePresence>
            {showSearch && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="rh-search-bar-wrap"
              >
                <Search size={16} className="rh-search-icon" />
                <input
                  type="text"
                  placeholder="Search menu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rh-search-input"
                />
                {searchQuery && (
                  <button
                    className="rh-search-clear"
                    onClick={() => setSearchQuery('')}
                  >
                    <X size={16} />
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Session Banner */}
          <AnimatePresence>
            {hasTableSession && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rh-banner"
              >
                <div className="rh-banner-left">
                  <div className="rh-banner-dot"></div>
                  <span className="rh-banner-label">
                    Table {currentSession?.tableNumber || 'Unknown'}
                  </span>
                  <span className="rh-banner-meta">Session Active</span>
                </div>
                <button
                  className="rh-banner-btn"
                  onClick={() =>
                    navigate(`/c/${slug}/session?tableId=${tableIdFromUrl}`)
                  }
                >
                  <Receipt size={12} />
                  View Cart
                </button>
              </motion.div>
            )}
            {hasActiveOrder && !hasTableSession && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rh-banner"
              >
                <div className="rh-banner-left">
                  <div className="rh-banner-dot"></div>
                  <span className="rh-banner-label">
                    Order #{activeOrderFromAPI?.orderNumber}
                  </span>
                  <span className="rh-banner-meta">In Progress</span>
                </div>
                <button className="rh-banner-btn" onClick={handleViewOrder}>
                  <Receipt size={12} />
                  View
                </button>
              </motion.div>
            )}

            {restaurant && tableFromUrl && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <CallWaiterButton
                  tableId={tableFromUrl}
                  restaurantId={restaurant.id}
                  orderId={activeOrderFromAPI?.id}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Categories */}
          <div className="rh-categories-wrap">
            <ScrollArea className="w-full">
              <div style={{ display: 'flex', gap: 8, paddingBottom: 4 }}>
                {availableCategories.map((category) => (
                  <button
                    key={category.id}
                    className={`rh-category-pill ${
                      activeCategory === category.id ? 'active' : ''
                    }`}
                    onClick={() => setActiveCategory(category.id)}
                  >
                    {category.imageUrl ? (
                      <img
                        src={category.imageUrl}
                        alt={category.name}
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <AccessibleEmoji
                        symbol={category.icon.symbol}
                        label={category.icon.label}
                      />
                    )}
                    {category.name}
                  </button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        </div>
      </motion.div>

      {/* Menu Items */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
        style={{ padding: '16px 0' }}
      >
        {displayItems.length === 0 ? (
          <div className="rh-empty-state">
            <div className="rh-empty-icon">🔍</div>
            <h3 className="rh-empty-title">No items found</h3>
            <p className="rh-empty-desc">Try adjusting your search</p>
            <button
              className="rh-empty-btn"
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('all');
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="rh-menu-grid">
            {displayItems.map((item, index) => {
              const quantity = getItemQuantity(item.id);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.015 }}
                  className="rh-item-card"
                >
                  {/* Image */}
                  <div className="rh-item-image-wrap">
                    {item.imageUrls?.[0] ? (
                      <img
                        src={item.imageUrls[0]}
                        alt={item.name}
                        className="rh-item-image"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="rh-item-placeholder">🍽️</div>
                    )}
                    {item._isPopular && (
                      <div className="rh-item-popular-badge">
                        <Sparkles size={14} color="white" fill="white" />
                      </div>
                    )}
                    {(item._isSpicy || item._isQuick) && (
                      <div className="rh-item-tags">
                        {item._isSpicy && (
                          <span className="rh-item-tag">🌶️</span>
                        )}
                        {item._isQuick && (
                          <span className="rh-item-tag">⚡</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="rh-item-details">
                    <h3 className="rh-item-name">{item.name}</h3>
                    <p className="rh-item-price">
                      {formatCurrency(item.pricing.amount)}
                    </p>

                    {/* Add / Qty Controls */}
                    {quantity > 0 ? (
                      <div className="rh-qty-controls">
                        <button
                          className="rh-qty-btn"
                          onClick={() => handleRemoveFromCart(item.id)}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="rh-qty-value">{quantity}</span>
                        <button
                          className="rh-qty-btn"
                          onClick={() =>
                            handleAddToCart(item.id, item.name, item.pricing)
                          }
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        className="rh-add-btn"
                        onClick={() =>
                          handleAddToCart(item.id, item.name, item.pricing)
                        }
                      >
                        Add
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Floating Cart */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="rh-floating-cart"
          >
            <div className="rh-floating-cart-inner">
              <div className="rh-cart-row">
                <div className="rh-cart-info">
                  <h4>{hasActiveOrder ? 'Add to Order' : 'Place Order'}</h4>
                  <p>
                    {cartItemCount} items • {formatCurrency(cartTotal)}
                  </p>
                </div>
                <button
                  className="rh-cart-btn"
                  onClick={handlePlaceOrder}
                  disabled={isPlacingOrder || isAddingItems}
                >
                  {isPlacingOrder || isAddingItems ? (
                    <LoadingSpinner className="h-4 w-4" />
                  ) : (
                    <ShoppingBag size={16} />
                  )}
                  {hasActiveOrder ? 'Add Items' : 'Place Order'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unavailable Items Dialog */}
      <Dialog
        open={unavailableItemsDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setUnavailableItemsDialog({ open: false, unavailableItems: [] });
            refetch();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <X className="h-5 w-5 text-destructive" />
              Items Unavailable
            </DialogTitle>
            <DialogDescription>
              Some items in your order are no longer available. We've removed
              them from your cart automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-2">
              The following items are currently unavailable:
            </p>
            <div className="space-y-2">
              {unavailableItemsDialog.unavailableItems.map((itemId) => {
                const cartItem = cart.find(
                  (item) => item.menuItemId === itemId
                );
                const menuItem = displayItems.find(
                  (item) => item.id === itemId
                );
                const itemName =
                  cartItem?.name || menuItem?.name || `Item ID: ${itemId}`;
                return (
                  <div
                    key={itemId}
                    className="flex items-center gap-2 p-2 bg-muted rounded-md"
                  >
                    <X className="h-4 w-4 text-destructive flex-shrink-0" />
                    <span className="text-sm">{itemName}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setUnavailableItemsDialog({
                  open: false,
                  unavailableItems: [],
                });
                refetch();
              }}
              className="w-full"
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Update Menu & Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
