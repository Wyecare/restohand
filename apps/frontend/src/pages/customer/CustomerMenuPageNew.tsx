import { useMemo, useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/components/ui/use-toast';
import { ModifierSelectionModal } from '@/components/customer/ModifierSelectionModal';
import {
  useGetPublicMenuQuery,
  useCreatePublicOrderMutation,
} from '@/store/api/restaurantsApi';
import {
  useCreateCustomerSessionMutation,
  useUpdateSessionActivityMutation,
  useGetActiveSessionByTableQuery,
  useOnOrderPlacedMutation,
} from '@/store/api/customerSessionsApi';
import { useAddItemsToOrderMutation } from '@/store/api/ordersApi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  selectCartItems,
  selectCartItemCount,
  selectCartTotal,
  selectCartBackendCalculated,
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart,
} from '@/store/slices/cartSlice';
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
  ChevronRight,
  Star,
  Clock,
  Flame,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { MenuItemPricing, PublicMenuCategory } from '@/store/api/types';
import { formatCurrency } from '@/lib/billing';
import { CallWaiterButton } from '@/components/customer/CallWaiterButton';
import { CustomerMenuSearch } from '@/components/customer/CustomerMenuSearch';
import {
  clearExpiredSessionData,
  hasCustomerSessionData,
} from '@/utils/sessionCleanup';
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

/* ── Premium Elegant Styles ── */
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');

  .menu-elegant-root {
    --clr-bg: #fafafa;
    --clr-surface: #ffffff;
    --clr-border: #e5e7eb;
    --clr-text: #1a1a1a;
    --clr-text-muted: #6b7280;
    --clr-accent: #d97706;
    --clr-primary: #0f172a;
    --clr-success: #059669;
    --clr-error: #dc2626;
    
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
    min-height: 100vh;
    color: var(--clr-text);
    padding-bottom: 120px;
  }

  /* ── ELEGANT HEADER ── */
  .menu-elegant-header {
    position: sticky;
    top: 0;
    z-index: 40;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px) saturate(180%);
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    box-shadow: 0 2px 16px rgba(0, 0, 0, 0.04);
  }

  .menu-elegant-header-inner {
    max-width: 768px;
    margin: 0 auto;
    padding: 16px 20px;
  }

  /* Restaurant Name with Serif Font */
  /* Top Row - Title + Search Toggle */
  .menu-header-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  .menu-restaurant-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 24px;
    font-weight: 700;
    color: var(--clr-primary);
    letter-spacing: -0.5px;
    margin: 0;
    flex: 1;
    min-width: 0;
    text-align: left;
    background: linear-gradient(135deg, #0f172a 0%, #334155 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .menu-search-toggle {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: white;
    border: 2px solid var(--clr-border);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    color: var(--clr-text-muted);
    flex-shrink: 0;
  }

  .menu-search-toggle:hover {
    border-color: var(--clr-primary);
    color: var(--clr-primary);
    transform: scale(1.05);
  }

  .menu-search-toggle.active {
    background: var(--clr-primary);
    border-color: var(--clr-primary);
    color: white;
  }

  /* Session Banner - Elegant Card */
  .menu-session-banner {
    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
    border: 1px solid #86efac;
    border-radius: 12px;
    padding: 12px 16px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 2px 8px rgba(34, 197, 94, 0.1);
  }

  .menu-session-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #22c55e;
    flex-shrink: 0;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.1); }
  }

  .menu-session-text {
    flex: 1;
    font-size: 13px;
    font-weight: 600;
    color: #166534;
    min-width: 0;
  }

  .menu-session-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    font-weight: 600;
    color: #166534;
    background: white;
    border: 1px solid #86efac;
    border-radius: 8px;
    padding: 6px 12px;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .menu-session-btn:hover {
    background: #dcfce7;
    transform: translateX(2px);
  }

  /* Search Bar - Elevated */
  .menu-search-container {
    margin-bottom: 16px;
  }

  /* Category Pills - Premium */
  .menu-categories {
    margin-bottom: 20px;
  }

  .menu-category-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 18px;
    font-size: 14px;
    font-weight: 600;
    border-radius: 24px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    white-space: nowrap;
    border: 2px solid transparent;
    background: white;
    color: var(--clr-text-muted);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }

  .menu-category-pill:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    color: var(--clr-primary);
  }

  .menu-category-pill.active {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: white;
    border-color: #0f172a;
    box-shadow: 0 4px 20px rgba(15, 23, 42, 0.3);
  }

  /* Menu Grid - Responsive with Fixed Heights */
  .menu-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
    max-width: 768px;
    margin: 0 auto;
    padding: 0 20px;
  }

  @media (max-width: 640px) {
    .menu-grid {
      grid-template-columns: 1fr;
      gap: 16px;
    }
  }

  /* Item Card - Elegant & Fixed */
  .menu-item-card {
    background: white;
    border-radius: 16px;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid rgba(0, 0, 0, 0.06);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .menu-item-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
    border-color: rgba(0, 0, 0, 0.1);
  }

  .menu-item-card.highlighted {
    border: 2px solid #fbbf24;
    background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
    box-shadow: 0 8px 32px rgba(251, 191, 36, 0.2);
    animation: highlight-pulse 2s ease-in-out;
  }

  @keyframes highlight-pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.02); }
  }

  /* Image Container - Fixed Aspect Ratio */
  .menu-item-image-wrap {
    position: relative;
    width: 100%;
    padding-top: 75%; /* 4:3 aspect ratio */
    background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
    overflow: hidden;
  }

  .menu-item-image {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .menu-item-card:hover .menu-item-image {
    transform: scale(1.05);
  }

  .menu-item-placeholder {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 48px;
    opacity: 0.15;
  }

  /* Badge Overlays */
  .menu-item-badge-popular {
    position: absolute;
    top: 12px;
    right: 12px;
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
    border-radius: 20px;
    padding: 6px 12px;
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 700;
    color: white;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4);
  }

  .menu-item-tags {
    position: absolute;
    bottom: 12px;
    left: 12px;
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .menu-item-tag {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(8px);
    border-radius: 8px;
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  /* Content Area */
  .menu-item-content {
    padding: 16px;
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .menu-item-name {
    font-size: 16px;
    font-weight: 700;
    color: var(--clr-primary);
    line-height: 1.3;
    margin: 0 0 8px 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    min-height: 42px;
  }

  .menu-item-description {
    font-size: 13px;
    color: var(--clr-text-muted);
    line-height: 1.4;
    margin-bottom: 12px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    min-height: 36px;
  }

  .menu-item-price-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .menu-item-price {
    font-size: 20px;
    font-weight: 700;
    color: var(--clr-primary);
    font-family: 'Inter', sans-serif;
  }

  .menu-item-price-old {
    font-size: 15px;
    text-decoration: line-through;
    color: var(--clr-text-muted);
  }

  .menu-item-price-badge {
    background: #dcfce7;
    color: #166534;
    font-size: 11px;
    font-weight: 700;
    padding: 4px 8px;
    border-radius: 6px;
  }

  /* Add Button - Premium */
  .menu-add-btn {
    width: 100%;
    height: 44px;
    border-radius: 12px;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: white;
    border: none;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .menu-add-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.3);
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  }

  .menu-add-btn:active {
    transform: translateY(0);
  }

  /* Quantity Controls - Elegant */
  .menu-qty-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    border-radius: 12px;
    padding: 8px 12px;
    height: 44px;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.2);
  }

  .menu-qty-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.15);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    transition: all 0.2s;
  }

  .menu-qty-btn:hover {
    background: rgba(255, 255, 255, 0.25);
    transform: scale(1.05);
  }

  .menu-qty-value {
    min-width: 32px;
    text-align: center;
    font-weight: 700;
    font-size: 16px;
    color: white;
  }

  /* Floating Cart - Premium */
  .menu-floating-cart {
    position: fixed;
    bottom: 20px;
    left: 20px;
    right: 20px;
    z-index: 50;
    max-width: 768px;
    margin: 0 auto;
  }

  .menu-floating-cart-inner {
    background: linear-gradient(135deg, #ffffff 0%, #fafafa 100%);
    border: 2px solid #0f172a;
    border-radius: 20px;
    padding: 20px;
    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
    backdrop-filter: blur(20px);
  }

  .menu-cart-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .menu-cart-info {
    flex: 1;
    min-width: 0;
  }

  .menu-cart-info h4 {
    font-size: 18px;
    font-weight: 700;
    color: var(--clr-primary);
    margin: 0 0 4px 0;
  }

  .menu-cart-info p {
    font-size: 14px;
    color: var(--clr-text-muted);
    margin: 0;
    font-weight: 500;
  }

  .menu-cart-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 28px;
    font-size: 16px;
    font-weight: 700;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: white;
    border: none;
    border-radius: 14px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 6px 20px rgba(15, 23, 42, 0.3);
    flex-shrink: 0;
  }

  .menu-cart-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 32px rgba(15, 23, 42, 0.4);
  }

  .menu-cart-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  /* Empty State - Playful */
  .menu-empty-state {
    text-align: center;
    padding: 80px 32px;
    max-width: 400px;
    margin: 0 auto;
  }

  .menu-empty-icon {
    font-size: 72px;
    margin-bottom: 20px;
    animation: bounce 2s ease-in-out infinite;
  }

  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }

  .menu-empty-title {
    font-size: 20px;
    font-weight: 700;
    color: var(--clr-primary);
    margin: 0 0 8px 0;
  }

  .menu-empty-desc {
    font-size: 15px;
    color: var(--clr-text-muted);
    line-height: 1.6;
    margin: 0 0 20px 0;
  }

  .menu-empty-btn {
    padding: 12px 24px;
    font-size: 14px;
    font-weight: 600;
    background: white;
    color: var(--clr-primary);
    border: 2px solid var(--clr-border);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .menu-empty-btn:hover {
    border-color: var(--clr-primary);
    background: var(--clr-primary);
    color: white;
  }

  /* Loading Screen */
  .menu-loading-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-center;
    min-height: 100vh;
    padding: 32px;
  }

  .menu-loading-screen img {
    width: 180px;
    height: 180px;
    border-radius: 20px;
    margin-bottom: 24px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  }

  .menu-loading-text {
    font-size: 16px;
    color: var(--clr-text-muted);
    font-weight: 600;
  }

  /* Error Screen */
  .menu-error-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-center;
    min-height: 100vh;
    text-align: center;
    padding: 32px;
  }

  .menu-error-icon {
    font-size: 80px;
    margin-bottom: 24px;
  }

  .menu-error-title {
    font-size: 24px;
    font-weight: 700;
    color: var(--clr-primary);
    margin: 0 0 12px 0;
  }

  .menu-error-desc {
    font-size: 16px;
    color: var(--clr-text-muted);
    margin: 0 0 24px 0;
    max-width: 400px;
    line-height: 1.6;
  }

  .menu-error-btn {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 14px 28px;
    font-size: 15px;
    font-weight: 600;
    background: white;
    color: var(--clr-primary);
    border: 2px solid var(--clr-border);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .menu-error-btn:hover {
    border-color: var(--clr-primary);
    background: var(--clr-primary);
    color: white;
  }

  /* Image Carousel Controls */
  .menu-carousel-arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(0, 0, 0, 0.7);
    border: none;
    border-radius: 50%;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: white;
    font-size: 20px;
    opacity: 0;
    transition: all 0.2s;
    z-index: 10;
  }

  .menu-item-image-wrap:hover .menu-carousel-arrow {
    opacity: 1;
  }

  .menu-carousel-arrow.left {
    left: 12px;
  }

  .menu-carousel-arrow.right {
    right: 12px;
  }

  .menu-carousel-arrow:hover {
    background: rgba(0, 0, 0, 0.85);
    transform: translateY(-50%) scale(1.1);
  }

  .menu-carousel-dots {
    position: absolute;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 6px;
    z-index: 10;
  }

  .menu-carousel-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.5);
    transition: all 0.2s;
  }

  .menu-carousel-dot.active {
    background: white;
    width: 24px;
    border-radius: 4px;
  }

  .menu-image-count {
    position: absolute;
    top: 12px;
    left: 12px;
    background: rgba(0, 0, 0, 0.75);
    color: white;
    font-size: 11px;
    font-weight: 700;
    padding: 6px 10px;
    border-radius: 12px;
    z-index: 10;
  }
`;

// Get or create a unique browser session ID
const getBrowserSessionId = () => {
  let browserSessionId = localStorage.getItem('browserSessionId');
  if (!browserSessionId) {
    browserSessionId = crypto.randomUUID();
    localStorage.setItem('browserSessionId', browserSessionId);
  }
  return browserSessionId;
};

// Session cache helpers
const getCachedSession = (tableId: string) => {
  try {
    const browserSessionId = getBrowserSessionId();
    const cached = localStorage.getItem(
      `customerSession_${tableId}_${browserSessionId}`
    );
    if (!cached) return null;

    const session = JSON.parse(cached);
    const expiresAt = new Date(session.expiresAt);
    if (expiresAt < new Date()) {
      localStorage.removeItem(`customerSession_${tableId}_${browserSessionId}`);
      return null;
    }

    return {
      sessionId: session.sessionId,
      customerNumber: session.customerNumber,
      tableNumber: session.tableNumber,
      cachedAt: session.cachedAt,
      expiresAt: session.expiresAt,
    };
  } catch {
    return null;
  }
};

const getPreviousTableSessions = (tableId: string) => {
  try {
    const sessions = [];
    const keys = Object.keys(localStorage);

    for (const key of keys) {
      if (key.startsWith(`customerSession_${tableId}_`)) {
        try {
          const session = JSON.parse(localStorage.getItem(key) || '{}');
          const expiresAt = new Date(session.expiresAt);

          if (expiresAt > new Date()) {
            sessions.push({
              ...session,
              browserSessionId: key.split('_').pop(),
              storageKey: key,
            });
          } else {
            localStorage.removeItem(key);
          }
        } catch (parseError) {
          localStorage.removeItem(key);
        }
      }
    }

    return sessions.sort(
      (a, b) => new Date(b.cachedAt).getTime() - new Date(a.cachedAt).getTime()
    );
  } catch {
    return [];
  }
};

const cacheSession = (
  tableId: string,
  session: { sessionId: string; customerNumber: number; tableNumber: string }
) => {
  try {
    const browserSessionId = getBrowserSessionId();
    const sessionData = {
      sessionId: session.sessionId,
      customerNumber: session.customerNumber,
      tableNumber: session.tableNumber,
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      cachedAt: new Date().toISOString(),
    };
    localStorage.setItem(
      `customerSession_${tableId}_${browserSessionId}`,
      JSON.stringify(sessionData)
    );
  } catch (error) {
    console.error('Failed to cache session:', error);
  }
};

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

// Session detection modal
const SessionDetectionModal = ({
  isOpen,
  onClose,
  onContinue,
  onStartNew,
  sessions,
}: {
  isOpen: boolean;
  onClose: () => void;
  onContinue: (session: any) => void;
  onStartNew: () => void;
  sessions: any[];
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-xl p-6 max-w-md w-full space-y-4"
      >
        <div className="text-center">
          <AccessibleEmoji
            symbol="👋"
            label="Welcome back"
            className="text-3xl mb-3"
          />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Welcome back!
          </h2>
          <p className="text-gray-600 text-sm">
            We found{' '}
            {sessions.length === 1
              ? 'a previous session'
              : `${sessions.length} previous sessions`}{' '}
            at this table. Would you like to continue or start fresh?
          </p>
        </div>

        <div className="space-y-3">
          {sessions.slice(0, 2).map((session, index) => (
            <button
              key={session.sessionId}
              onClick={() => onContinue(session)}
              className="w-full p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors text-left"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-blue-900">
                    Customer #{session.customerNumber}
                  </p>
                  <p className="text-xs text-blue-700">
                    {new Date(session.cachedAt).toLocaleString()}
                  </p>
                </div>
                <ChevronRight size={16} className="text-blue-600" />
              </div>
            </button>
          ))}
        </div>

        <div className="border-t pt-4 space-y-2">
          <button
            onClick={onStartNew}
            className="w-full p-3 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
          >
            <div className="text-center">
              <p className="font-medium text-green-900">
                <AccessibleEmoji symbol="✨" label="New" className="mr-2" />
                Start New Session
              </p>
              <p className="text-xs text-green-700">Begin fresh ordering</p>
            </div>
          </button>

          <button
            onClick={onClose}
            className="w-full p-2 text-gray-500 hover:text-gray-700 transition-colors text-sm"
          >
            I'll decide later
          </button>
        </div>
      </motion.div>
    </div>
  );
};

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

// Image Carousel Component
function ItemImageCarousel({
  images,
  itemName,
}: {
  images: string[];
  itemName: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="menu-item-image-wrap">
        <div className="menu-item-placeholder">🍽️</div>
      </div>
    );
  }

  return (
    <div className="menu-item-image-wrap">
      <img
        src={images[currentIndex]}
        alt={itemName}
        className="menu-item-image"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
        }}
      />

      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex((prev) =>
                prev === 0 ? images.length - 1 : prev - 1
              );
            }}
            className="menu-carousel-arrow left"
          >
            ‹
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex((prev) =>
                prev === images.length - 1 ? 0 : prev + 1
              );
            }}
            className="menu-carousel-arrow right"
          >
            ›
          </button>

          <div className="menu-carousel-dots">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
                className={`menu-carousel-dot ${
                  index === currentIndex ? 'active' : ''
                }`}
              />
            ))}
          </div>

          <div className="menu-image-count">
            {currentIndex + 1}/{images.length}
          </div>
        </>
      )}
    </div>
  );
}

export default function CustomerMenuPageNew() {
  const params = useParams<{ slug: string; tableId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { slug, tableId } = params;
  const tableFromUrl = searchParams.get('table');
  const tableIdFromUrl = searchParams.get('tableId') || tableId;

  // Session management
  const [createCustomerSession] = useCreateCustomerSessionMutation();
  const [updateSessionActivity] = useUpdateSessionActivityMutation();
  const [onOrderPlaced] = useOnOrderPlacedMutation();

  const [currentSession, setCurrentSession] = useState<{
    sessionId: string;
    customerNumber: number;
    tableNumber: string;
  } | null>(null);

  const [showSessionDetection, setShowSessionDetection] = useState(false);
  const [previousSessions, setPreviousSessions] = useState<any[]>([]);
  const [pendingSessionCreation, setPendingSessionCreation] = useState(false);

  const isCreatingSessionRef = useRef(false);

  const handleContinueSession = (session: any) => {
    console.log('🔄 Continuing previous session:', session.sessionId);
    setCurrentSession({
      sessionId: session.sessionId,
      customerNumber: session.customerNumber,
      tableNumber: session.tableNumber,
    });
    setShowSessionDetection(false);
    setPendingSessionCreation(false);
  };

  const handleStartNewSession = async () => {
    console.log('✨ Starting new session...');
    setShowSessionDetection(false);
    setPendingSessionCreation(false);

    if (!slug || !tableIdFromUrl) return;

    isCreatingSessionRef.current = true;
    try {
      const response = await createCustomerSession({
        restaurantSlug: slug,
        tableId: tableIdFromUrl,
      }).unwrap();

      const sessionData = {
        sessionId: response.sessionId,
        customerNumber: response.customerNumber,
        tableNumber: response.tableNumber,
      };

      setCurrentSession(sessionData);
      cacheSession(tableIdFromUrl, sessionData);
      console.log(
        `✨ New Customer #${response.customerNumber} session created:`,
        response.sessionId
      );
    } catch (error) {
      console.error('Failed to create new session:', error);
      toast({
        title: 'Session Error',
        description: 'Failed to create new session.',
        variant: 'destructive',
      });
    } finally {
      isCreatingSessionRef.current = false;
    }
  };

  // Session initialization
  useEffect(() => {
    const initializeSession = async () => {
      if (!slug || !tableIdFromUrl) return;
      if (isCreatingSessionRef.current) return;

      const cached = getCachedSession(tableIdFromUrl);
      if (cached) {
        setCurrentSession(cached);
        return;
      }

      const previousTableSessions = getPreviousTableSessions(tableIdFromUrl);
      if (previousTableSessions.length > 0) {
        setPreviousSessions(previousTableSessions);
        setShowSessionDetection(true);
        setPendingSessionCreation(true);
        return;
      }

      clearExpiredSessionData();

      isCreatingSessionRef.current = true;
      try {
        const response = await createCustomerSession({
          restaurantSlug: slug,
          tableId: tableIdFromUrl,
        }).unwrap();

        const sessionData = {
          sessionId: response.sessionId,
          customerNumber: response.customerNumber,
          tableNumber: response.tableNumber,
        };

        setCurrentSession(sessionData);
        cacheSession(tableIdFromUrl, sessionData);
      } catch (error) {
        toast({
          title: 'Session Error',
          description: 'Failed to create customer session.',
          variant: 'destructive',
        });
      } finally {
        isCreatingSessionRef.current = false;
      }
    };

    if (!pendingSessionCreation) {
      initializeSession();
    }
  }, [slug, tableIdFromUrl, pendingSessionCreation]);

  // Keep session alive
  useEffect(() => {
    if (!currentSession?.sessionId) return;

    const interval = setInterval(() => {
      updateSessionActivity(currentSession.sessionId);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [currentSession, updateSessionActivity]);

  const dispatch = useAppDispatch();
  const cartItems = useAppSelector(selectCartItems);
  const cartItemCount = useAppSelector(selectCartItemCount);
  const cartTotal = useAppSelector(selectCartTotal);
  const cartBackendCalculated = useAppSelector(selectCartBackendCalculated);

  const [modifierModalOpen, setModifierModalOpen] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<{
    id: string;
    name: string;
    price: number;
    modifiers: any[];
    specialPricing?: any;
  } | null>(null);

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(
    null
  );
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

  useEffect(() => {
    if (
      currentSession &&
      tableIdFromUrl &&
      !searchParams.get('addMore') &&
      !searchParams.get('sessionView') &&
      activeOrderFromAPI
    ) {
      navigate(`/c/${slug}/session/${currentSession.sessionId}`, {
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

  const handleModifierConfirm = (
    selections: any[],
    totalPrice: number,
    notes?: string
  ) => {
    if (!selectedMenuItem) return;

    dispatch(
      addItem({
        id: `${selectedMenuItem.id}-${Date.now()}`,
        menuItemId: selectedMenuItem.id,
        name: selectedMenuItem.name,
        price: totalPrice,
        categoryId: 'unknown',
        categoryName: 'Unknown',
        specialPricing: selectedMenuItem.specialPricing,
        selectedModifiers: selections,
        notes: notes,
      })
    );

    setSelectedMenuItem(null);
  };

  const handleAddToCart = (
    id: string,
    name: string,
    pricing: MenuItemPricing,
    modifiers: any[] = [],
    specialPricing: any = null,
    categoryId: string = '',
    categoryName: string = ''
  ) => {
    if (modifiers.length > 0) {
      setSelectedMenuItem({
        id,
        name,
        price: getEffectivePrice({ pricing, specialPricing }),
        modifiers: modifiers,
        specialPricing: specialPricing,
      });
      setModifierModalOpen(true);
    } else {
      dispatch(
        addItem({
          id: `${id}-${Date.now()}`,
          menuItemId: id,
          name,
          price: getEffectivePrice({ pricing, specialPricing }),
          categoryId,
          categoryName,
          specialPricing: specialPricing,
        })
      );
    }
  };

  const handleRemoveFromCart = (menuItemId: string) => {
    const cartItem = cartItems.find((item) => item.menuItemId === menuItemId);
    if (cartItem) {
      if (cartItem.quantity === 1) {
        dispatch(removeItem(cartItem.id));
      } else {
        dispatch(
          updateItemQuantity({
            id: cartItem.id,
            quantity: cartItem.quantity - 1,
          })
        );
      }
    }
  };

  const getItemQuantity = (menuItemId: string): number => {
    const item = cartItems.find((item) => item.menuItemId === menuItemId);
    return item ? item.quantity : 0;
  };

  const getEffectivePrice = (item: any): number => {
    if (item.specialPricing && item.specialPricing.isActive) {
      return item.specialPricing.specialPrice;
    }
    return item.pricing.amount;
  };

  const handlePlaceOrder = async () => {
    if (!restaurant || cartItems.length === 0) return;

    const orderItems = cartItems.map((item) => ({
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

        if (currentSession?.sessionId) {
          try {
            await onOrderPlaced({
              sessionId: currentSession.sessionId,
              orderId: activeOrderFromAPI.id,
            });
          } catch (error) {
            console.error(
              'Failed to notify session about order update:',
              error
            );
          }
        }
      } else {
        if (!currentSession) {
          toast({
            title: 'Session Error',
            description: 'No active session. Please refresh the page.',
            variant: 'destructive',
          });
          return;
        }

        const result = await createOrder({
          slug: slug!,
          items: orderItems,
          ...customerInfo,
          paymentMethod: 'upi',
          customerSessionId: currentSession.sessionId,
        }).unwrap();

        toast({
          title: 'Order placed! 🎉',
          description: `Order #${result.orderNumber} sent to kitchen`,
        });

        if (currentSession?.sessionId) {
          try {
            await onOrderPlaced({
              sessionId: currentSession.sessionId,
              orderId: result.id,
            });
          } catch (error) {
            console.error(
              'Failed to notify session about order placement:',
              error
            );
          }
        }

        dispatch(clearCart());
        navigate(`/c/${slug}/session/${currentSession.sessionId}`);
      }

      if (hasActiveOrder) {
        dispatch(clearCart());
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

        cartItems
          .filter((cartItem) =>
            unavailableItemIds.includes(cartItem.menuItemId)
          )
          .forEach((cartItem) => dispatch(removeItem(cartItem.id)));
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

  const handleSearchCategorySelect = (categoryId: string) => {
    setActiveCategory(categoryId);
    setShowSearch(false);
    setHighlightedItemId(null);
  };

  const handleSearchItemHighlight = (itemId: string, categoryId: string) => {
    setActiveCategory(categoryId);
    setHighlightedItemId(itemId);
    setShowSearch(false);

    setTimeout(() => {
      const itemElement = document.querySelector(`[data-item-id="${itemId}"]`);
      if (itemElement) {
        itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);

    setTimeout(() => {
      setHighlightedItemId(null);
    }, 3000);
  };

  if (isLoading) {
    return (
      <div className="menu-elegant-root">
        <style>{STYLE}</style>
        <div className="menu-loading-screen">
          <img src="/gifs/food-pending.gif" alt="Loading menu" />
          <p className="menu-loading-text">Loading menu...</p>
        </div>
      </div>
    );
  }

  if (isError || !restaurant) {
    return (
      <div className="menu-elegant-root">
        <style>{STYLE}</style>
        <div className="menu-error-screen">
          <div className="menu-error-icon">😕</div>
          <h2 className="menu-error-title">Menu Unavailable</h2>
          <p className="menu-error-desc">
            Unable to load the menu. Please try refreshing or ask for
            assistance.
          </p>
          <button
            className="menu-error-btn"
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
    <div className="menu-elegant-root">
      <style>{STYLE}</style>

      {/* ELEGANT HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="menu-elegant-header"
      >
        <div className="menu-elegant-header-inner">
          {/* Top Row - Title + Search */}
          <div className="menu-header-top">
            <h1 className="menu-restaurant-title">
              {restaurant?.name || 'Menu'}
            </h1>
            <button
              className={`menu-search-toggle ${showSearch ? 'active' : ''}`}
              onClick={() => setShowSearch(!showSearch)}
            >
              {showSearch ? <X size={20} /> : <Search size={20} />}
            </button>
          </div>

          {/* Session Banner */}
          <AnimatePresence>
            {hasTableSession && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="menu-session-banner"
              >
                <div className="menu-session-dot"></div>
                <span className="menu-session-text">
                  Table {currentSession?.tableNumber} • Customer #
                  {currentSession?.customerNumber}
                </span>
                <button
                  className="menu-session-btn"
                  onClick={() =>
                    navigate(`/c/${slug}/session/${currentSession.sessionId}`)
                  }
                >
                  View <ChevronRight size={14} />
                </button>
              </motion.div>
            )}
            {hasActiveOrder && !hasTableSession && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="menu-session-banner"
              >
                <div className="menu-session-dot"></div>
                <span className="menu-session-text">
                  Order #{activeOrderFromAPI?.orderNumber} • In Progress
                </span>
                <button className="menu-session-btn" onClick={handleViewOrder}>
                  View <ChevronRight size={10} />
                </button>
              </motion.div>
            )}

            {restaurant && tableFromUrl && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <CallWaiterButton
                  tableId={tableFromUrl}
                  restaurantId={restaurant.id}
                  orderId={activeOrderFromAPI?.id}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search */}
          <AnimatePresence>
            {showSearch && slug && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="menu-search-container"
              >
                <CustomerMenuSearch
                  slug={slug}
                  tableId={tableIdFromUrl}
                  table={tableFromUrl}
                  onCategorySelect={handleSearchCategorySelect}
                  onItemHighlight={handleSearchItemHighlight}
                  placeholder="Search dishes..."
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Categories */}
          <div className="menu-categories">
            <ScrollArea className="w-full">
              <div style={{ display: 'flex', gap: 10, paddingBottom: 4 }}>
                {availableCategories.map((category) => (
                  <button
                    key={category.id}
                    className={`menu-category-pill ${
                      activeCategory === category.id ? 'active' : ''
                    }`}
                    onClick={() => setActiveCategory(category.id)}
                  >
                    <AccessibleEmoji
                      symbol={category.icon.symbol}
                      label={category.icon.label}
                    />
                    {category.name}
                  </button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        </div>
      </motion.div>

      {/* MENU GRID */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        style={{ paddingTop: 24 }}
      >
        {displayItems.length === 0 ? (
          <div className="menu-empty-state">
            <div className="menu-empty-icon">🔍</div>
            <h3 className="menu-empty-title">No items found</h3>
            <p className="menu-empty-desc">
              We couldn't find any dishes matching your search. Try browsing
              other categories!
            </p>
            <button
              className="menu-empty-btn"
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('all');
              }}
            >
              Show All Items
            </button>
          </div>
        ) : (
          <div className="menu-grid">
            {displayItems.map((item, index) => {
              const quantity = getItemQuantity(item.id);
              const isHighlighted = highlightedItemId === item.id;
              const hasDiscount = item.specialPricing?.isActive;

              return (
                <motion.div
                  key={item.id}
                  data-item-id={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03, duration: 0.4 }}
                  className={`menu-item-card ${
                    isHighlighted ? 'highlighted' : ''
                  }`}
                >
                  {/* Image */}
                  <div style={{ position: 'relative' }}>
                    <ItemImageCarousel
                      images={item.imageUrls || []}
                      itemName={item.name}
                    />

                    {item._isPopular && (
                      <div className="menu-item-badge-popular">
                        <Star size={12} fill="white" />
                        Popular
                      </div>
                    )}

                    <div className="menu-item-tags">
                      {item._isSpicy && (
                        <span className="menu-item-tag">
                          <Flame size={12} className="text-red-500" />
                          Spicy
                        </span>
                      )}
                      {item._isQuick && (
                        <span className="menu-item-tag">
                          <Clock size={12} className="text-blue-500" />
                          Quick
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="menu-item-content">
                    <h3 className="menu-item-name">{item.name}</h3>

                    {item.description && (
                      <p className="menu-item-description">
                        {item.description}
                      </p>
                    )}

                    <div className="menu-item-price-row">
                      {hasDiscount && (
                        <span className="menu-item-price-old">
                          {formatCurrency(item.pricing.amount)}
                        </span>
                      )}
                      <span className="menu-item-price">
                        {formatCurrency(
                          hasDiscount
                            ? item.specialPricing.specialPrice
                            : item.pricing.amount
                        )}
                      </span>
                      {hasDiscount && (
                        <span className="menu-item-price-badge">
                          Save{' '}
                          {Math.round(
                            ((item.pricing.amount -
                              item.specialPricing.specialPrice) /
                              item.pricing.amount) *
                              100
                          )}
                          %
                        </span>
                      )}
                    </div>

                    {/* Add Button / Quantity */}
                    {quantity > 0 ? (
                      <div className="menu-qty-controls">
                        <button
                          className="menu-qty-btn"
                          onClick={() => handleRemoveFromCart(item.id)}
                        >
                          <Minus size={16} />
                        </button>
                        <span className="menu-qty-value">{quantity}</span>
                        <button
                          className="menu-qty-btn"
                          onClick={() =>
                            handleAddToCart(
                              item.id,
                              item.name,
                              item.pricing,
                              item.modifiers || [],
                              item.specialPricing,
                              item._categoryId,
                              item._categoryName
                            )
                          }
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        className="menu-add-btn"
                        onClick={() =>
                          handleAddToCart(
                            item.id,
                            item.name,
                            item.pricing,
                            item.modifiers || [],
                            item.specialPricing,
                            item._categoryId,
                            item._categoryName
                          )
                        }
                      >
                        <Plus size={18} />
                        Add to Cart
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* FLOATING CART */}
      <AnimatePresence>
        {cartItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="menu-floating-cart"
          >
            <div className="menu-floating-cart-inner">
              <div className="menu-cart-content">
                <div className="menu-cart-info">
                  <h4>{hasActiveOrder ? 'Add to Order' : 'Place Order'}</h4>
                  <p>
                    {cartItemCount} items •{' '}
                    {cartBackendCalculated?.isCalculating
                      ? 'Calculating...'
                      : formatCurrency(cartTotal)}
                  </p>
                </div>
                <button
                  className="menu-cart-btn"
                  onClick={handlePlaceOrder}
                  disabled={
                    isPlacingOrder ||
                    isAddingItems ||
                    cartBackendCalculated?.isCalculating ||
                    false
                  }
                >
                  {isPlacingOrder || isAddingItems ? (
                    <LoadingSpinner className="h-5 w-5" />
                  ) : (
                    <ShoppingBag size={20} />
                  )}
                  {hasActiveOrder ? 'Add Items' : 'Order Now'}
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
                const cartItem = cartItems.find(
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

      {/* Modifier Selection Modal */}
      {selectedMenuItem && (
        <ModifierSelectionModal
          open={modifierModalOpen}
          onOpenChange={setModifierModalOpen}
          menuItemId={selectedMenuItem.id}
          menuItemName={selectedMenuItem.name}
          basePrice={selectedMenuItem.price}
          modifiers={selectedMenuItem.modifiers}
          onConfirm={handleModifierConfirm}
        />
      )}

      {/* Smart Session Detection Modal */}
      <SessionDetectionModal
        isOpen={showSessionDetection}
        onClose={() => {
          setShowSessionDetection(false);
          setPendingSessionCreation(false);
        }}
        onContinue={handleContinueSession}
        onStartNew={handleStartNewSession}
        sessions={previousSessions}
      />
    </div>
  );
}
