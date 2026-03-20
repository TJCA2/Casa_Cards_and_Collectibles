import { prisma } from "@/lib/prisma";
import ProductForm from "@/components/admin/products/ProductForm";
import Link from "next/link";

export const metadata = { title: "Add Product — Admin" };

export default async function NewProductPage() {
  const sportsRaw = await prisma.product.findMany({
    where: { sport: { not: null } },
    select: { sport: true },
    distinct: ["sport"],
    orderBy: { sport: "asc" },
  });

  const sports = sportsRaw.map((p) => p.sport as string);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/products" className="text-sm text-gray-400 hover:text-gray-600">
          ← Products
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Add Product</h1>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <ProductForm mode="new" sports={sports} />
      </div>
    </div>
  );
}
