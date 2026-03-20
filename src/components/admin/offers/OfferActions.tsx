"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";

interface Props {
  offerId: string;
}

export default function OfferActions({ offerId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDeclineNote, setShowDeclineNote] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null);

  async function handleAccept() {
    if (!confirm("Accept this offer and send the customer a purchase link?")) return;
    setLoading("accept");
    try {
      const res = await fetch(`/api/admin/offers/${offerId}/accept`, { method: "PATCH" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed to accept offer.");
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setLoading(null);
    }
  }

  async function handleDecline() {
    setLoading("decline");
    try {
      const res = await fetch(`/api/admin/offers/${offerId}/decline`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNote: adminNote.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed to decline offer.");
        return;
      }
      setShowDeclineNote(false);
      startTransition(() => router.refresh());
    } finally {
      setLoading(null);
    }
  }

  if (showDeclineNote) {
    return (
      <div className="flex flex-col gap-2 min-w-[240px]">
        <textarea
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          placeholder="Optional note to customer (max 500 chars)"
          maxLength={500}
          rows={2}
          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 focus:border-red-400 focus:outline-none resize-none"
        />
        <div className="flex gap-2">
          <button
            onClick={handleDecline}
            disabled={loading === "decline" || isPending}
            className="flex-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading === "decline" ? "Declining…" : "Confirm Decline"}
          </button>
          <button
            onClick={() => setShowDeclineNote(false)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleAccept}
        disabled={loading !== null || isPending}
        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
      >
        {loading === "accept" ? "Accepting…" : "Accept"}
      </button>
      <button
        onClick={() => setShowDeclineNote(true)}
        disabled={loading !== null || isPending}
        className="rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
      >
        Decline
      </button>
    </div>
  );
}
