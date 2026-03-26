import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/adminLog";
import { paypalRequest } from "@/lib/paypal";

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

interface PayPalOrderDetails {
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{ id: string }>;
    };
  }>;
}

interface PayPalRefundResult {
  id: string;
}

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

  if (order.paymentProvider !== "PAYPAL") {
    return NextResponse.json(
      { error: "Refunds via this panel are only supported for PayPal payments." },
      { status: 400 },
    );
  }

  if (!order.paymentIntentId) {
    return NextResponse.json({ error: "No payment ID on this order." }, { status: 400 });
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

  // Fetch the PayPal order to get the capture ID
  const paypalOrder = await paypalRequest<PayPalOrderDetails>(
    "GET",
    `/v2/checkout/orders/${order.paymentIntentId}`,
  );

  const captureId = paypalOrder.purchase_units?.[0]?.payments?.captures?.[0]?.id;
  if (!captureId) {
    return NextResponse.json(
      { error: "Could not find PayPal capture ID. The payment may not have been captured yet." },
      { status: 400 },
    );
  }

  const refundBody = isFullRefund
    ? {}
    : { amount: { value: (amount! / 100).toFixed(2), currency_code: "USD" } };

  const result = await paypalRequest<PayPalRefundResult>(
    "POST",
    `/v2/payments/captures/${captureId}/refund`,
    refundBody,
  );

  if (isFullRefund) {
    await prisma.order.update({ where: { orderNumber }, data: { status: "REFUNDED" } });
  } else {
    const refundNote = `Partial refund issued: $${(amount! / 100).toFixed(2)} (PayPal refund ID: ${result.id})`;
    const existingNotes = order.notes ?? "";
    const updatedNotes = existingNotes ? `${existingNotes}\n${refundNote}` : refundNote;
    await prisma.order.update({ where: { orderNumber }, data: { notes: updatedNotes } });
  }

  await logAdminAction(session.user.id, "ISSUE_REFUND", "Order", order.id, {
    orderNumber,
    refundId: result.id,
    amount: amount ?? totalCents,
    full: isFullRefund,
  });

  return NextResponse.json({ refundId: result.id, full: isFullRefund });
}
