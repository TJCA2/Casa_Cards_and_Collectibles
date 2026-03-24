"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useRef, useEffect } from "react";

interface FilterSidebarProps {
  sports: string[];
  activeSport: string;
  grades: string[];
  activeGrades: string[];
}

export default function FilterSidebar({
  sports,
  activeSport,
  grades,
  activeGrades,
}: FilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [gradeOpen, setGradeOpen] = useState(activeGrades.length > 0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setGradeOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`/shop?${params.toString()}`);
    },
    [router, searchParams],
  );

  function setGrades(newGrades: string[]) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("grade");
    newGrades.forEach((g) => params.append("grade", g));
    params.delete("page");
    router.push(`/shop?${params.toString()}`);
  }

  function toggleGrade(g: string) {
    const next = activeGrades.includes(g)
      ? activeGrades.filter((x) => x !== g)
      : [...activeGrades, g];
    setGrades(next);
  }

  const inStock = searchParams.get("inStock") === "true";
  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";
  const hasFilters = inStock || minPrice || maxPrice || activeSport || activeGrades.length > 0;

  return (
    <aside className="w-full space-y-6 lg:w-52 lg:flex-shrink-0">
      {/* Header + clear */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-900">Filters</h2>
        {hasFilters && (
          <button
            onClick={() => {
              router.push("/shop");
              setGradeOpen(false);
            }}
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

      {/* Grade — dropdown multi-select */}
      {grades.length > 0 && (
        <div ref={dropdownRef}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Grade</p>
          {/* Trigger button */}
          <button
            onClick={() => {
              if (activeGrades.length > 0) {
                // "All Grades" behaviour: clear + close
                setGrades([]);
                setGradeOpen(false);
              } else {
                setGradeOpen((v) => !v);
              }
            }}
            className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium transition ${
              activeGrades.length > 0
                ? "border-red-300 bg-red-50 text-red-700"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <span>
              {activeGrades.length > 0
                ? activeGrades.length === 1
                  ? `Grade ${activeGrades[0]}`
                  : `${activeGrades.length} grades`
                : "All Grades"}
            </span>
            <svg
              className={`h-4 w-4 shrink-0 transition-transform ${gradeOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown list */}
          {gradeOpen && (
            <div className="mt-1 rounded-lg border border-gray-200 bg-white shadow-md">
              {grades.map((g) => {
                const checked = activeGrades.includes(g);
                return (
                  <label
                    key={g}
                    className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleGrade(g)}
                      className="h-3.5 w-3.5 rounded border-gray-300 accent-red-600"
                    />
                    <span className={checked ? "font-semibold text-red-700" : "text-gray-700"}>
                      {g}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
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
