import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/products/ProductCard";
import NewsletterBar from "@/components/homepage/NewsletterBar";

// ── Data fetching ──────────────────────────────────────────────────────────────

async function getCategories() {
  return prisma.category.findMany({
    where: { parentId: null },
    orderBy: { name: "asc" },
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

// ── Category icons (sport emoji fallbacks) ─────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  "baseball-cards": "⚾",
  "basketball-cards": "🏀",
  "football-cards": "🏈",
};

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const [categories, products] = await Promise.all([getCategories(), getNewestProducts()]);

  return (
    <>
      {/* ── Hero ── */}
      <section className="bg-black py-24 text-center">
        <div className="mx-auto max-w-3xl px-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Casa Cards &amp; Collectibles
          </h1>
          <p className="mt-4 text-lg text-white/60">
            Your source for sports cards &amp; collectibles — baseball, basketball, football, and
            more.
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

      {/* ── Featured categories ── */}
      {categories.length > 0 && (
        <section className="bg-gray-50 py-14">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">Shop by Sport</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-red-200 hover:shadow-md"
                >
                  <span className="text-4xl" aria-hidden="true">
                    {CATEGORY_ICONS[cat.slug] ?? "🃏"}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900 group-hover:text-red-600">
                      {cat.name}
                    </p>
                    {cat.description && (
                      <p className="mt-0.5 text-xs text-gray-500">{cat.description}</p>
                    )}
                  </div>
                  <svg
                    className="ml-auto h-4 w-4 text-gray-300 transition group-hover:text-red-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
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
                  condition={product.condition}
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

      {/* ── Newsletter ── */}
      <NewsletterBar />
    </>
  );
}
