"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  id: string;
  isActive: boolean;
}

export default function ProductRowActions({ id, isActive }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleToggle() {
    const res = await fetch(`/api/admin/products/${id}/toggle`, { method: "PATCH" });
    if (res.ok) {
      startTransition(() => router.refresh());
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/admin/products/${id}/edit`}
        className="rounded px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
      >
        Edit
      </Link>
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={`rounded px-2.5 py-1 text-xs font-medium transition ${
          isActive ? "text-red-600 hover:bg-red-50" : "text-green-600 hover:bg-green-50"
        } disabled:opacity-50`}
      >
        {isPending ? "…" : isActive ? "Deactivate" : "Activate"}
      </button>
    </div>
  );
}
