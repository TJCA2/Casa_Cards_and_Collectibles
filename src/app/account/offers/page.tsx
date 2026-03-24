import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import Image from "next/image";
import type { OfferStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ── Status badge ───────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<OfferStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  ACCEPTED: "bg-green-100 text-green-800",
  DECLINED: "bg-red-100 text-red-700",
  EXPIRED: "bg-gray-100 text-gray-500",
  PURCHASED: "bg-blue-100 text-blue-700",
};

const STATUS_LABELS: Record<OfferStatus, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  EXPIRED: "Expired",
  PURCHASED: "Purchased",
};

// ── Countdown helper ──────────────────────────────────────────────────────────

function formatCountdown(expiresAt: Date): string {
  const ms = expiresAt.getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export const metadata = { title: "My Offers" };

export default async function AccountOffersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) notFound();

  const offers = await prisma.offer.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          slug: true,
          price: true,
          images: { where: { sortOrder: 0 }, take: 1 },
        },
      },
    },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">My Offers</h1>

      {offers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <svg
              className="h-7 w-7 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
              />
            </svg>
          </div>
          <p className="text-base font-semibold text-gray-900">No offers yet</p>
          <p className="mt-1 text-sm text-gray-500">
            Browse our shop and make an offer on any listing!
          </p>
          <Link
            href="/shop"
            className="mt-5 inline-block rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
          >
            Browse Shop
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {offers.map((offer) => {
            const askingPrice = parseFloat(offer.product.price.toString());
            const offerPrice = parseFloat(offer.offerPrice.toString());
            const pct = ((offerPrice / askingPrice) * 100).toFixed(1);
            const imageUrl = offer.product.images[0]?.url ?? null;
            const isAccepted = offer.status === "ACCEPTED";
            const tokenStillValid =
              isAccepted && offer.tokenExpiresAt && offer.tokenExpiresAt > new Date();

            return (
              <div
                key={offer.id}
                className={`rounded-2xl border p-4 transition-colors ${
                  isAccepted && tokenStillValid
                    ? "border-green-200 bg-green-50"
                    : "border-gray-100 bg-white"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Product image */}
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={offer.product.title}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <svg
                          className="h-6 w-6 text-gray-300"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/product/${offer.product.slug}`}
                        className="line-clamp-2 text-sm font-semibold text-gray-900 hover:text-red-600"
                      >
                        {offer.product.title}
                      </Link>
                      <span
                        className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[offer.status]}`}
                      >
                        {STATUS_LABELS[offer.status]}
                      </span>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <span className="font-semibold text-gray-900">
                        Your offer: ${offerPrice.toFixed(2)}
                      </span>
                      <span className="text-gray-400">Asking: ${askingPrice.toFixed(2)}</span>
                      <span className="text-gray-400">{pct}% of asking</span>
                    </div>

                    <p className="mt-1 text-xs text-gray-400">
                      Submitted{" "}
                      {new Date(offer.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>

                    {/* Accepted — show purchase CTA with countdown */}
                    {isAccepted && offer.purchaseToken && tokenStillValid && (
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <Link
                          href={`/checkout?offerToken=${offer.purchaseToken}`}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
                        >
                          Purchase Now →
                        </Link>
                        <span className="text-xs font-medium text-green-700">
                          ⏱ {formatCountdown(offer.tokenExpiresAt!)}
                        </span>
                      </div>
                    )}

                    {/* Accepted but token expired */}
                    {isAccepted && !tokenStillValid && (
                      <p className="mt-2 text-xs text-red-500">Purchase window has expired.</p>
                    )}

                    {/* Declined with note */}
                    {offer.status === "DECLINED" && offer.adminNote && (
                      <p className="mt-2 text-xs text-gray-500 italic">Note: {offer.adminNote}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
