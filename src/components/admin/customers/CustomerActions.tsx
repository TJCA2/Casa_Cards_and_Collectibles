"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function CustomerActions({
  customerId,
  currentAdminId,
  emailVerified,
  banned,
}: {
  customerId: string;
  currentAdminId: string;
  emailVerified: boolean;
  banned: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isSelf = customerId === currentAdminId;

  async function doAction(action: "verify" | "ban" | "unban") {
    setError(null);
    const confirmed = window.confirm(
      action === "ban"
        ? "Ban this account? They will not be able to log in."
        : action === "unban"
          ? "Unban this account?"
          : "Mark email as verified?",
    );
    if (!confirmed) return;

    startTransition(async () => {
      const res = await fetch(`/api/admin/customers/${customerId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Action failed.");
        return;
      }
      router.refresh();
    });
  }

  const hasActions = !emailVerified || (!banned && !isSelf) || banned;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {!emailVerified && (
          <button
            onClick={() => doAction("verify")}
            disabled={isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Verify Email
          </button>
        )}
        {!banned && !isSelf && (
          <button
            onClick={() => doAction("ban")}
            disabled={isPending}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            Ban Account
          </button>
        )}
        {banned && (
          <button
            onClick={() => doAction("unban")}
            disabled={isPending}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            Unban Account
          </button>
        )}
        {!hasActions && (
          <p className="text-sm text-gray-400">
            {isSelf ? "You cannot modify your own account." : "No actions available."}
          </p>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {isPending && <p className="text-sm text-gray-500">Saving…</p>}
    </div>
  );
}
