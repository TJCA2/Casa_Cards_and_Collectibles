"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import DiscountForm, { type DiscountFormValues } from "./DiscountForm";
import OrderStatusBadge from "@/components/account/OrderStatusBadge";
import { type OrderStatus } from "@prisma/client";

export interface AdminDiscount {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  minOrderAmount: number | null;
  expiresAt: string | null;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface DiscountOrder {
  orderNumber: string;
  customerEmail: string | null;
  customerName: string | null;
  discountAmount: number | null;
  status: OrderStatus;
  createdAt: string;
}

export default function DiscountsTable({ discounts }: { discounts: AdminDiscount[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<DiscountOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(values: DiscountFormValues) {
    const res = await fetch("/api/admin/discounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: values.code,
        type: values.type,
        value: parseFloat(values.value),
        minOrderAmount: values.minOrderAmount ? parseFloat(values.minOrderAmount) : null,
        expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : null,
        maxUses: values.maxUses ? parseInt(values.maxUses, 10) : null,
        isActive: values.isActive,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Failed to create discount.");
    }
    setShowCreate(false);
    router.refresh();
  }

  async function handleEdit(id: string, values: DiscountFormValues) {
    const res = await fetch(`/api/admin/discounts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: values.code,
        type: values.type,
        value: parseFloat(values.value),
        minOrderAmount: values.minOrderAmount ? parseFloat(values.minOrderAmount) : null,
        expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : null,
        maxUses: values.maxUses ? parseInt(values.maxUses, 10) : null,
        isActive: values.isActive,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Failed to update discount.");
    }
    setEditingId(null);
    router.refresh();
  }

  function handleToggle(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/discounts/${id}/toggle`, { method: "PATCH" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Toggle failed.");
        return;
      }
      router.refresh();
    });
  }

  function handleDelete(id: string, code: string) {
    if (!window.confirm(`Delete code "${code}"? This cannot be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/discounts/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Delete failed.");
        return;
      }
      router.refresh();
    });
  }

  async function handleExpand(id: string, _code: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    setExpandedOrders([]);
    setLoadingOrders(true);
    try {
      const res = await fetch(`/api/admin/discounts/${id}/orders`);
      if (res.ok) {
        const data = await res.json();
        setExpandedOrders(data.orders ?? []);
      }
    } finally {
      setLoadingOrders(false);
    }
  }

  function formatValue(d: AdminDiscount) {
    return d.type === "PERCENTAGE" ? `${d.value}%` : `$${d.value.toFixed(2)}`;
  }

  function isExpired(d: AdminDiscount) {
    return d.expiresAt ? new Date(d.expiresAt) < new Date() : false;
  }

  const editingDiscount = editingId ? discounts.find((d) => d.id === editingId) : null;

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            setShowCreate(true);
            setEditingId(null);
          }}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
        >
          + Create New Code
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-gray-900">Create Discount Code</h3>
          <DiscountForm
            onSave={handleCreate}
            onCancel={() => setShowCreate(false)}
            submitLabel="Create Code"
          />
        </div>
      )}

      {/* Edit form */}
      {editingDiscount && (
        <div className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-gray-900">
            Edit — {editingDiscount.code}
          </h3>
          <DiscountForm
            initial={{
              code: editingDiscount.code,
              type: editingDiscount.type,
              value: String(editingDiscount.value),
              minOrderAmount:
                editingDiscount.minOrderAmount != null
                  ? String(editingDiscount.minOrderAmount)
                  : "",
              expiresAt: editingDiscount.expiresAt
                ? new Date(editingDiscount.expiresAt).toISOString().slice(0, 16)
                : "",
              maxUses: editingDiscount.maxUses != null ? String(editingDiscount.maxUses) : "",
              isActive: editingDiscount.isActive,
            }}
            onSave={(values) => handleEdit(editingDiscount.id, values)}
            onCancel={() => setEditingId(null)}
            submitLabel="Save Changes"
          />
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Code</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Type</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Value</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Min Order</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Expiry</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Uses</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {discounts.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  No discount codes yet.
                </td>
              </tr>
            ) : (
              discounts.map((d) => (
                <>
                  <tr
                    key={d.id}
                    className={`transition-colors ${isPending ? "opacity-60" : ""} hover:bg-gray-50`}
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleExpand(d.id, d.code)}
                        className="font-mono font-semibold text-red-600 hover:text-red-700 hover:underline"
                      >
                        {d.code}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {d.type === "PERCENTAGE" ? "Percentage" : "Fixed"}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{formatValue(d)}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {d.minOrderAmount != null ? `$${d.minOrderAmount.toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {d.expiresAt ? (
                        <span className={isExpired(d) ? "text-red-500" : "text-gray-500"}>
                          {new Date(d.expiresAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                          {isExpired(d) && " (expired)"}
                        </span>
                      ) : (
                        <span className="text-gray-400">Never</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {d.usedCount}
                      {d.maxUses != null && <span className="text-gray-400"> / {d.maxUses}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          d.isActive && !isExpired(d)
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {d.isActive && !isExpired(d) ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingId(d.id);
                            setShowCreate(false);
                          }}
                          className="rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggle(d.id)}
                          disabled={isPending}
                          className="rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                        >
                          {d.isActive ? "Deactivate" : "Activate"}
                        </button>
                        {d.usedCount === 0 && (
                          <button
                            onClick={() => handleDelete(d.id, d.code)}
                            disabled={isPending}
                            className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded usage detail */}
                  {expandedId === d.id && (
                    <tr key={`${d.id}-detail`}>
                      <td colSpan={8} className="bg-gray-50 px-6 py-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Orders using {d.code}
                        </p>
                        {loadingOrders ? (
                          <p className="text-sm text-gray-400">Loading…</p>
                        ) : expandedOrders.length === 0 ? (
                          <p className="text-sm text-gray-400">
                            No orders have used this code yet.
                          </p>
                        ) : (
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-xs font-semibold text-gray-500">
                                <th className="pb-1">Order</th>
                                <th className="pb-1">Customer</th>
                                <th className="pb-1">Date</th>
                                <th className="pb-1">Status</th>
                                <th className="pb-1 text-right">Saved</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {expandedOrders.map((o) => (
                                <tr key={o.orderNumber}>
                                  <td className="py-1.5 font-medium text-red-600">
                                    {o.orderNumber}
                                  </td>
                                  <td className="py-1.5 text-gray-600">
                                    {o.customerName ?? o.customerEmail ?? "—"}
                                  </td>
                                  <td className="py-1.5 text-gray-500">
                                    {new Date(o.createdAt).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })}
                                  </td>
                                  <td className="py-1.5">
                                    <OrderStatusBadge status={o.status} />
                                  </td>
                                  <td className="py-1.5 text-right font-medium text-green-700">
                                    {o.discountAmount != null
                                      ? `−$${o.discountAmount.toFixed(2)}`
                                      : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
