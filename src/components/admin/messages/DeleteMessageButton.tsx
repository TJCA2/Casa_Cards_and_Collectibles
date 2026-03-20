"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  messageId: string;
}

export default function DeleteMessageButton({ messageId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm("Delete this message? This cannot be undone.")) return;

    setError(null);
    const res = await fetch(`/api/admin/messages/${messageId}`, { method: "DELETE" });

    if (!res.ok) {
      setError("Failed to delete message.");
      return;
    }

    startTransition(() => router.push("/admin/messages"));
  }

  return (
    <>
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60 transition-colors"
      >
        {isPending ? "Deleting…" : "Delete"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </>
  );
}
