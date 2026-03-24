import type { Metadata } from "next";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/products/ProductCard";
import FilterSidebar from "@/components/products/FilterSidebar";
import SortSelect from "./SortSelect";
import GridToggle from "./GridToggle";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Shop Sports Cards & Collectibles",
  description:
    "Browse our full inventory of baseball cards, basketball cards, football cards, and sports collectibles. Filter by sport, grade, and price.",
};

const PAGE_SIZE: Record<3 | 4, number> = { 3: 21, 4: 20 };

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function str(val: string | string[] | undefined): string {
  return Array.isArray(val) ? (val[0] ?? "") : (val ?? "");
}

// ── Data fetching ──────────────────────────────────────────────────────────────

async function getShopData(params: Awaited<SearchParams>, cols: 3 | 4) {
  const pageSize = PAGE_SIZE[cols];
  const page = Math.max(1, Number(str(params.page)) || 1);
  const sort = str(params.sort);
  const categorySlug = str(params.category);

  const minPrice = str(params.minPrice);
  const maxPrice = str(params.maxPrice);
  const inStock = str(params.inStock) === "true";
  const sport = str(params.sport);
  // grade supports multiple values: ?grade=10&grade=9.5
  const gradeParams = Array.isArray(params.grade)
    ? params.grade
    : params.grade
      ? [params.grade]
      : [];

  const priceFilter: Prisma.DecimalFilter = {};
  if (minPrice) priceFilter.gte = new Prisma.Decimal(minPrice);
  if (maxPrice) priceFilter.lte = new Prisma.Decimal(maxPrice);
  const hasPriceFilter = minPrice || maxPrice;

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    ...(categorySlug && { category: { slug: categorySlug } }),

    ...(hasPriceFilter && { price: priceFilter }),
    ...(inStock && { stockQuantity: { gt: 0 } }),
    ...(sport && { sport }),
    // grade params are numbers only (e.g. "10", "9.5") — match any company prefix
    ...(gradeParams.length > 0 && {
      OR: gradeParams.flatMap((g) => [{ grade: g }, { grade: { endsWith: ` ${g}` } }]),
    }),
  };

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "price-asc"
      ? { price: "asc" }
      : sort === "price-desc"
        ? { price: "desc" }
        : sort === "grade-asc"
          ? { gradeValue: "asc" }
          : sort === "grade-desc"
            ? { gradeValue: "desc" }
            : sort === "oldest"
              ? { createdAt: "asc" }
              : { createdAt: "desc" };

  const [products, total, sportsRaw, gradesRaw] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
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

  // Extract just the number from each grade (e.g. "PSA 10" → "10"),
  // deduplicate, then sort numerically descending.
  const grades = [
    ...new Set(gradesRaw.map((p) => (p.grade as string).split(" ").pop() as string)),
  ].sort((a, b) => parseFloat(b) - parseFloat(a));

  return {
    products,
    total,
    sports,
    grades,
    page,
    sort,
    sport,
    gradeParams,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const cols = str(params.cols) === "3" ? 3 : 4;

  const { products, total, sports, grades, page, sort, sport, gradeParams, totalPages } =
    await getShopData(params, cols);

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

        {/* Sort + grid toggle */}
        <div className="flex items-center gap-3">
          <Suspense>
            <SortSelect current={sort} params={params} />
          </Suspense>
          <Suspense>
            <GridToggle cols={cols} params={params} />
          </Suspense>
        </div>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Filter sidebar */}
        <Suspense>
          <FilterSidebar
            sports={sports}
            activeSport={sport}
            grades={grades}
            activeGrades={gradeParams}
          />
        </Suspense>

        {/* Product grid */}
        <div className="flex-1">
          {products.length > 0 ? (
            <>
              <div
                className={`grid grid-cols-2 gap-5 ${cols === 3 ? "lg:grid-cols-3" : "lg:grid-cols-3 xl:grid-cols-4"}`}
              >
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
