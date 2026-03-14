"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import type { CartItem } from "@/lib/cart";

interface WishlistProduct {
  id: string;
  title: string;
  slug: string | null;
  price: string;
  stockQuantity: number;
  imageUrl: string | null;
  condition: string;
}

interface Props {
  items: WishlistProduct[];
}

export default function WishlistManager({ items: initialItems }: Props) {
  const [items, setItems] = useState(initialItems);
  const [removing, setRemoving] = useState<string | null>(null);
  const [movingToCart, setMovingToCart] = useState<string | null>(null);
  const { addToCart, openCart } = useCart();
  const router = useRouter();
  const [, startTransition] = useTransition();

  async function handleRemove(productId: string) {
    setRemoving(productId);
    try {
      const res = await fetch(`/api/account/wishlist/${productId}`, {
        method: "DELETE",
      });
      if (res.ok || res.status === 204) {
        setItems((prev) => prev.filter((i) => i.id !== productId));
        startTransition(() => router.refresh());
      }
    } catch {
      // silent
    } finally {
      setRemoving(null);
    }
  }

  async function handleMoveToCart(item: WishlistProduct) {
    setMovingToCart(item.id);
    try {
      const cartItem: CartItem = {
        productId: item.id,
        slug: item.slug ?? item.id,
        title: item.title,
        price: parseFloat(item.price),
        imageUrl: item.imageUrl,
        condition: item.condition,
        quantity: 1,
        stockQuantity: item.stockQuantity,
      };
      addToCart(cartItem);
      openCart();

      // Remove from wishlist after adding to cart
      const res = await fetch(`/api/account/wishlist/${item.id}`, {
        method: "DELETE",
      });
      if (res.ok || res.status === 204) {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        startTransition(() => router.refresh());
      }
    } catch {
      // silent
    } finally {
      setMovingToCart(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <p className="mb-1 text-lg font-semibold text-gray-900">Your wishlist is empty</p>
        <p className="mb-6 text-sm text-gray-500">
          Save items you love and come back to them anytime.
        </p>
        <Link
          href="/shop"
          className="inline-block rounded-lg bg-red-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const outOfStock = item.stockQuantity === 0;
        return (
          <div
            key={item.id}
            className="flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden"
          >
            {/* Product image */}
            <Link
              href={`/product/${item.slug ?? item.id}`}
              className="block aspect-square bg-gray-100 overflow-hidden"
            >
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="h-full w-full object-contain p-4 transition-transform hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-300">
                  <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              )}
            </Link>

            {/* Info */}
            <div className="flex flex-1 flex-col p-4">
              <Link
                href={`/product/${item.slug ?? item.id}`}
                className="mb-1 line-clamp-2 text-sm font-medium text-gray-900 hover:text-red-600"
              >
                {item.title}
              </Link>
              <p className="mb-2 text-base font-bold text-gray-900">
                ${parseFloat(item.price).toFixed(2)}
              </p>

              {outOfStock ? (
                <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                  Out of Stock
                </span>
              ) : (
                <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                  In Stock
                </span>
              )}

              <div className="mt-auto flex gap-2">
                <button
                  onClick={() => handleMoveToCart(item)}
                  disabled={outOfStock || movingToCart === item.id}
                  className="flex-1 rounded-lg bg-red-600 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {movingToCart === item.id ? "Adding…" : "Move to Cart"}
                </button>
                <button
                  onClick={() => handleRemove(item.id)}
                  disabled={removing === item.id}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-500 hover:border-red-300 hover:text-red-600 disabled:opacity-50"
                  title="Remove from wishlist"
                >
                  {removing === item.id ? "…" : "✕"}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
