"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import ProductRowActions from "./ProductRowActions";
export interface AdminProduct {
  id: string;
  title: string;
  slug: string | null;
  price: number;
  sport: string | null;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  lastSyncedAt: string | null;
  category: { name: string } | null;
  images: { url: string }[];
}

interface Props {
  products: AdminProduct[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ProductsTable({ products }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkPending, startBulkTransition] = useTransition();
  const [bulkError, setBulkError] = useState<string | null>(null);

  const allChecked = products.length > 0 && selected.size === products.length;
  const someChecked = selected.size > 0 && !allChecked;

  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(products.map((p) => p.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleBulk(action: "activate" | "deactivate" | "delete") {
    if (selected.size === 0) return;
    if (
      action === "delete" &&
      !confirm(`Delete ${selected.size} product(s)? This cannot be undone.`)
    )
      return;

    setBulkError(null);
    const res = await fetch("/api/admin/products/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ids: Array.from(selected) }),
    });
    const data = await res.json();

    if (!res.ok) {
      setBulkError(data.error ?? "Bulk action failed.");
      return;
    }

    if (data.skippedMessage) setBulkError(data.skippedMessage);
    setSelected(new Set());
    startBulkTransition(() => router.refresh());
  }

  if (products.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
        <p className="text-gray-400">No products found.</p>
        <Link
          href="/admin/products/new"
          className="mt-4 inline-block rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          Add First Product
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white shadow-sm">
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 border-b border-gray-100 bg-red-50 px-6 py-3">
          <span className="text-sm font-medium text-gray-700">{selected.size} selected</span>
          <button
            onClick={() => handleBulk("activate")}
            disabled={bulkPending}
            className="rounded px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
          >
            Activate
          </button>
          <button
            onClick={() => handleBulk("deactivate")}
            disabled={bulkPending}
            className="rounded px-3 py-1 text-xs font-medium text-orange-700 hover:bg-orange-100 disabled:opacity-50"
          >
            Deactivate
          </button>
          <button
            onClick={() => handleBulk("delete")}
            disabled={bulkPending}
            className="rounded px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            Delete
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs text-gray-400 hover:text-gray-600"
          >
            Clear
          </button>
        </div>
      )}

      {bulkError && (
        <div className="border-b border-orange-100 bg-orange-50 px-6 py-2 text-sm text-orange-700">
          {bulkError}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-400">
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => {
                    if (el) el.indeterminate = someChecked;
                  }}
                  onChange={toggleAll}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Sport</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last Sync</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {products.map((product) => {
              const isLowStock =
                product.isActive && product.stockQuantity <= product.lowStockThreshold;
              const thumb = product.images[0]?.url;

              return (
                <tr
                  key={product.id}
                  className={`hover:bg-gray-50 ${selected.has(product.id) ? "bg-blue-50" : ""}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(product.id)}
                      onChange={() => toggleOne(product.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-gray-100">
                        {thumb ? (
                          <Image
                            src={thumb}
                            alt={product.title}
                            width={40}
                            height={40}
                            className="h-full w-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-gray-300">
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="max-w-xs truncate font-medium text-gray-800">
                          {product.title}
                        </p>
                        {product.category && (
                          <p className="text-xs text-gray-400">{product.category.name}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    ${Number(product.price).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={isLowStock ? "font-semibold text-orange-600" : "text-gray-700"}
                    >
                      {product.stockQuantity}
                    </span>
                    {isLowStock && (
                      <span className="ml-1.5 inline-block rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700">
                        Low
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {product.sport ? (
                      <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {product.sport}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        product.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {product.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {product.lastSyncedAt ? formatDate(product.lastSyncedAt) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <ProductRowActions id={product.id} isActive={product.isActive} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
