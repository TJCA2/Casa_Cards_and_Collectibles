"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  type Cart,
  type CartItem,
  EMPTY_CART,
  loadCart,
  saveCart,
  addItem,
  removeItem,
  updateQty,
  clearCart,
  cartSubtotal,
  cartItemCount,
} from "@/lib/cart";

// ── Action types ───────────────────────────────────────────────────────────────

type Action =
  | { type: "HYDRATE"; cart: Cart }
  | { type: "ADD_ITEM"; item: CartItem }
  | { type: "REMOVE_ITEM"; productId: string }
  | { type: "UPDATE_QTY"; productId: string; quantity: number }
  | { type: "CLEAR" };

function reducer(state: Cart, action: Action): Cart {
  switch (action.type) {
    case "HYDRATE":
      return action.cart;
    case "ADD_ITEM":
      return addItem(state, action.item);
    case "REMOVE_ITEM":
      return removeItem(state, action.productId);
    case "UPDATE_QTY":
      return updateQty(state, action.productId, action.quantity);
    case "CLEAR":
      return clearCart();
    default:
      return state;
  }
}

// ── Context ────────────────────────────────────────────────────────────────────

interface CartContextValue {
  cart: Cart;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
}

const CartContext = createContext<CartContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, dispatch] = useReducer(reducer, EMPTY_CART);
  const [isOpen, setIsOpen] = useReducer((_: boolean, next: boolean) => next, false);

  // Hydrate from localStorage once on mount
  useEffect(() => {
    dispatch({ type: "HYDRATE", cart: loadCart() });
  }, []);

  // Persist to localStorage whenever cart changes (skip initial empty state)
  useEffect(() => {
    saveCart(cart);
  }, [cart]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const addToCart = useCallback((item: CartItem) => {
    dispatch({ type: "ADD_ITEM", item });
    setIsOpen(true);
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    dispatch({ type: "REMOVE_ITEM", productId });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    dispatch({ type: "UPDATE_QTY", productId, quantity });
  }, []);

  const handleClearCart = useCallback(() => {
    dispatch({ type: "CLEAR" });
  }, []);

  return (
    <CartContext.Provider
      value={{
        cart,
        isOpen,
        openCart,
        closeCart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart: handleClearCart,
        itemCount: cartItemCount(cart),
        subtotal: cartSubtotal(cart),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
