"use client";

import { useCart } from "@/context/CartContext";
import type { CartItem } from "@/lib/cart";

interface Props {
  item: CartItem;
  outOfStock: boolean;
}

export default function AddToCartButton({ item, outOfStock }: Props) {
  const { addToCart } = useCart();

  return (
    <button
      onClick={() => addToCart(item)}
      disabled={outOfStock}
      className="flex-1 rounded-lg bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {outOfStock ? "Out of Stock" : "Add to Cart"}
    </button>
  );
}
