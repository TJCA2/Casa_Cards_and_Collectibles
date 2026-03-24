import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/products/ProductCard";
import FeaturedCarousel from "@/components/products/FeaturedCarousel";
import NewsletterPopup from "@/components/homepage/NewsletterPopup";
import EbayReviewsCarousel from "@/components/reviews/EbayReviewsCarousel";

// Revalidate every hour — homepage data (featured products, newest listings, reviews)
// changes only when eBay sync runs (every 6 hours). ISR works here because this
// route uses no dynamic functions (no cookies/headers/getServerSession).
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Casa Cards & Collectibles | Sports Cards & Trading Card Store",
  description:
    "Shop baseball cards, basketball cards, football cards, and sports collectibles. Trusted eBay seller with 100% positive feedback. Fast shipping on all orders.",
  openGraph: {
    title: "Casa Cards & Collectibles | Sports Cards & Trading Card Store",
    description:
      "Shop baseball cards, basketball cards, football cards, and sports collectibles. Trusted eBay seller with 100% positive feedback.",
    type: "website",
  },
};

// ── Data fetching ──────────────────────────────────────────────────────────────

async function getFeaturedProducts() {
  return prisma.product.findMany({
    where: { isActive: true, isFeatured: true },
    orderBy: { updatedAt: "desc" },
    take: 20,
    include: { images: { where: { sortOrder: 0 }, take: 1 } },
  });
}

async function getNewestProducts() {
  return prisma.product.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    take: 8,
    include: { images: { where: { sortOrder: 0 }, take: 1 } },
  });
}

function derivePositivePct(stats: {
  positiveFeedbackPercent: { toNumber?: () => number } | number | string;
  positiveFeedbackCount: number;
  negativeFeedbackCount: number;
  neutralFeedbackCount: number;
}): number {
  const stored =
    typeof stats.positiveFeedbackPercent === "object" &&
    stats.positiveFeedbackPercent !== null &&
    "toNumber" in stats.positiveFeedbackPercent
      ? stats.positiveFeedbackPercent.toNumber()
      : Number(stats.positiveFeedbackPercent);
  if (stored > 0) return stored;
  const denom =
    stats.positiveFeedbackCount + stats.negativeFeedbackCount + stats.neutralFeedbackCount;
  return denom > 0 ? Math.round((stats.positiveFeedbackCount / denom) * 1000) / 10 : 0;
}

// eBay auto-generates this text when buyers don't write a custom comment
const GENERIC_REVIEW = "order delivered on time with no issues";

async function getEbayReviews() {
  const [reviews, stats] = await Promise.all([
    prisma.ebayReview.findMany({
      where: {
        rating: 1,
        comment: { not: null },
        // Filter out eBay's auto-generated placeholder text
        NOT: { comment: { contains: GENERIC_REVIEW, mode: "insensitive" } },
      },
      orderBy: { transactionDate: "desc" },
      // Fetch extra so short/low-quality comments can be trimmed in JS
      take: 60,
      select: {
        id: true,
        rating: true,
        comment: true,
        reviewerName: true,
        itemTitle: true,
        transactionDate: true,
      },
    }),
    prisma.ebaySellerStats.findUnique({
      where: { id: "singleton" },
      select: {
        positiveFeedbackPercent: true,
        totalFeedbackCount: true,
        positiveFeedbackCount: true,
        negativeFeedbackCount: true,
        neutralFeedbackCount: true,
      },
    }),
  ]);

  // Drop any remaining low-quality comments (very short = auto-generated variants)
  const quality = reviews.filter((r) => (r.comment?.trim().length ?? 0) >= 20).slice(0, 30);

  return {
    reviews: quality.map((r) => ({
      ...r,
      transactionDate: r.transactionDate?.toISOString() ?? null,
    })),
    sellerStats: stats
      ? {
          positivePct: derivePositivePct(stats),
          totalCount: stats.totalFeedbackCount,
          positiveCount: stats.positiveFeedbackCount,
        }
      : null,
  };
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const [featured, products, { reviews, sellerStats }] = await Promise.all([
    getFeaturedProducts(),
    getNewestProducts(),
    getEbayReviews(),
  ]);

  return (
    <>
      {/* ── Hero ── */}
      <section
        className="relative py-24 text-center"
        style={{
          backgroundImage: "url('/hero.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Dark overlay so text stays readable */}
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative mx-auto max-w-3xl px-4">
          <h1 className="inline-flex flex-wrap items-center justify-center gap-3 text-4xl tracking-tight text-white sm:text-5xl lg:text-6xl">
            <Image
              src="/image.png"
              alt="Casa"
              width={86}
              height={86}
              className="invert contrast-200 mix-blend-screen"
              priority
            />
            <span className="font-semibold">Cards &amp; Collectibles</span>
          </h1>
          <p className="mt-4 text-base text-white/75 sm:text-lg">
            Graded sports cards you can trust — from a 5-star eBay seller with hundreds of verified
            reviews. Fast shipping, carefully packaged, and priced to move.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/shop"
              className="rounded-lg bg-red-600 px-8 py-3 text-sm font-semibold text-white shadow hover:bg-red-700"
            >
              Shop Now
            </Link>
            <Link
              href="/search"
              className="rounded-lg border border-white/20 px-8 py-3 text-sm font-semibold text-white hover:border-white/50 hover:text-white"
            >
              Search Cards
            </Link>
          </div>
        </div>
      </section>

      {/* ── Featured Cards ── */}
      {featured.length > 0 && (
        <section className="py-14">
          <div className="mb-6 mx-auto max-w-7xl px-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Featured Cards</h2>
            <Link href="/shop" className="text-sm font-medium text-red-600 hover:text-red-700">
              View all →
            </Link>
          </div>
          <FeaturedCarousel
            products={featured.map((p) => ({
              id: p.id,
              slug: p.slug,
              title: p.title,
              price: p.price.toString(),
              stockQuantity: p.stockQuantity,
              imageUrl: p.images[0]?.url ?? null,
            }))}
          />
        </section>
      )}

      {/* ── eBay Reviews ── */}
      {reviews.length > 0 && (
        <section className="bg-gray-50 py-14">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">What Our Customers Say</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Real feedback from verified eBay buyers
                </p>
              </div>
              <Link
                href="/reviews"
                className="text-sm font-medium text-red-600 hover:text-red-700 whitespace-nowrap"
              >
                See all reviews →
              </Link>
            </div>

            <EbayReviewsCarousel reviews={reviews} sellerStats={sellerStats} />

            {/* Also Find Us on eBay banner */}
            <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white px-6 py-6 text-center shadow-sm sm:flex-row sm:justify-between sm:text-left">
              <div>
                <p className="font-semibold text-gray-900">Also find us on eBay</p>
                <p className="mt-0.5 text-sm text-gray-500">
                  Thousands of cards listed — shop our full eBay store
                </p>
              </div>
              <a
                href="https://www.ebay.com/usr/casa_cards_and_collectibles"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-5 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-100"
              >
                <span className="font-extrabold tracking-tight" aria-hidden="true">
                  <span className="text-[#e53238]">e</span>
                  <span className="text-[#0064d2]">B</span>
                  <span className="text-[#f5af02]">a</span>
                  <span className="text-[#86b817]">y</span>
                </span>
                Shop on eBay
                <svg
                  className="h-3.5 w-3.5 text-gray-400"
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
            </div>
          </div>
        </section>
      )}

      {/* ── Newest products ── */}
      <section className="py-14">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">New Arrivals</h2>
            <Link href="/shop" className="text-sm font-medium text-red-600 hover:text-red-700">
              View all →
            </Link>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  slug={product.slug}
                  title={product.title}
                  price={product.price.toString()}
                  stockQuantity={product.stockQuantity}
                  imageUrl={product.images[0]?.url ?? null}
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-gray-400">No products yet — check back soon!</p>
          )}
        </div>
      </section>

      {/* ── Trust badges ── */}
      <section className="border-y border-gray-100 bg-gray-50 py-10">
        <div className="mx-auto max-w-5xl px-4">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              {
                icon: (
                  <svg
                    className="h-8 w-8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                    />
                  </svg>
                ),
                label: "Secure Checkout",
                sub: "SSL encrypted payments",
              },
              {
                icon: (
                  <svg
                    className="h-8 w-8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
                    />
                  </svg>
                ),
                label: "Fast Shipping",
                sub: "Orders ship within 1–2 business days",
              },
              {
                icon: (
                  <svg
                    className="h-8 w-8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                ),
                label: "Easy Returns",
                sub: "Hassle-free return policy",
              },
            ].map((badge) => (
              <div key={badge.label} className="flex flex-col items-center gap-2 text-center">
                <div className="text-red-600">{badge.icon}</div>
                <p className="font-semibold text-gray-900">{badge.label}</p>
                <p className="text-xs text-gray-500">{badge.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Newsletter popup (10s delay) ── */}
      <NewsletterPopup />
    </>
  );
}
