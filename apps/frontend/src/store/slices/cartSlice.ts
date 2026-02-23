import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface OptionSelection {
  optionId: string;
  optionName: string;
  priceAdjustment: number;
  quantity?: number;
}

export interface ModifierSelection {
  modifierId: string;
  modifierName: string;
  selectedOptions: OptionSelection[];
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  menuItemId: string;
  categoryId: string;
  categoryName: string;
  description?: string;
  image?: string;
  activePriceTagId?: string;
  selectedModifiers?: ModifierSelection[];
  notes?: string;
  customizations?: {
    addons?: Array<{
      id: string;
      name: string;
      price: number;
    }>;
    variants?: Array<{
      id: string;
      name: string;
      price: number;
    }>;
    notes?: string;
  };
  itemTotal: number; // Pre-calculated total including customizations
}

export interface CartCustomerInfo {
  name?: string;
  phone?: string;
  email?: string;
}

export interface CartState {
  items: CartItem[];
  restaurantId?: string;
  restaurantSlug?: string;
  tableNumber?: string;
  customerInfo: CartCustomerInfo;
  notes?: string;
  // Basic item totals only (no tax calculations)
  itemsTotal: number;
  // Backend calculated totals (single source of truth)
  backendCalculated?: {
    subTotalAmount: number;
    taxAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    discountAmount: number;
    roundOffAmount: number;
    totalAmount: number;
    isCalculating: boolean;
    lastCalculated?: string;
  };
  isOpen: boolean;
  lastUpdated: string;
}

const initialState: CartState = {
  items: [],
  customerInfo: {},
  itemsTotal: 0,
  isOpen: false,
  lastUpdated: new Date().toISOString(),
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    // Initialize cart for a restaurant
    initializeCart: (state, action: PayloadAction<{ restaurantId: string; restaurantSlug: string; tableNumber?: string }>) => {
      const { restaurantId, restaurantSlug, tableNumber } = action.payload;

      // Only clear cart if switching to different restaurant
      if (state.restaurantId && state.restaurantId !== restaurantId) {
        state.items = [];
        state.customerInfo = {};
        state.notes = undefined;
      }

      state.restaurantId = restaurantId;
      state.restaurantSlug = restaurantSlug;
      state.tableNumber = tableNumber;
      state.lastUpdated = new Date().toISOString();

      cartSlice.caseReducers.calculateItemsTotal(state);
    },

    // Add item to cart
    addItem: (state, action: PayloadAction<Omit<CartItem, 'quantity' | 'itemTotal'> & { calculatedPrice?: number }>) => {
      const { calculatedPrice, ...newItem } = action.payload;
      const existingIndex = state.items.findIndex(item =>
        item.menuItemId === newItem.menuItemId &&
        item.activePriceTagId === newItem.activePriceTagId &&
        JSON.stringify(item.selectedModifiers) === JSON.stringify(newItem.selectedModifiers) &&
        JSON.stringify(item.customizations) === JSON.stringify(newItem.customizations)
      );

      // Use calculated price if provided (from ModifierSelectionModal), otherwise fallback to calculation
      const itemPrice = calculatedPrice || calculateItemPrice(newItem);

      if (existingIndex >= 0) {
        // Update existing item
        state.items[existingIndex].quantity += 1;
        state.items[existingIndex].itemTotal = state.items[existingIndex].quantity * itemPrice;
      } else {
        // Add new item
        const cartItem: CartItem = {
          ...newItem,
          quantity: 1,
          itemTotal: itemPrice,
        };
        state.items.push(cartItem);
      }

      state.lastUpdated = new Date().toISOString();
      cartSlice.caseReducers.calculateItemsTotal(state);
    },

    // Update item quantity
    updateItemQuantity: (state, action: PayloadAction<{ id: string; quantity: number }>) => {
      const { id, quantity } = action.payload;
      const item = state.items.find(item => item.id === id);

      if (item) {
        if (quantity <= 0) {
          state.items = state.items.filter(item => item.id !== id);
        } else {
          item.quantity = quantity;
          item.itemTotal = quantity * calculateItemPrice(item);
        }

        state.lastUpdated = new Date().toISOString();
        cartSlice.caseReducers.calculateTotals(state);
      }
    },

    // Remove item from cart
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(item => item.id !== action.payload);
      state.lastUpdated = new Date().toISOString();
      cartSlice.caseReducers.calculateItemsTotal(state);
    },

    // Update customer info
    updateCustomerInfo: (state, action: PayloadAction<Partial<CartCustomerInfo>>) => {
      state.customerInfo = { ...state.customerInfo, ...action.payload };
      state.lastUpdated = new Date().toISOString();
    },

    // Update order notes
    updateNotes: (state, action: PayloadAction<string>) => {
      state.notes = action.payload;
      state.lastUpdated = new Date().toISOString();
    },

    // Toggle cart visibility
    toggleCart: (state) => {
      state.isOpen = !state.isOpen;
    },

    // Open cart
    openCart: (state) => {
      state.isOpen = true;
    },

    // Close cart
    closeCart: (state) => {
      state.isOpen = false;
    },

    // Clear entire cart
    clearCart: (state) => {
      state.items = [];
      state.customerInfo = {};
      state.notes = undefined;
      state.itemsTotal = 0;
      state.backendCalculated = undefined;
      state.lastUpdated = new Date().toISOString();
    },

    // Calculate items total only (no tax calculations)
    calculateItemsTotal: (state) => {
      state.itemsTotal = state.items.reduce((sum, item) => sum + item.itemTotal, 0);
    },

    // Backend calculation actions
    setCalculating: (state, action: PayloadAction<boolean>) => {
      if (!state.backendCalculated) {
        state.backendCalculated = {
          subTotalAmount: 0,
          taxAmount: 0,
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 0,
          discountAmount: 0,
          roundOffAmount: 0,
          totalAmount: 0,
          isCalculating: false,
        };
      }
      state.backendCalculated.isCalculating = action.payload;
    },

    updateBackendCalculation: (state, action: PayloadAction<{
      subTotalAmount: number;
      taxAmount: number;
      cgstAmount: number;
      sgstAmount: number;
      igstAmount: number;
      discountAmount: number;
      roundOffAmount: number;
      totalAmount: number;
    }>) => {
      state.backendCalculated = {
        ...action.payload,
        isCalculating: false,
        lastCalculated: new Date().toISOString(),
      };
    },

    // Restore cart from localStorage
    restoreCart: (state, action: PayloadAction<CartState>) => {
      const restoredCart = action.payload;

      // Only restore if cart is recent (within 24 hours)
      const lastUpdated = new Date(restoredCart.lastUpdated);
      const now = new Date();
      const hoursDiff = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);

      if (hoursDiff <= 24) {
        return { ...restoredCart, isOpen: false };
      }

      return state;
    },
  },
});

// Helper function to calculate item price including customizations and modifiers
// Note: This function uses the price already calculated in the ModifierSelectionModal
// which includes free options logic, so we don't need to recalculate it here
function calculateItemPrice(item: Partial<CartItem>): number {
  let price = item.price || 0;

  // Add modifier price adjustments - these should already include free options calculations
  // from the ModifierSelectionModal where they were initially calculated
  if (item.selectedModifiers) {
    for (const modifier of item.selectedModifiers) {
      for (const option of modifier.selectedOptions) {
        price += option.priceAdjustment * (option.quantity || 1);
      }
    }
  }

  // Legacy customizations support (keeping for backward compatibility)
  if (item.customizations?.addons) {
    price += item.customizations.addons.reduce((sum, addon) => sum + addon.price, 0);
  }

  if (item.customizations?.variants) {
    price += item.customizations.variants.reduce((sum, variant) => sum + variant.price, 0);
  }

  return price;
}

export const {
  initializeCart,
  addItem,
  updateItemQuantity,
  removeItem,
  updateCustomerInfo,
  updateNotes,
  toggleCart,
  openCart,
  closeCart,
  clearCart,
  calculateItemsTotal,
  setCalculating,
  updateBackendCalculation,
  restoreCart,
} = cartSlice.actions;

export default cartSlice.reducer;
export type { OptionSelection, ModifierSelection };

// Selectors
export const selectCartItems = (state: { cart: CartState }) => state.cart.items;
export const selectCartItemsTotal = (state: { cart: CartState }) => state.cart.itemsTotal;
export const selectCartBackendCalculated = (state: { cart: CartState }) => state.cart.backendCalculated;
export const selectCartTotal = (state: { cart: CartState }) =>
  state.cart.backendCalculated?.totalAmount || state.cart.itemsTotal;
export const selectCartItemCount = (state: { cart: CartState }) =>
  state.cart.items.reduce((sum, item) => sum + item.quantity, 0);
export const selectCartIsOpen = (state: { cart: CartState }) => state.cart.isOpen;
export const selectCartCustomerInfo = (state: { cart: CartState }) => state.cart.customerInfo;
export const selectCartRestaurant = (state: { cart: CartState }) => ({
  id: state.cart.restaurantId,
  slug: state.cart.restaurantSlug,
  tableNumber: state.cart.tableNumber,
});
export const selectCartForCheckout = (state: { cart: CartState }) => ({
  items: state.cart.items.map(item => ({
    menuItemId: item.menuItemId,
    name: item.name,
    quantity: item.quantity,
    pricing: {
      unitAmount: calculateItemPrice(item),
      currency: 'INR',
      discountAmount: 0,
      taxAmount: 0
    },
    activePriceTagId: item.activePriceTagId,
    selectedModifiers: item.selectedModifiers?.map(modifier => ({
      modifierId: modifier.modifierId,
      modifierName: modifier.modifierName,
      selectedOptions: modifier.selectedOptions.map(option => ({
        optionId: option.optionId,
        optionName: option.optionName,
        priceAdjustment: option.priceAdjustment,
        quantity: option.quantity || 1
      }))
    })),
    notes: item.notes,
    // Legacy customizations for backward compatibility
    customizations: item.customizations,
  })),
  customerInfo: state.cart.customerInfo,
  tableNumber: state.cart.tableNumber,
  notes: state.cart.notes,
  itemsTotal: state.cart.itemsTotal,
  backendCalculated: state.cart.backendCalculated,
});