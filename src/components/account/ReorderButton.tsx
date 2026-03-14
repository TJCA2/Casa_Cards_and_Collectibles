"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import type { CartItem } from "@/lib/cart";

interface ReorderItem {
  productId: string;
  slug: string;
  title: string;
  price: number;
  imageUrl: string | null;
  condition: string;
  stockQuantity: number;
}

export default function ReorderButton({ items }: { items: ReorderItem[] }) {
  const { addToCart, openCart } = useCart();
  const [done, setDone] = useState(false);

  function handleReorder() {
    let skipped = 0;
    for (const item of items) {
      if (item.stockQuantity < 1) {
        skipped++;
        continue;
      }
      const cartItem: CartItem = {
        productId: item.productId,
        slug: item.slug,
        title: item.title,
        price: item.price,
        imageUrl: item.imageUrl,
        condition: item.condition,
        quantity: 1,
        stockQuantity: item.stockQuantity,
      };
      addToCart(cartItem);
    }

    setDone(true);
    openCart();

    if (skipped > 0) {
      // Reset label after a moment so user sees "X items skipped"
      setTimeout(() => setDone(false), 3000);
    }
  }

  return (
    <button
      onClick={handleReorder}
      className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50"
    >
      {done ? "Added to cart" : "Reorder"}
    </button>
  );
}
