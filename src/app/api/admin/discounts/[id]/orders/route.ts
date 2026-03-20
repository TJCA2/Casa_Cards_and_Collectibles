import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session;
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;

  const discount = await prisma.discountCode.findUnique({
    where: { id },
    select: { code: true },
  });
  if (!discount) return NextResponse.json({ error: "Discount code not found." }, { status: 404 });

  const orders = await prisma.order.findMany({
    where: { discountCode: discount.code },
    orderBy: { createdAt: "desc" },
    select: {
      orderNumber: true,
      status: true,
      discountAmount: true,
      createdAt: true,
      customerEmail: true,
      user: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({
    orders: orders.map((o) => ({
      orderNumber: o.orderNumber,
      status: o.status,
      discountAmount: o.discountAmount != null ? Number(o.discountAmount) : null,
      createdAt: o.createdAt.toISOString(),
      customerEmail: o.user?.email ?? o.customerEmail ?? null,
      customerName: o.user?.name ?? null,
    })),
  });
}
