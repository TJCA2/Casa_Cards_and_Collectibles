"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

export interface ProductCardProps {
  id: string;
  slug: string | null;
  title: string;
  price: string | number;
  stockQuantity: number;
  imageUrl?: string | null;
}

export default function ProductCard({
  id,
  slug,
  title,
  price,
  stockQuantity,
  imageUrl,
}: ProductCardProps) {
  const { addToCart } = useCart();
  const href = slug ? `/product/${slug}` : "#";
  const outOfStock = stockQuantity === 0;
  const displayPrice =
    typeof price === "number" ? price.toFixed(2) : parseFloat(String(price)).toFixed(2);

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-red-100"
    >
      {/* Image */}
      <div className="relative aspect-square w-full overflow-hidden bg-gray-50">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className="object-contain transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <svg
              className="h-16 w-16 text-gray-200"
              fill="none"
              stroke="currentColor"
              strokeWidth={1}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Out of stock overlay */}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">
              Out of Stock
            </span>
          </div>
        )}

        {/* Quick add to cart — appears on hover, doesn't block card click */}
        {!outOfStock && (
          <div className="absolute bottom-0 inset-x-0 flex justify-center pb-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                addToCart({
                  productId: id,
                  slug: slug ?? "",
                  title,
                  price: parseFloat(String(price)),
                  imageUrl: imageUrl ?? null,
                  condition: "USED",
                  quantity: 1,
                  stockQuantity,
                });
              }}
              className="rounded-full bg-red-600 px-3.5 py-1 text-xs font-semibold text-white shadow-md hover:bg-red-700 active:scale-95 transition-all"
            >
              + Add to Cart
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-3 text-xs font-medium text-gray-900 leading-snug">{title}</p>
        <p className="mt-auto text-base font-bold text-gray-900">${displayPrice}</p>
      </div>
    </Link>
  );
}
