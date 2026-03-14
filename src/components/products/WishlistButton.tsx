"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Props {
  productId: string;
  slug: string;
}

export default function WishlistButton({ productId, slug }: Props) {
  const { status } = useSession();
  const router = useRouter();
  const [inWishlist, setInWishlist] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch(`/api/account/wishlist/${productId}`)
      .then((r) => r.json())
      .then((d: { inWishlist?: boolean }) => setInWishlist(d.inWishlist ?? false))
      .catch(() => {});
  }, [productId, status]);

  async function handleClick() {
    if (status === "unauthenticated") {
      router.push(`/auth/login?callbackUrl=/product/${slug}`);
      return;
    }
    if (status !== "authenticated") return;

    setLoading(true);
    try {
      if (inWishlist) {
        const res = await fetch(`/api/account/wishlist/${productId}`, {
          method: "DELETE",
        });
        if (res.ok || res.status === 204) setInWishlist(false);
      } else {
        const res = await fetch("/api/account/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });
        if (res.ok) setInWishlist(true);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`flex-1 rounded-lg border py-3 text-sm font-semibold transition-colors disabled:opacity-60 ${
        inWishlist
          ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
          : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
      }`}
    >
      {inWishlist ? "♥ Wishlisted" : "♡ Add to Wishlist"}
    </button>
  );
}
