"use client";

import { useRouter } from "next/navigation";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "price-asc", label: "Price: Low → High" },
  { value: "price-desc", label: "Price: High → Low" },
  { value: "grade-asc", label: "Grade: Low → High" },
  { value: "grade-desc", label: "Grade: High → Low" },
];

type Params = { [key: string]: string | string[] | undefined };

export default function SortSelect({ current, params }: { current: string; params: Params }) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const sp = new URLSearchParams(
      Object.entries(params).flatMap(([k, v]) =>
        Array.isArray(v) ? v.map((val) => [k, val]) : v ? [[k, v]] : [],
      ),
    );
    sp.set("sort", e.target.value);
    sp.delete("page");
    router.push(`/shop?${sp.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort-select" className="text-sm text-gray-500 whitespace-nowrap">
        Sort By
      </label>
      <select
        id="sort-select"
        value={current || "newest"}
        onChange={handleChange}
        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
