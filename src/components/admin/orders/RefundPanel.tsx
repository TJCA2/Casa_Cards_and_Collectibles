"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function RefundPanel({
  orderNumber,
  totalAmount,
}: {
  orderNumber: string;
  totalAmount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [refundType, setRefundType] = useState<"full" | "partial">("full");
  const [partialAmount, setPartialAmount] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function openConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (refundType === "partial") {
      const val = parseFloat(partialAmount);
      if (isNaN(val) || val <= 0 || val > totalAmount) {
        setError(`Enter an amount between $0.01 and $${totalAmount.toFixed(2)}.`);
        return;
      }
    }
    setShowModal(true);
  }

  function handleConfirm() {
    setShowModal(false);
    setError(null);

    const amountCents =
      refundType === "partial" ? Math.round(parseFloat(partialAmount) * 100) : undefined;

    startTransition(async () => {
      const res = await fetch(`/api/admin/orders/${orderNumber}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(amountCents !== undefined ? { amount: amountCents } : {}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Refund failed.");
        return;
      }
      setSuccess(true);
      router.refresh();
    });
  }

  if (success) {
    return <p className="text-sm text-green-600">Refund processed successfully.</p>;
  }

  return (
    <>
      <form onSubmit={openConfirm} className="space-y-3">
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              value="full"
              checked={refundType === "full"}
              onChange={() => setRefundType("full")}
            />
            Full refund (${totalAmount.toFixed(2)})
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              value="partial"
              checked={refundType === "partial"}
              onChange={() => setRefundType("partial")}
            />
            Partial refund
          </label>
        </div>

        {refundType === "partial" && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">$</span>
            <input
              type="number"
              min="0.01"
              max={totalAmount}
              step="0.01"
              value={partialAmount}
              onChange={(e) => setPartialAmount(e.target.value)}
              placeholder="0.00"
              className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
        >
          {isPending ? "Processing…" : "Issue Refund via Stripe"}
        </button>
      </form>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-2xl bg-white p-6 shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Refund</h3>
            <p className="text-sm text-gray-600 mb-4">
              {refundType === "full"
                ? `Issue a full refund of $${totalAmount.toFixed(2)} for order ${orderNumber}?`
                : `Issue a partial refund of $${parseFloat(partialAmount).toFixed(2)} for order ${orderNumber}?`}{" "}
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Confirm Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
