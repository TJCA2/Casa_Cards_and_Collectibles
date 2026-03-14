import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/products/ProductCard";

export const metadata: Metadata = {
  title: "Search",
  description: "Search sports cards and collectibles.",
};

const PAGE_SIZE = 12;

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function str(val: string | string[] | undefined): string {
  return Array.isArray(val) ? (val[0] ?? "") : (val ?? "");
}

async function searchProducts(q: string, page: number) {
  const where = {
    isActive: true,
    title: { contains: q, mode: "insensitive" as const },
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { createdAt: "desc" },
      include: { images: { where: { sortOrder: 0 }, take: 1 } },
    }),
    prisma.product.count({ where }),
  ]);

  return { products, total, totalPages: Math.ceil(total / PAGE_SIZE) };
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = str(params.q).trim().slice(0, 200);
  const page = Math.max(1, Number(str(params.page)) || 1);

  const hasQuery = q.length > 0;
  const { products, total, totalPages } = hasQuery
    ? await searchProducts(q, page)
    : { products: [], total: 0, totalPages: 0 };

  const buildPageUrl = (p: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    sp.set("page", String(p));
    return `/search?${sp.toString()}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      {/* Search bar */}
      <form method="GET" action="/search" className="mb-8">
        <div className="flex gap-2">
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search cards and collectibles…"
            maxLength={200}
            autoFocus
            className="flex-1 rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-red-400 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700"
          >
            Search
          </button>
        </div>
      </form>

      {/* Results */}
      {!hasQuery ? (
        <p className="text-sm text-gray-400">
          Enter a search term above to find cards and collectibles.
        </p>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <p className="text-lg font-medium text-gray-900">No results for &ldquo;{q}&rdquo;</p>
          <p className="text-sm text-gray-500">
            Try a different search term or browse all products.
          </p>
          <Link
            href="/shop"
            className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Browse All Products
          </Link>
        </div>
      ) : (
        <>
          <p className="mb-6 text-sm text-gray-500">
            {total} result{total !== 1 ? "s" : ""} for &ldquo;{q}&rdquo;
          </p>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              {page > 1 && (
                <Link
                  href={buildPageUrl(page - 1)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-300"
                >
                  ← Previous
                </Link>
              )}
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={buildPageUrl(page + 1)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-300"
                >
                  Next →
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
