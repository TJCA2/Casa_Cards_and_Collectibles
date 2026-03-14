"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const CONDITIONS = [
  { value: "NEW", label: "New" },
  { value: "LIKE_NEW", label: "Like New" },
  { value: "USED", label: "Used" },
  { value: "REFURBISHED", label: "Refurbished" },
];

interface Category {
  id: string;
  slug: string;
  name: string;
}

interface FilterSidebarProps {
  categories: Category[];
}

export default function FilterSidebar({ categories }: FilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset to page 1 whenever a filter changes
      params.delete("page");
      router.push(`/shop?${params.toString()}`);
    },
    [router, searchParams],
  );

  const toggleCondition = useCallback(
    (value: string) => {
      const current = searchParams.get("condition");
      setParam("condition", current === value ? null : value);
    },
    [searchParams, setParam],
  );

  const activeCategory = searchParams.get("category");
  const activeCondition = searchParams.get("condition");
  const inStock = searchParams.get("inStock") === "true";
  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";
  const hasFilters = activeCategory || activeCondition || inStock || minPrice || maxPrice;

  return (
    <aside className="w-full space-y-6 lg:w-56 lg:flex-shrink-0">
      {/* Header + clear */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-900">Filters</h2>
        {hasFilters && (
          <button
            onClick={() => router.push("/shop")}
            className="text-xs text-red-600 hover:text-red-700"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Category */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Category</p>
        <ul className="space-y-1">
          <li>
            <button
              onClick={() => setParam("category", null)}
              className={`text-sm ${!activeCategory ? "font-semibold text-red-600" : "text-gray-700 hover:text-gray-900"}`}
            >
              All Categories
            </button>
          </li>
          {categories.map((cat) => (
            <li key={cat.id}>
              <button
                onClick={() => setParam("category", cat.slug)}
                className={`text-sm ${activeCategory === cat.slug ? "font-semibold text-red-600" : "text-gray-700 hover:text-gray-900"}`}
              >
                {cat.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Condition */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Condition
        </p>
        <ul className="space-y-1.5">
          {CONDITIONS.map((c) => (
            <li key={c.value}>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={activeCondition === c.value}
                  onChange={() => toggleCondition(c.value)}
                  className="h-4 w-4 rounded border-gray-300 accent-red-600"
                />
                <span className="text-sm text-gray-700">{c.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      {/* Price range */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Price Range
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const min = fd.get("minPrice") as string;
            const max = fd.get("maxPrice") as string;
            const params = new URLSearchParams(searchParams.toString());
            if (min) params.set("minPrice", min);
            else params.delete("minPrice");
            if (max) params.set("maxPrice", max);
            else params.delete("maxPrice");
            params.delete("page");
            router.push(`/shop?${params.toString()}`);
          }}
          className="flex flex-col gap-2"
        >
          <div className="flex items-center gap-2">
            <input
              name="minPrice"
              type="number"
              min="0"
              step="0.01"
              placeholder="Min $"
              defaultValue={minPrice}
              className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-red-400 focus:outline-none"
            />
            <span className="text-gray-400">–</span>
            <input
              name="maxPrice"
              type="number"
              min="0"
              step="0.01"
              placeholder="Max $"
              defaultValue={maxPrice}
              className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-red-400 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-gray-100 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
          >
            Apply
          </button>
        </form>
      </div>

      {/* In stock */}
      <div>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={inStock}
            onChange={() => setParam("inStock", inStock ? null : "true")}
            className="h-4 w-4 rounded border-gray-300 accent-red-600"
          />
          <span className="text-sm font-medium text-gray-700">In Stock Only</span>
        </label>
      </div>
    </aside>
  );
}
