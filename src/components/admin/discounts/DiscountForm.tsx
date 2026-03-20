"use client";

import { useState } from "react";

export interface DiscountFormValues {
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: string;
  minOrderAmount: string;
  expiresAt: string;
  maxUses: string;
  isActive: boolean;
}

interface Props {
  initial?: Partial<DiscountFormValues>;
  onSave: (values: DiscountFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

function randomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function validate(v: DiscountFormValues): string | null {
  if (!v.code.trim()) return "Code is required.";
  if (!v.value || isNaN(Number(v.value)) || Number(v.value) <= 0)
    return "Value must be a positive number.";
  if (v.type === "PERCENTAGE" && Number(v.value) > 100) return "Percentage cannot exceed 100.";
  if (v.minOrderAmount && (isNaN(Number(v.minOrderAmount)) || Number(v.minOrderAmount) <= 0))
    return "Min order amount must be a positive number.";
  if (
    v.maxUses &&
    (isNaN(Number(v.maxUses)) || !Number.isInteger(Number(v.maxUses)) || Number(v.maxUses) <= 0)
  )
    return "Max uses must be a positive integer.";
  return null;
}

const empty: DiscountFormValues = {
  code: "",
  type: "PERCENTAGE",
  value: "",
  minOrderAmount: "",
  expiresAt: "",
  maxUses: "",
  isActive: true,
};

export default function DiscountForm({ initial, onSave, onCancel, submitLabel = "Save" }: Props) {
  const [form, setForm] = useState<DiscountFormValues>({ ...empty, ...initial });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set(field: keyof DiscountFormValues, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate(form);
    if (err) {
      setError(err);
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...form, code: form.code.toUpperCase() });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Code */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Code</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={form.code}
            onChange={(e) => set("code", e.target.value.toUpperCase())}
            placeholder="SUMMER20"
            maxLength={50}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono uppercase focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          <button
            type="button"
            onClick={() => set("code", randomCode())}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Generate
          </button>
        </div>
      </div>

      {/* Type + Value */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Type</label>
          <select
            value={form.type}
            onChange={(e) => set("type", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="PERCENTAGE">Percentage (%)</option>
            <option value="FIXED">Fixed ($)</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Value ({form.type === "PERCENTAGE" ? "%" : "$"})
          </label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            max={form.type === "PERCENTAGE" ? "100" : undefined}
            value={form.value}
            onChange={(e) => set("value", e.target.value)}
            placeholder={form.type === "PERCENTAGE" ? "10" : "5.00"}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
      </div>

      {/* Min Order + Max Uses */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Min Order Amount <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={form.minOrderAmount}
            onChange={(e) => set("minOrderAmount", e.target.value)}
            placeholder="25.00"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Max Uses <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="number"
            min="1"
            step="1"
            value={form.maxUses}
            onChange={(e) => set("maxUses", e.target.value)}
            placeholder="Unlimited"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
      </div>

      {/* Expiry */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Expires At <span className="text-gray-400">(optional)</span>
        </label>
        <input
          type="datetime-local"
          value={form.expiresAt}
          onChange={(e) => set("expiresAt", e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
        />
      </div>

      {/* Active toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => set("isActive", !form.isActive)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            form.isActive ? "bg-red-600" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              form.isActive ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        <span className="text-sm font-medium text-gray-700">
          {form.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
