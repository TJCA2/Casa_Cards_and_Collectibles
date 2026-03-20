import { prisma } from "@/lib/prisma";
import DiscountsTable, { type AdminDiscount } from "@/components/admin/discounts/DiscountsTable";

export const dynamic = "force-dynamic";
export const metadata = { title: "Discount Codes — Admin" };

export default async function AdminDiscountsPage() {
  const discounts = await prisma.discountCode.findMany({
    orderBy: { createdAt: "desc" },
  });

  const serialized: AdminDiscount[] = discounts.map((d) => ({
    id: d.id,
    code: d.code,
    type: d.type,
    value: Number(d.value),
    minOrderAmount: d.minOrderAmount != null ? Number(d.minOrderAmount) : null,
    expiresAt: d.expiresAt?.toISOString() ?? null,
    maxUses: d.maxUses,
    usedCount: d.usedCount,
    isActive: d.isActive,
    createdAt: d.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Discount Codes</h1>
        <p className="mt-0.5 text-sm text-gray-500">{discounts.length} total</p>
      </div>

      <DiscountsTable discounts={serialized} />
    </div>
  );
}
