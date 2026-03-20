"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface FilterSidebarProps {
  sports: string[];
  activeSport: string;
  grades: string[];
  activeGrade: string;
}

export default function FilterSidebar({
  sports,
  activeSport,
  grades,
  activeGrade,
}: FilterSidebarProps) {
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

  const inStock = searchParams.get("inStock") === "true";
  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";
  const hasFilters = inStock || minPrice || maxPrice || activeSport || activeGrade;

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

      {/* Sport */}
      {sports.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Sport</p>
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => setParam("sport", null)}
                className={`text-sm ${!activeSport ? "font-semibold text-red-600" : "text-gray-700 hover:text-gray-900"}`}
              >
                All Sports
              </button>
            </li>
            {sports.map((s) => (
              <li key={s}>
                <button
                  onClick={() => setParam("sport", s)}
                  className={`text-sm ${activeSport === s ? "font-semibold text-red-600" : "text-gray-700 hover:text-gray-900"}`}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Grade */}
      {grades.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Grade</p>
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => setParam("grade", null)}
                className={`text-sm ${!activeGrade ? "font-semibold text-red-600" : "text-gray-700 hover:text-gray-900"}`}
              >
                All Grades
              </button>
            </li>
            {grades.map((g) => (
              <li key={g}>
                <button
                  onClick={() => setParam("grade", g)}
                  className={`text-sm ${activeGrade === g ? "font-semibold text-red-600" : "text-gray-700 hover:text-gray-900"}`}
                >
                  {g}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

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
