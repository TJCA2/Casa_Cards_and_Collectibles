import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/adminLog";
import { getStripe } from "@/lib/stripe";

const bodySchema = z.object({
  // amount in cents; omit for full refund
  amount: z.number().int().positive().optional(),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session;
}

type Params = { params: Promise<{ orderNumber: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { orderNumber } = await params;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: {
      id: true,
      status: true,
      paymentProvider: true,
      paymentIntentId: true,
      totalAmount: true,
      notes: true,
    },
  });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  if (order.paymentProvider !== "STRIPE") {
    return NextResponse.json(
      { error: "Refunds are only supported for Stripe payments." },
      { status: 400 },
    );
  }

  if (!order.paymentIntentId) {
    return NextResponse.json({ error: "No payment intent ID on this order." }, { status: 400 });
  }

  const refundableStatuses = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"];
  if (!refundableStatuses.includes(order.status)) {
    return NextResponse.json(
      { error: `Cannot refund an order with status ${order.status}.` },
      { status: 409 },
    );
  }

  const { amount } = parsed.data;
  const totalCents = Math.round(Number(order.totalAmount) * 100);
  const isFullRefund = !amount || amount >= totalCents;

  const stripe = getStripe();
  const refund = await stripe.refunds.create({
    payment_intent: order.paymentIntentId,
    ...(isFullRefund ? {} : { amount }),
  });

  if (isFullRefund) {
    await prisma.order.update({ where: { orderNumber }, data: { status: "REFUNDED" } });
  } else {
    // Add a note about the partial refund
    const refundNote = `Partial refund issued: $${(amount! / 100).toFixed(2)} (Stripe refund ID: ${refund.id})`;
    const existingNotes = order.notes ?? "";
    const updatedNotes = existingNotes ? `${existingNotes}\n${refundNote}` : refundNote;
    await prisma.order.update({ where: { orderNumber }, data: { notes: updatedNotes } });
  }

  await logAdminAction(session.user.id, "ISSUE_REFUND", "Order", order.id, {
    orderNumber,
    refundId: refund.id,
    amount: amount ?? totalCents,
    full: isFullRefund,
  });

  return NextResponse.json({ refundId: refund.id, full: isFullRefund });
}
