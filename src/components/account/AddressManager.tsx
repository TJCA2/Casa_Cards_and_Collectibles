"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import AddressForm, { type AddressFormValues, EMPTY_ADDRESS } from "./AddressForm";

interface Address {
  id: string;
  name: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  zip: string;
  isDefault: boolean;
}

type Mode = { type: "list" } | { type: "add" } | { type: "edit"; address: Address };

export default function AddressManager({ addresses: initial }: { addresses: Address[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>({ type: "list" });
  const [addresses, setAddresses] = useState(initial);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function handleSave(values: AddressFormValues) {
    if (mode.type === "add") {
      const res = await fetch("/api/account/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Failed to save address.");
      }
      const created = (await res.json()) as Address;
      // If new address is default, clear others locally
      setAddresses((prev) =>
        values.isDefault
          ? [...prev.map((a) => ({ ...a, isDefault: false })), created]
          : [...prev, created],
      );
    } else if (mode.type === "edit") {
      const id = mode.address.id;
      const res = await fetch(`/api/account/addresses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Failed to update address.");
      }
      const updated = (await res.json()) as Address;
      setAddresses((prev) =>
        prev.map((a) => {
          if (values.isDefault && a.id !== id) return { ...a, isDefault: false };
          if (a.id === id) return updated;
          return a;
        }),
      );
    }
    setMode({ type: "list" });
    refresh();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Remove this address?")) return;
    setDeletingId(id);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/account/addresses/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setDeleteError(data.error ?? "Could not delete address.");
        return;
      }
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      refresh();
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSetDefault(id: string) {
    const res = await fetch(`/api/account/addresses/${id}/default`, { method: "PATCH" });
    if (!res.ok) return;
    setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
    refresh();
  }

  // ── Form views ──────────────────────────────────────────────────────────────

  if (mode.type === "add") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">New Address</h3>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <AddressForm
            initial={EMPTY_ADDRESS}
            onSave={handleSave}
            onCancel={() => setMode({ type: "list" })}
            submitLabel="Add Address"
          />
        </div>
      </div>
    );
  }

  if (mode.type === "edit") {
    const { address } = mode;
    const initial: AddressFormValues = {
      name: address.name,
      line1: address.line1,
      line2: address.line2 ?? "",
      city: address.city,
      state: address.state,
      zip: address.zip,
      isDefault: address.isDefault,
    };
    return (
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-900">Edit Address</h3>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <AddressForm
            initial={initial}
            onSave={handleSave}
            onCancel={() => setMode({ type: "list" })}
            submitLabel="Update Address"
          />
        </div>
      </div>
    );
  }

  // ── List view ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Saved Addresses</h2>
        <button
          onClick={() => setMode({ type: "add" })}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          + Add New Address
        </button>
      </div>

      {deleteError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {deleteError}
          <button className="ml-2 underline" onClick={() => setDeleteError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {addresses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-14 text-center">
          <p className="text-sm text-gray-500">No saved addresses yet.</p>
          <button
            onClick={() => setMode({ type: "add" })}
            className="mt-3 text-sm font-medium text-red-600 hover:text-red-700"
          >
            Add your first address →
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <div
              key={address.id}
              className={`relative rounded-xl border bg-white p-5 ${
                address.isDefault ? "border-red-300 ring-1 ring-red-200" : "border-gray-200"
              }`}
            >
              {address.isDefault && (
                <span className="absolute right-3 top-3 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                  Default
                </span>
              )}

              <address className="not-italic text-sm leading-relaxed text-gray-700">
                <p className="font-semibold text-gray-900">{address.name}</p>
                <p>{address.line1}</p>
                {address.line2 && <p>{address.line2}</p>}
                <p>
                  {address.city}, {address.state} {address.zip}
                </p>
                <p>US</p>
              </address>

              <div className="mt-4 flex flex-wrap gap-2">
                {!address.isDefault && (
                  <button
                    onClick={() => handleSetDefault(address.id)}
                    disabled={isPending}
                    className="text-xs font-medium text-gray-500 hover:text-gray-800 disabled:opacity-50"
                  >
                    Set as default
                  </button>
                )}
                <button
                  onClick={() => setMode({ type: "edit", address })}
                  className="text-xs font-medium text-gray-500 hover:text-gray-800"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(address.id)}
                  disabled={deletingId === address.id}
                  className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
                >
                  {deletingId === address.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
