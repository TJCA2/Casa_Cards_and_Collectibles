import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type OrderStatus } from "@prisma/client";

// Statuses that count as revenue (excludes PENDING, CANCELLED, REFUNDED)
const REVENUE_STATUSES: OrderStatus[] = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    todayRevenue,
    monthRevenue,
    allTimeRevenue,
    ordersByStatus,
    totalProducts,
    activeProducts,
    lowStockRows,
    totalCustomers,
    newCustomers,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { status: { in: REVENUE_STATUSES }, createdAt: { gte: todayStart } },
      _sum: { totalAmount: true },
    }),
    prisma.order.aggregate({
      where: { status: { in: REVENUE_STATUSES }, createdAt: { gte: monthStart } },
      _sum: { totalAmount: true },
    }),
    prisma.order.aggregate({
      where: { status: { in: REVENUE_STATUSES } },
      _sum: { totalAmount: true },
    }),
    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.product.count(),
    prisma.product.count({ where: { isActive: true } }),
    // Prisma doesn't support column-to-column comparisons in where — use $queryRaw
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::int AS count
      FROM products
      WHERE "isActive" = true AND "stockQuantity" <= "lowStockThreshold"
    `,
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.user.count({
      where: { role: "CUSTOMER", createdAt: { gte: monthStart } },
    }),
  ]);

  const byStatus: Record<string, number> = {};
  for (const row of ordersByStatus) {
    byStatus[row.status] = row._count._all;
  }
  const totalOrders = Object.values(byStatus).reduce((a, b) => a + b, 0);

  return NextResponse.json({
    revenue: {
      today: Number(todayRevenue._sum.totalAmount ?? 0),
      thisMonth: Number(monthRevenue._sum.totalAmount ?? 0),
      allTime: Number(allTimeRevenue._sum.totalAmount ?? 0),
    },
    orders: {
      total: totalOrders,
      byStatus,
    },
    products: {
      total: totalProducts,
      active: activeProducts,
      lowStock: Number(lowStockRows[0]?.count ?? 0),
    },
    customers: {
      total: totalCustomers,
      newThisMonth: newCustomers,
    },
  });
}
