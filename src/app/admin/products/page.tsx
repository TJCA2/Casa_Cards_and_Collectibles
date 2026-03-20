import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { type Prisma } from "@prisma/client";
import ProductsTable, { type AdminProduct } from "@/components/admin/products/ProductsTable";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function str(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

export default async function AdminProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = str(params.q).trim();
  const status = str(params.status); // "active" | "inactive" | ""
  const sport = str(params.sport);
  const page = Math.max(1, Number(str(params.page)) || 1);

  const where: Prisma.ProductWhereInput = {
    ...(q && { title: { contains: q, mode: "insensitive" } }),
    ...(status === "active" && { isActive: true }),
    ...(status === "inactive" && { isActive: false }),
    ...(sport && { sport }),
  };

  const [products, total, sportsRaw] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        slug: true,
        price: true,
        sport: true,
        stockQuantity: true,
        lowStockThreshold: true,
        isActive: true,
        lastSyncedAt: true,
        category: { select: { name: true } },
        images: { select: { url: true }, orderBy: { sortOrder: "asc" }, take: 1 },
      },
    }),
    prisma.product.count({ where }),
    prisma.product.findMany({
      where: { sport: { not: null } },
      select: { sport: true },
      distinct: ["sport"],
      orderBy: { sport: "asc" },
    }),
  ]);

  const sports = sportsRaw.map((p) => p.sport as string);

  // Serialize for client component (Decimal → number, Date → string)
  const serialized: AdminProduct[] = products.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    price: Number(p.price),
    sport: p.sport,
    stockQuantity: p.stockQuantity,
    lowStockThreshold: p.lowStockThreshold,
    isActive: p.isActive,
    lastSyncedAt: p.lastSyncedAt?.toISOString() ?? null,
    category: p.category,
    images: p.images,
  }));

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Build URL helpers
  function pageUrl(p: number) {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (status) u.set("status", status);
    if (sport) u.set("sport", sport);
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return `/admin/products${s ? `?${s}` : ""}`;
  }

  function filterUrl(key: string, val: string) {
    const u = new URLSearchParams();
    if (key !== "q" && q) u.set("q", q);
    if (key !== "status" && status) u.set("status", status);
    if (key !== "sport" && sport) u.set("sport", sport);
    if (val) u.set(key, val);
    const s = u.toString();
    return `/admin/products${s ? `?${s}` : ""}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="mt-0.5 text-sm text-gray-500">{total.toLocaleString()} total</p>
        </div>
        <Link
          href="/admin/products/new"
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
        >
          + Add Product
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form method="GET" action="/admin/products" className="flex flex-wrap gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search products…"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          {sports.length > 0 && (
            <select
              name="sport"
              defaultValue={sport}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="">All Sports</option>
              {sports.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
          <button
            type="submit"
            className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Search
          </button>
        </form>

        <div className="flex gap-1">
          {[
            { label: "All", val: "" },
            { label: "Active", val: "active" },
            { label: "Inactive", val: "inactive" },
          ].map((f) => (
            <Link
              key={f.val}
              href={filterUrl("status", f.val)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                status === f.val
                  ? "bg-red-600 text-white"
                  : "border border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        {(q || status || sport) && (
          <Link href="/admin/products" className="text-sm text-gray-400 hover:text-gray-600">
            Clear filters
          </Link>
        )}
      </div>

      {/* Table */}
      <ProductsTable products={serialized} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-gray-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={pageUrl(page - 1)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50"
              >
                ← Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={pageUrl(page + 1)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
