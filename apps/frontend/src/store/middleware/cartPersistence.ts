import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '../index';
import { CartState, restoreCart } from '../slices/cartSlice';

const CART_STORAGE_KEY = 'restohand_cart';

// Cart persistence middleware
export const cartPersistenceMiddleware: Middleware<{}, RootState> = (store) => (next) => (action) => {
  // Execute the action first
  const result = next(action);

  // Get the updated state
  const state = store.getState();
  const cartState = state.cart;

  // Only persist cart if it has items or customer info
  if (cartState.items.length > 0 || Object.keys(cartState.customerInfo).length > 0) {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartState));
    } catch (error) {
      console.warn('Failed to persist cart to localStorage:', error);
    }
  } else {
    // Clear localStorage if cart is empty
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear cart from localStorage:', error);
    }
  }

  return result;
};

// Function to restore cart from localStorage
export const restoreCartFromStorage = (dispatch: any) => {
  try {
    const storedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (storedCart) {
      const cartState: CartState = JSON.parse(storedCart);
      dispatch(restoreCart(cartState));
    }
  } catch (error) {
    console.warn('Failed to restore cart from localStorage:', error);
    // Clear corrupted data
    localStorage.removeItem(CART_STORAGE_KEY);
  }
};