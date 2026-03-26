import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paypalRequest } from "@/lib/paypal";
import { sendOrderConfirmationEmail } from "@/lib/email";

interface PayPalCaptureResult {
  status: string;
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{ id: string }>;
    };
  }>;
}

export async function POST(req: NextRequest) {
  let paypalOrderId: string;
  try {
    const body = (await req.json()) as { paypalOrderId?: string };
    if (!body.paypalOrderId) {
      return NextResponse.json({ error: "Missing paypalOrderId" }, { status: 400 });
    }
    paypalOrderId = body.paypalOrderId;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // ── 1. Capture the payment with PayPal ──────────────────────────────────────
  let capture: PayPalCaptureResult;
  try {
    capture = await paypalRequest<PayPalCaptureResult>(
      "POST",
      `/v2/checkout/orders/${paypalOrderId}/capture`,
      {},
    );
  } catch (err) {
    console.error("[capture-paypal-order] PayPal capture failed:", err);
    return NextResponse.json(
      { error: "Payment capture failed. Please try again." },
      { status: 502 },
    );
  }

  if (capture.status !== "COMPLETED") {
    return NextResponse.json(
      { error: `Payment not completed (status: ${capture.status})` },
      { status: 400 },
    );
  }

  // ── 2. Find the pending order ────────────────────────────────────────────────
  const order = await prisma.order.findUnique({
    where: { paymentIntentId: paypalOrderId },
    include: {
      items: {
        include: { product: { select: { title: true } } },
      },
      shippingAddress: true,
    },
  });

  if (!order) {
    console.error(`[capture-paypal-order] No order found for paypalOrderId ${paypalOrderId}`);
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Idempotency guard — already fulfilled
  if (order.status === "PAID") {
    return NextResponse.json({ orderNumber: order.orderNumber });
  }

  // ── 3. Fulfill order in a transaction ────────────────────────────────────────
  await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      if (item.productId) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { decrement: item.quantity } },
        });
      }
    }

    await tx.order.update({
      where: { id: order.id },
      data: { status: "PAID" },
    });

    if (order.offerToken) {
      await tx.offer.updateMany({
        where: { purchaseToken: order.offerToken, status: "ACCEPTED" },
        data: { status: "PURCHASED" },
      });
    }
  });

  // ── 4. Send confirmation email (non-fatal) ───────────────────────────────────
  if (order.customerEmail) {
    try {
      await sendOrderConfirmationEmail({
        orderNumber: order.orderNumber,
        customerEmail: order.customerEmail,
        customerName: order.shippingAddress.name,
        items: order.items.map((i) => ({
          title: i.product?.title ?? i.productTitle ?? "Item",
          quantity: i.quantity,
          unitPrice: parseFloat(i.unitPrice.toString()),
        })),
        subtotal: parseFloat(order.subtotal.toString()),
        shippingCost: parseFloat(order.shippingCost.toString()),
        discountAmount: 0,
        total: parseFloat(order.totalAmount.toString()),
        shippingAddress: {
          line1: order.shippingAddress.line1,
          ...(order.shippingAddress.line2 ? { line2: order.shippingAddress.line2 } : {}),
          city: order.shippingAddress.city,
          state: order.shippingAddress.state,
          zip: order.shippingAddress.zip,
        },
      });
    } catch (emailErr) {
      console.error("[capture-paypal-order] Confirmation email failed:", emailErr);
    }
  }

  return NextResponse.json({ orderNumber: order.orderNumber });
}
