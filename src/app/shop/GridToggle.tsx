"use client";

import { useRouter } from "next/navigation";

type Params = { [key: string]: string | string[] | undefined };

export default function GridToggle({ cols, params }: { cols: 3 | 4; params: Params }) {
  const router = useRouter();

  function setcols(n: 3 | 4) {
    const sp = new URLSearchParams(
      Object.entries(params).flatMap(([k, v]) =>
        Array.isArray(v) ? v.map((val) => [k, val]) : v ? [[k, v]] : [],
      ),
    );
    if (n === 4) sp.delete("cols");
    else sp.set("cols", String(n));
    sp.delete("page");
    router.push(`/shop?${sp.toString()}`);
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-0.5">
      {/* 3-col icon */}
      <button
        onClick={() => setcols(3)}
        title="3 columns"
        className={`rounded-md p-1.5 transition ${
          cols === 3 ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-600"
        }`}
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
          <rect x="1" y="1" width="4" height="14" rx="1" />
          <rect x="6" y="1" width="4" height="14" rx="1" />
          <rect x="11" y="1" width="4" height="14" rx="1" />
        </svg>
      </button>
      {/* 4-col icon */}
      <button
        onClick={() => setcols(4)}
        title="4 columns"
        className={`rounded-md p-1.5 transition ${
          cols === 4 ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-600"
        }`}
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
          <rect x="0.5" y="1" width="3" height="14" rx="1" />
          <rect x="4.5" y="1" width="3" height="14" rx="1" />
          <rect x="8.5" y="1" width="3" height="14" rx="1" />
          <rect x="12.5" y="1" width="3" height="14" rx="1" />
        </svg>
      </button>
    </div>
  );
}
