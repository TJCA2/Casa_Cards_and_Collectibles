import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { sendOrderConfirmationEmail } from "@/lib/email";

// Stripe requires the raw body — do NOT parse as JSON before this
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Awaited<ReturnType<typeof stripe.webhooks.constructEventAsync>>;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object;

    // Idempotency — skip if already fulfilled
    const order = await prisma.order.findUnique({
      where: { paymentIntentId: pi.id },
      include: {
        items: {
          include: { product: { select: { title: true } } },
        },
        shippingAddress: true,
      },
    });

    if (!order) {
      // Unknown order — log and return 200 so Stripe doesn't retry
      console.error(`Webhook: no order found for paymentIntentId ${pi.id}`);
      return NextResponse.json({ received: true });
    }

    if (order.status === "PAID") {
      // Already fulfilled — idempotent
      return NextResponse.json({ received: true });
    }

    // Fulfill in a transaction: decrement stock + mark PAID
    await prisma.$transaction(async (tx) => {
      // Decrement stock for each item
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { decrement: item.quantity } },
        });
      }

      // Mark order as PAID
      await tx.order.update({
        where: { id: order.id },
        data: { status: "PAID" },
      });
    });

    // Send confirmation email (outside transaction — non-fatal if it fails)
    if (order.customerEmail) {
      try {
        await sendOrderConfirmationEmail({
          orderNumber: order.orderNumber,
          customerEmail: order.customerEmail,
          customerName: order.shippingAddress.name,
          items: order.items.map((i) => ({
            title: i.product.title,
            quantity: i.quantity,
            unitPrice: parseFloat(i.unitPrice.toString()),
          })),
          subtotal: parseFloat(order.subtotal.toString()),
          shippingCost: parseFloat(order.shippingCost.toString()),
          discountAmount: 0, // stored in totalAmount already
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
        console.error("Order confirmation email failed:", emailErr);
      }
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object;
    await prisma.order
      .update({
        where: { paymentIntentId: pi.id },
        data: { status: "CANCELLED" },
      })
      .catch(() => null); // Order may not exist yet — ignore
  }

  return NextResponse.json({ received: true });
}
