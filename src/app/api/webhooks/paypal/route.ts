import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paypalRequest } from "@/lib/paypal";
import { sendOrderConfirmationEmail } from "@/lib/email";

// ── PayPal webhook event types we care about ───────────────────────────────────

const CAPTURE_COMPLETED = "PAYMENT.CAPTURE.COMPLETED";
const CAPTURE_DENIED = "PAYMENT.CAPTURE.DENIED";
const CAPTURE_REVERSED = "PAYMENT.CAPTURE.REVERSED";

interface PayPalWebhookBody {
  event_type: string;
  resource: {
    id: string;
    invoice_id?: string;
    supplementary_data?: {
      related_ids?: {
        order_id?: string;
      };
    };
  };
}

interface VerificationResponse {
  verification_status: string;
}

export async function POST(req: NextRequest) {
  let body: PayPalWebhookBody;
  try {
    body = (await req.json()) as PayPalWebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // ── Verify webhook signature ─────────────────────────────────────────────────
  const transmissionId = req.headers.get("paypal-transmission-id");
  const transmissionTime = req.headers.get("paypal-transmission-time");
  const certUrl = req.headers.get("paypal-cert-url");
  const authAlgo = req.headers.get("paypal-auth-algo");
  const transmissionSig = req.headers.get("paypal-transmission-sig");

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    return NextResponse.json({ error: "Missing PayPal signature headers" }, { status: 400 });
  }

  try {
    const verification = await paypalRequest<VerificationResponse>(
      "POST",
      "/v1/notifications/verify-webhook-signature",
      {
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: process.env.PAYPAL_WEBHOOK_ID,
        webhook_event: body,
      },
    );

    if (verification.verification_status !== "SUCCESS") {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }
  } catch (err) {
    console.error("[paypal-webhook] Signature verification error:", err);
    return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });
  }

  const eventType = body.event_type;

  // ── PAYMENT.CAPTURE.COMPLETED ────────────────────────────────────────────────
  if (eventType === CAPTURE_COMPLETED) {
    // PayPal nests the order ID in supplementary_data — fall back to invoice_id
    const paypalOrderId =
      body.resource.supplementary_data?.related_ids?.order_id ?? body.resource.invoice_id;

    if (!paypalOrderId) {
      console.error("[paypal-webhook] Could not extract order ID from event", body);
      return NextResponse.json({ received: true });
    }

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
      console.error(`[paypal-webhook] No order found for paypalOrderId ${paypalOrderId}`);
      return NextResponse.json({ received: true });
    }

    // Idempotency guard
    if (order.status === "PAID") {
      return NextResponse.json({ received: true });
    }

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
          where: { purchaseToken: String(order.offerToken), status: "ACCEPTED" },
          data: { status: "PURCHASED" },
        });
      }
    });

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
        console.error("[paypal-webhook] Confirmation email failed:", emailErr);
      }
    }
  }

  // ── PAYMENT.CAPTURE.DENIED / REVERSED ────────────────────────────────────────
  if (eventType === CAPTURE_DENIED || eventType === CAPTURE_REVERSED) {
    const paypalOrderId =
      body.resource.supplementary_data?.related_ids?.order_id ?? body.resource.invoice_id;

    if (paypalOrderId) {
      await prisma.order
        .updateMany({
          where: { paymentIntentId: paypalOrderId, status: "PENDING" },
          data: { status: "CANCELLED" },
        })
        .catch((err) => console.error("[paypal-webhook] Cancel order error:", err));
    }
  }

  return NextResponse.json({ received: true });
}
