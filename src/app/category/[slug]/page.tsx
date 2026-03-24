import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/products/ProductCard";

type Props = { params: Promise<{ slug: string }> };

const PAGE_SIZE = 12;

// ── Data fetching ──────────────────────────────────────────────────────────────

async function getCategory(slug: string) {
  return prisma.category.findUnique({ where: { slug } });
}

async function getCategoryProducts(categoryId: string, page: number) {
  const where = { isActive: true, categoryId };

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

// ── Metadata ───────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) return { title: "Category Not Found" };

  return {
    title: category.name,
    description: category.description ?? `Browse all ${category.name} in our store.`,
  };
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Props["params"];
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);

  const category = await getCategory(slug);
  if (!category) notFound();

  const page = Math.max(1, Number(Array.isArray(sp.page) ? sp.page[0] : (sp.page ?? "1")) || 1);

  const { products, total, totalPages } = await getCategoryProducts(category.id, page);

  const buildPageUrl = (p: number) => `/category/${slug}?page=${p}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-900">
          Home
        </Link>
        <span>/</span>
        <span className="text-gray-900">{category.name}</span>
      </nav>

      {/* Category header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{category.name}</h1>
        {category.description && (
          <p className="mt-2 text-sm text-gray-500">{category.description}</p>
        )}
        <p className="mt-1 text-sm text-gray-400">
          {total} item{total !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Product grid */}
      {products.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <p className="text-lg font-medium text-gray-900">No products in this category yet</p>
          <Link
            href="/shop"
            className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Browse All Products
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
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
      )}
    </div>
  );
}
