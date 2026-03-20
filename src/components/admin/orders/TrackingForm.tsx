"use client";

import { useState, useTransition } from "react";

export default function TrackingForm({
  orderNumber,
  initialTracking,
}: {
  orderNumber: string;
  initialTracking: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [tracking, setTracking] = useState(initialTracking ?? "");
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEmailSent(false);

    startTransition(async () => {
      const res = await fetch(`/api/admin/orders/${orderNumber}/tracking`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingNumber: tracking.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to save tracking number.");
        return;
      }
      const data = await res.json();
      setEmailSent(data.emailSent === true);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          placeholder="Enter tracking number"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          disabled={isPending}
        />
        <button
          type="submit"
          disabled={!tracking.trim() || isPending}
          className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {emailSent && !error && (
        <p className="text-sm text-green-600">
          Tracking saved. Shipping notification email sent to customer.
        </p>
      )}
      {!emailSent && !error && tracking && tracking === initialTracking && (
        <p className="text-sm text-gray-500">Current tracking: {initialTracking}</p>
      )}
    </form>
  );
}
