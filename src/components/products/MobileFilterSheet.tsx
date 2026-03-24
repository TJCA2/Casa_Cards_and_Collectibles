"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useRef, useEffect } from "react";

interface Props {
  sports: string[];
  activeSport: string;
  grades: string[];
  activeGrades: string[];
}

export default function MobileFilterSheet({ sports, activeSport, grades, activeGrades }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";
  const activeCount = (activeSport ? 1 : 0) + activeGrades.length + (minPrice || maxPrice ? 1 : 0);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
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

  const dropdownRef = useRef<HTMLDivElement>(null);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-gray-300"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 8h10M11 12h2" />
        </svg>
        Filters
        {activeCount > 0 && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
            {activeCount}
          </span>
        )}
      </button>

      {/* Backdrop + sheet */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsOpen(false)} />

          {/* Sheet */}
          <div className="relative flex max-h-[85dvh] flex-col rounded-t-2xl bg-white shadow-xl">
            {/* Sheet header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-base font-semibold text-gray-900">Filters</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close filters"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable filter content */}
            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
              {/* Sport */}
              {sports.length > 0 && (
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Sport
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setParam("sport", null)}
                      className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                        !activeSport
                          ? "border-red-600 bg-red-600 text-white"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      All Sports
                    </button>
                    {sports.map((s) => (
                      <button
                        key={s}
                        onClick={() => setParam("sport", s)}
                        className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                          activeSport === s
                            ? "border-red-600 bg-red-600 text-white"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Grade */}
              {grades.length > 0 && (
                <div ref={dropdownRef}>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Grade
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setGrades([])}
                      className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                        activeGrades.length === 0
                          ? "border-red-600 bg-red-600 text-white"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      All Grades
                    </button>
                    {grades.map((g) => (
                      <button
                        key={g}
                        onClick={() => toggleGrade(g)}
                        className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                          activeGrades.includes(g)
                            ? "border-red-600 bg-red-600 text-white"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Price range */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
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
                  className="flex flex-col gap-3"
                >
                  <div className="flex items-center gap-2">
                    <input
                      name="minPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Min $"
                      defaultValue={minPrice}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
                    />
                    <span className="text-gray-400">–</span>
                    <input
                      name="maxPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Max $"
                      defaultValue={maxPrice}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Apply Price
                  </button>
                </form>
              </div>

              {/* Clear all */}
              {activeCount > 0 && (
                <button
                  onClick={() => {
                    router.push("/shop");
                  }}
                  className="w-full text-sm text-red-600 hover:text-red-700"
                >
                  Clear all filters
                </button>
              )}
            </div>

            {/* Footer CTA */}
            <div className="border-t border-gray-100 px-5 py-4">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full rounded-xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700"
              >
                Show Results
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
