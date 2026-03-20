"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import OfferModal from "./OfferModal";

interface Props {
  productId: string;
  productTitle: string;
  price: number;
  slug: string;
  isLoggedIn: boolean;
}

export default function MakeOfferButton({
  productId,
  productTitle,
  price,
  slug,
  isLoggedIn,
}: Props) {
  const router = useRouter();
  const [hasPendingOffer, setHasPendingOffer] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Check if user already has a pending offer on this product
  useEffect(() => {
    if (!isLoggedIn) return;
    fetch(`/api/offers/${productId}/status`)
      .then((r) => r.json())
      .then((data) => {
        if (data.hasOffer && data.status === "PENDING") {
          setHasPendingOffer(true);
        }
      })
      .catch(() => {});
  }, [productId, isLoggedIn]);

  function handleClick() {
    if (!isLoggedIn) {
      router.push(`/auth/login?callbackUrl=/product/${slug}`);
      return;
    }
    setModalOpen(true);
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={hasPendingOffer}
        title={hasPendingOffer ? "You already have a pending offer on this item" : undefined}
        className={`flex-1 sm:flex-none rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors ${
          hasPendingOffer
            ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400"
            : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
        }`}
      >
        {hasPendingOffer ? "Offer Pending" : "Make an Offer"}
      </button>

      {modalOpen && (
        <OfferModal
          productId={productId}
          productTitle={productTitle}
          price={price}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setHasPendingOffer(true);
            setModalOpen(false);
          }}
        />
      )}
    </>
  );
}
