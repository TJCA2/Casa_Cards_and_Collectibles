import type { Metadata } from "next";
import Link from "next/link";
import { Condition, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/products/ProductCard";
import FilterSidebar from "@/components/products/FilterSidebar";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse all sports cards and collectibles.",
};

const PAGE_SIZE = 20;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low → High" },
  { value: "price-desc", label: "Price: High → Low" },
  { value: "grade-asc", label: "Grade: Low → High" },
  { value: "grade-desc", label: "Grade: High → Low" },
];

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function str(val: string | string[] | undefined): string {
  return Array.isArray(val) ? (val[0] ?? "") : (val ?? "");
}

// ── Data fetching ──────────────────────────────────────────────────────────────

async function getShopData(params: Awaited<SearchParams>) {
  const page = Math.max(1, Number(str(params.page)) || 1);
  const sort = str(params.sort);
  const categorySlug = str(params.category);
  const condition = str(params.condition);
  const minPrice = str(params.minPrice);
  const maxPrice = str(params.maxPrice);
  const inStock = str(params.inStock) === "true";
  const sport = str(params.sport);
  const grade = str(params.grade);

  const priceFilter: Prisma.DecimalFilter = {};
  if (minPrice) priceFilter.gte = new Prisma.Decimal(minPrice);
  if (maxPrice) priceFilter.lte = new Prisma.Decimal(maxPrice);
  const hasPriceFilter = minPrice || maxPrice;

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    ...(categorySlug && { category: { slug: categorySlug } }),
    ...(condition && { condition: condition as Condition }),
    ...(hasPriceFilter && { price: priceFilter }),
    ...(inStock && { stockQuantity: { gt: 0 } }),
    ...(sport && { sport }),
    ...(grade && { grade }),
  };

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "price-asc"
      ? { price: "asc" }
      : sort === "price-desc"
        ? { price: "desc" }
        : sort === "grade-asc"
          ? { grade: "asc" }
          : sort === "grade-desc"
            ? { grade: "desc" }
            : { createdAt: "desc" };

  const [products, total, sportsRaw, gradesRaw] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { images: { where: { sortOrder: 0 }, take: 1 } },
    }),
    prisma.product.count({ where }),
    prisma.product.findMany({
      where: { isActive: true, sport: { not: null } },
      select: { sport: true },
      distinct: ["sport"],
      orderBy: { sport: "asc" },
    }),
    prisma.product.findMany({
      where: { isActive: true, grade: { not: null } },
      select: { grade: true },
      distinct: ["grade"],
      orderBy: { grade: "asc" },
    }),
  ]);

  const sports = sportsRaw.map((p) => p.sport as string);
  const grades = gradesRaw
    .map((p) => p.grade as string)
    .sort((a, b) => parseFloat(b) - parseFloat(a));

  return {
    products,
    total,
    sports,
    grades,
    page,
    sort,
    sport,
    grade,
    totalPages: Math.ceil(total / PAGE_SIZE),
  };
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { products, total, sports, grades, page, sort, sport, grade, totalPages } =
    await getShopData(params);

  const buildPageUrl = (p: number) => {
    const sp = new URLSearchParams(
      Object.entries(params).flatMap(([k, v]) =>
        Array.isArray(v) ? v.map((val) => [k, val]) : v ? [[k, v]] : [],
      ),
    );
    sp.set("page", String(p));
    return `/shop?${sp.toString()}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      {/* Page header */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Products</h1>
          <p className="mt-1 text-sm text-gray-500">
            {total} item{total !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Sort */}
        <Suspense>
          <SortSelect current={sort} params={params} />
        </Suspense>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Filter sidebar */}
        <Suspense>
          <FilterSidebar sports={sports} activeSport={sport} grades={grades} activeGrade={grade} />
        </Suspense>

        {/* Product grid */}
        <div className="flex-1">
          {products.length > 0 ? (
            <>
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
          ) : (
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <p className="text-lg font-medium text-gray-900">No products found</p>
              <p className="text-sm text-gray-500">Try adjusting or clearing your filters.</p>
              <Link
                href="/shop"
                className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Clear Filters
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sort selector (client island) ──────────────────────────────────────────────

function SortSelect({ current, params }: { current: string; params: Awaited<SearchParams> }) {
  // Build hrefs for each sort option
  const sortLinks = SORT_OPTIONS.map((opt) => {
    const sp = new URLSearchParams(
      Object.entries(params).flatMap(([k, v]) =>
        Array.isArray(v) ? v.map((val) => [k, val]) : v ? [[k, v]] : [],
      ),
    );
    sp.set("sort", opt.value);
    sp.delete("page");
    return { ...opt, href: `/shop?${sp.toString()}` };
  });

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500">Sort:</span>
      <div className="flex gap-1">
        {sortLinks.map((opt) => (
          <Link
            key={opt.value}
            href={opt.href}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              current === opt.value || (!current && opt.value === "newest")
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
