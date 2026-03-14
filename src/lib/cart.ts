// ── Cart types ─────────────────────────────────────────────────────────────────

export interface CartItem {
  productId: string;
  slug: string;
  title: string;
  price: number; // in dollars
  imageUrl: string | null;
  condition: string;
  quantity: number;
  stockQuantity: number;
}

export interface Cart {
  items: CartItem[];
}

export const EMPTY_CART: Cart = { items: [] };

// ── localStorage helpers ───────────────────────────────────────────────────────

const STORAGE_KEY = "casa_cart";

export function loadCart(): Cart {
  if (typeof window === "undefined") return EMPTY_CART;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_CART;
    const parsed = JSON.parse(raw) as Cart;
    if (!Array.isArray(parsed.items)) return EMPTY_CART;
    return parsed;
  } catch {
    return EMPTY_CART;
  }
}

export function saveCart(cart: Cart): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
}

// ── Pure cart reducers ─────────────────────────────────────────────────────────

export function addItem(cart: Cart, item: CartItem): Cart {
  const existing = cart.items.find((i) => i.productId === item.productId);
  if (existing) {
    const newQty = Math.min(existing.quantity + item.quantity, item.stockQuantity);
    return {
      items: cart.items.map((i) =>
        i.productId === item.productId ? { ...i, quantity: newQty } : i,
      ),
    };
  }
  return { items: [...cart.items, item] };
}

export function removeItem(cart: Cart, productId: string): Cart {
  return { items: cart.items.filter((i) => i.productId !== productId) };
}

export function updateQty(cart: Cart, productId: string, quantity: number): Cart {
  if (quantity <= 0) return removeItem(cart, productId);
  return {
    items: cart.items.map((i) =>
      i.productId === productId ? { ...i, quantity: Math.min(quantity, i.stockQuantity) } : i,
    ),
  };
}

export function clearCart(): Cart {
  return EMPTY_CART;
}

export function cartSubtotal(cart: Cart): number {
  return cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export function cartItemCount(cart: Cart): number {
  return cart.items.reduce((sum, i) => sum + i.quantity, 0);
}
