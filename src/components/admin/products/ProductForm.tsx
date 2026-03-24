"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
interface InitialValues {
  title?: string;
  description?: string;
  price?: number;
  compareAtPrice?: number | null;
  stockQuantity?: number;
  lowStockThreshold?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  sport?: string | null;
  grade?: string | null;
  imageUrls?: string[];
  isEbaySynced?: boolean;
}

interface Props {
  mode: "new" | "edit";
  productId?: string;
  sports: string[];
  initial?: InitialValues;
}

export default function ProductForm({ mode, productId, sports, initial = {} }: Props) {
  const router = useRouter();

  const [title, setTitle] = useState(initial.title ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [price, setPrice] = useState(String(initial.price ?? ""));
  const [compareAtPrice, setCompareAtPrice] = useState(
    initial.compareAtPrice != null ? String(initial.compareAtPrice) : "",
  );
  const [stockQuantity, setStockQuantity] = useState(String(initial.stockQuantity ?? "0"));
  const [lowStockThreshold, setLowStockThreshold] = useState(
    String(initial.lowStockThreshold ?? "5"),
  );
  const [isActive, setIsActive] = useState(initial.isActive ?? true);
  const [isFeatured, setIsFeatured] = useState(initial.isFeatured ?? false);
  const [sport, setSport] = useState(initial.sport ?? "");
  const [grade, setGrade] = useState(initial.grade ?? "");
  const [imageUrls, setImageUrls] = useState<string[]>(
    initial.imageUrls?.length ? initial.imageUrls : [""],
  );

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  function addImageUrl() {
    setImageUrls((prev) => [...prev, ""]);
  }

  function removeImageUrl(i: number) {
    setImageUrls((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateImageUrl(i: number, val: string) {
    setImageUrls((prev) => prev.map((u, idx) => (idx === i ? val : u)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setGlobalError(null);

    const priceNum = parseFloat(price);
    const compareNum = compareAtPrice ? parseFloat(compareAtPrice) : null;
    const stockNum = parseInt(stockQuantity, 10);
    const thresholdNum = parseInt(lowStockThreshold, 10);

    // Basic client-side validation
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "Title is required";
    if (isNaN(priceNum) || priceNum <= 0) errs.price = "Enter a valid price";
    if (compareAtPrice && (isNaN(compareNum!) || compareNum! <= 0))
      errs.compareAtPrice = "Enter a valid compare price";
    if (isNaN(stockNum) || stockNum < 0) errs.stockQuantity = "Enter a valid stock quantity";
    if (isNaN(thresholdNum) || thresholdNum < 0) errs.lowStockThreshold = "Enter a valid threshold";

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const validImageUrls = imageUrls.filter((u) => u.trim() !== "");

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      price: priceNum,
      compareAtPrice: compareNum ?? null,
      stockQuantity: stockNum,
      lowStockThreshold: thresholdNum,
      isActive,
      isFeatured,
      sport: sport || null,
      grade: grade || null,
      imageUrls: validImageUrls,
    };

    setSubmitting(true);

    try {
      const url = mode === "new" ? "/api/admin/products" : `/api/admin/products/${productId}`;
      const method = mode === "new" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.issues) {
          const fieldErrors: Record<string, string> = {};
          for (const [field, msgs] of Object.entries(data.issues)) {
            fieldErrors[field] = (msgs as string[])[0] ?? "Invalid";
          }
          setErrors(fieldErrors);
        } else {
          setGlobalError(data.error ?? "Something went wrong.");
        }
        return;
      }

      router.push("/admin/products");
      router.refresh();
    } catch {
      setGlobalError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {initial.isEbaySynced && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          ⚠️ This product is synced from eBay. Manual changes may be overwritten on the next sync.
        </div>
      )}

      {globalError && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{globalError}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-5">
          {/* Title */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              maxLength={500}
            />
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              maxLength={50000}
            />
          </div>

          {/* Price row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Price ($) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                step="0.01"
                min="0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              {errors.price && <p className="mt-1 text-xs text-red-600">{errors.price}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Compare Price ($)
              </label>
              <input
                type="number"
                value={compareAtPrice}
                onChange={(e) => setCompareAtPrice(e.target.value)}
                step="0.01"
                min="0"
                placeholder="Optional"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              {errors.compareAtPrice && (
                <p className="mt-1 text-xs text-red-600">{errors.compareAtPrice}</p>
              )}
            </div>
          </div>

          {/* Stock row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Stock Quantity</label>
              <input
                type="number"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                min="0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              {errors.stockQuantity && (
                <p className="mt-1 text-xs text-red-600">{errors.stockQuantity}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Low Stock Alert At
              </label>
              <input
                type="number"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                min="0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              {errors.lowStockThreshold && (
                <p className="mt-1 text-xs text-red-600">{errors.lowStockThreshold}</p>
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Sport */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Sport</label>
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="">— No sport —</option>
              {sports.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Grade */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Grade</label>
            <input
              type="text"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="e.g. PSA 10, BGS 9.5"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              maxLength={50}
            />
            <p className="mt-1 text-xs text-gray-400">Leave blank for ungraded cards.</p>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isActive ? "bg-red-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  isActive ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-sm font-medium text-gray-700">
              {isActive ? "Active (visible in store)" : "Inactive (hidden from store)"}
            </span>
          </div>

          {/* Featured toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={isFeatured}
              onClick={() => setIsFeatured((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isFeatured ? "bg-yellow-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  isFeatured ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-sm font-medium text-gray-700">
              {isFeatured ? "Featured (shown on home page)" : "Not featured"}
            </span>
          </div>

          {/* Image URLs */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Image URLs</label>
            <div className="space-y-2">
              {imageUrls.map((url, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => updateImageUrl(i, e.target.value)}
                    placeholder="https://..."
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  {imageUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeImageUrl(i)}
                      className="rounded-lg border border-gray-300 px-2 py-2 text-gray-400 hover:border-red-300 hover:text-red-500"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            {imageUrls.length < 10 && (
              <button
                type="button"
                onClick={addImageUrl}
                className="mt-2 text-xs font-medium text-red-600 hover:underline"
              >
                + Add another image
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 border-t border-gray-100 pt-6">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-red-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Saving…" : mode === "new" ? "Create Product" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/products")}
          className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
