"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import type { MessageStatus } from "@prisma/client";

interface Props {
  messageId: string;
  currentStatus: MessageStatus;
}

export default function MessageStatusButton({ messageId, currentStatus }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(status: MessageStatus) {
    setError(null);
    const res = await fetch(`/api/admin/messages/${messageId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      setError("Failed to update status.");
      return;
    }

    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {currentStatus === "READ" && (
        <button
          onClick={() => updateStatus("RESOLVED")}
          disabled={isPending}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Mark as Resolved"}
        </button>
      )}
      {currentStatus === "RESOLVED" && (
        <button
          onClick={() => updateStatus("READ")}
          disabled={isPending}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Reopen"}
        </button>
      )}
      {currentStatus === "UNREAD" && (
        <button
          onClick={() => updateStatus("READ")}
          disabled={isPending}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Mark as Read"}
        </button>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
