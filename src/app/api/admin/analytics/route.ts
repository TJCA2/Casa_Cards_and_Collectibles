import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session;
}

const thirtyDaysAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  d.setHours(0, 0, 0, 0);
  return d;
};

export async function GET(_req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const since = thirtyDaysAgo();

  // ── Daily revenue (last 30 days) — needs $queryRaw for date truncation ──────
  type DailyRow = { date: Date; revenue: number; orderCount: number };
  const dailyRows = await prisma.$queryRaw<DailyRow[]>`
    SELECT
      DATE("createdAt" AT TIME ZONE 'UTC') AS date,
      COALESCE(SUM("totalAmount"), 0)::float AS revenue,
      COUNT(*)::int AS "orderCount"
    FROM orders
    WHERE status::text = ANY(ARRAY['PAID','PROCESSING','SHIPPED','DELIVERED','REFUNDED'])
      AND "createdAt" >= ${since}
    GROUP BY DATE("createdAt" AT TIME ZONE 'UTC')
    ORDER BY date ASC
  `;

  // Fill in any missing days with 0
  const dailyMap = new Map<string, { revenue: number; orderCount: number }>();
  for (const row of dailyRows) {
    const key = new Date(row.date).toISOString().slice(0, 10);
    dailyMap.set(key, { revenue: row.revenue, orderCount: row.orderCount });
  }
  const dailyRevenue: { date: string; revenue: number; orderCount: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const entry = dailyMap.get(key) ?? { revenue: 0, orderCount: 0 };
    dailyRevenue.push({ date: key, revenue: entry.revenue, orderCount: entry.orderCount });
  }

  // ── Orders by status ──────────────────────────────────────────────────────
  const statusGroups = await prisma.order.groupBy({
    by: ["status"],
    _count: { status: true },
  });
  const ordersByStatus = Object.fromEntries(
    Object.values(OrderStatus).map((s) => [s, 0]),
  ) as Record<OrderStatus, number>;
  for (const g of statusGroups) {
    ordersByStatus[g.status] = g._count.status;
  }

  // ── Top 10 products by quantity sold ─────────────────────────────────────
  const topItemGroups = await prisma.orderItem.groupBy({
    by: ["productId"],
    _sum: { quantity: true, totalPrice: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 10,
  });

  const productIds = topItemGroups.map((g) => g.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, title: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p.title]));

  const topProducts = topItemGroups.map((g) => ({
    productId: g.productId,
    title: productMap.get(g.productId) ?? g.productId,
    totalSold: g._sum.quantity ?? 0,
    revenue: Number(g._sum.totalPrice ?? 0),
  }));

  // ── Customer stats ────────────────────────────────────────────────────────
  const [totalCustomers, newLast30Days, userOrderCounts] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: since } } }),
    prisma.order.groupBy({
      by: ["userId"],
      where: { userId: { not: null }, status: { notIn: ["CANCELLED", "REFUNDED"] } },
      _count: { userId: true },
    }),
  ]);
  const returning = userOrderCounts.filter((u) => u._count.userId > 1).length;

  return NextResponse.json({
    dailyRevenue,
    ordersByStatus,
    topProducts,
    customerStats: {
      total: totalCustomers,
      newLast30Days,
      returning,
    },
  });
}
