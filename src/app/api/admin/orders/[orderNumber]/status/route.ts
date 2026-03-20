import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/adminLog";
import { OrderStatus } from "@prisma/client";

const VALID_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PENDING: ["PAID", "CANCELLED"],
  PAID: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
  REFUNDED: [],
};

const bodySchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session;
}

type Params = { params: Promise<{ orderNumber: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { orderNumber } = await params;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { status: newStatus } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: { id: true, status: true },
  });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  const allowed = VALID_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(newStatus)) {
    return NextResponse.json(
      { error: `Cannot transition from ${order.status} to ${newStatus}.` },
      { status: 409 },
    );
  }

  const now = new Date();
  const updated = await prisma.order.update({
    where: { orderNumber },
    data: {
      status: newStatus,
      ...(newStatus === "SHIPPED" ? { shippedAt: now } : {}),
      ...(newStatus === "DELIVERED" ? { deliveredAt: now } : {}),
    },
  });

  await logAdminAction(session.user.id, "UPDATE_ORDER_STATUS", "Order", order.id, {
    orderNumber,
    from: order.status,
    to: newStatus,
  });

  return NextResponse.json({ status: updated.status });
}
