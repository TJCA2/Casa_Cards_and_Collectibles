import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProductForm from "@/components/admin/products/ProductForm";
import Link from "next/link";

export const metadata = { title: "Edit Product — Admin" };

type Params = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: Params) {
  const { id } = await params;

  const [product, sportsRaw] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" }, select: { url: true } },
      },
    }),
    prisma.product.findMany({
      where: { sport: { not: null } },
      select: { sport: true },
      distinct: ["sport"],
      orderBy: { sport: "asc" },
    }),
  ]);

  if (!product) notFound();

  const sports = sportsRaw.map((p) => p.sport as string);

  const initial = {
    title: product.title,
    ...(product.description != null && { description: product.description }),
    price: Number(product.price),
    compareAtPrice: product.compareAtPrice != null ? Number(product.compareAtPrice) : null,
    stockQuantity: product.stockQuantity,
    lowStockThreshold: product.lowStockThreshold,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    sport: product.sport,
    imageUrls: product.images.map((img) => img.url),
    isEbaySynced: product.ebayItemId != null,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/products" className="text-sm text-gray-400 hover:text-gray-600">
          ← Products
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="max-w-lg truncate text-2xl font-bold text-gray-900">{product.title}</h1>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <ProductForm mode="edit" productId={id} sports={sports} initial={initial} />
      </div>
    </div>
  );
}
