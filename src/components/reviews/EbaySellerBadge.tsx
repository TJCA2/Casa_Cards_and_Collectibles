import { prisma } from "@/lib/prisma";

const EBAY_STORE_URL = "https://www.ebay.com/usr/casa_cards_and_collectibles";

export default async function EbaySellerBadge() {
  const stats = await prisma.ebaySellerStats.findUnique({
    where: { id: "singleton" },
    select: { positiveFeedbackPercent: true, totalFeedbackCount: true },
  });

  if (!stats) return null;

  const pct = Number(stats.positiveFeedbackPercent).toFixed(1);

  return (
    <a
      href={EBAY_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm transition hover:border-gray-300 hover:shadow"
    >
      {/* eBay-coloured logo text */}
      <span className="font-extrabold tracking-tight" aria-hidden="true">
        <span className="text-[#e53238]">e</span>
        <span className="text-[#0064d2]">B</span>
        <span className="text-[#f5af02]">a</span>
        <span className="text-[#86b817]">y</span>
      </span>
      <span className="text-gray-700">
        <strong>{pct}%</strong> positive
        <span className="ml-1 text-gray-400">({stats.totalFeedbackCount.toLocaleString()})</span>
      </span>
      <svg
        className="h-3.5 w-3.5 flex-shrink-0 text-gray-400"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>
    </a>
  );
}
