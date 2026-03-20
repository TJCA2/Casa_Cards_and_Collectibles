import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

// ── Validation schema ──────────────────────────────────────────────────────────

const schema = z.object({
  items: z
    .array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1) }))
    .min(1)
    .max(50),
  shippingInfo: z.object({
    email: z.string().email().max(254),
    name: z.string().min(1).max(200),
    line1: z.string().min(1).max(200),
    line2: z.string().max(200).optional(),
    city: z.string().min(1).max(100),
    state: z.string().length(2),
    zip: z.string().regex(/^\d{5}(-\d{4})?$/),
    country: z.string().length(2).default("US"),
    saveAddress: z.boolean().default(false),
  }),
  shippingMethod: z.enum(["first_class", "priority"]),
  discountCode: z.string().max(50).optional(),
  offerToken: z.string().max(200).optional(),
});

// ── Constants ──────────────────────────────────────────────────────────────────

const SHIPPING_COSTS: Record<string, number> = {
  first_class: 4.99,
  priority: 9.99,
};
const FREE_THRESHOLD = parseFloat(process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD ?? "75");

// ── Order number generator ─────────────────────────────────────────────────────

function generateOrderNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const suffix = Array.from(
    { length: 4 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
  return `CC-${date}-${suffix}`;
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    );
  }

  const { items, shippingInfo, shippingMethod, discountCode, offerToken } = parsed.data;
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;

  // ── 0. Validate offer token server-side (if present) ─────────────────────────
  let offerRecord: {
    id: string;
    offerPrice: import("@prisma/client").Prisma.Decimal;
    productId: string;
  } | null = null;

  if (offerToken) {
    if (items.length !== 1) {
      return NextResponse.json(
        { error: "Offer checkout must contain exactly one item" },
        { status: 400 },
      );
    }
    const offer = await prisma.offer.findUnique({
      where: { purchaseToken: offerToken },
      select: {
        id: true,
        status: true,
        offerPrice: true,
        productId: true,
        tokenExpiresAt: true,
        product: { select: { isActive: true, stockQuantity: true } },
      },
    });

    if (!offer || offer.status !== "ACCEPTED") {
      return NextResponse.json({ error: "Offer link is no longer valid" }, { status: 400 });
    }
    if (!offer.tokenExpiresAt || offer.tokenExpiresAt < new Date()) {
      return NextResponse.json({ error: "Offer link has expired" }, { status: 400 });
    }
    if (!offer.product.isActive || offer.product.stockQuantity <= 0) {
      return NextResponse.json({ error: "Product is no longer available" }, { status: 400 });
    }
    if (offer.productId !== items[0]!.productId) {
      return NextResponse.json(
        { error: "Offer does not match the provided product" },
        { status: 400 },
      );
    }
    offerRecord = offer;
  }

  // ── 1. Fetch products and validate prices/stock ──────────────────────────────
  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    select: { id: true, title: true, price: true, stockQuantity: true },
  });

  if (products.length !== productIds.length) {
    return NextResponse.json({ error: "One or more products are unavailable" }, { status: 400 });
  }

  const productMap = new Map(products.map((p) => [p.id, p]));
  for (const item of items) {
    const product = productMap.get(item.productId)!;
    if (product.stockQuantity < item.quantity) {
      return NextResponse.json(
        { error: `"${product.title}" only has ${product.stockQuantity} in stock` },
        { status: 400 },
      );
    }
  }

  // ── 2. Calculate totals server-side ─────────────────────────────────────────
  const subtotal = items.reduce((sum, item) => {
    // Use offer price for the offer item — never trust client price
    const price =
      offerRecord && item.productId === offerRecord.productId
        ? parseFloat(offerRecord.offerPrice.toString())
        : parseFloat(productMap.get(item.productId)!.price.toString());
    return sum + price * item.quantity;
  }, 0);

  const freeShipping = subtotal >= FREE_THRESHOLD;
  const shippingCost = freeShipping ? 0 : SHIPPING_COSTS[shippingMethod]!;

  // ── 3. Validate discount code (if provided) ──────────────────────────────────
  let discountAmount = 0;
  let discountCodeId: string | null = null;

  if (discountCode) {
    const code = await prisma.discountCode.findUnique({
      where: { code: discountCode.toUpperCase() },
    });

    if (
      code &&
      code.isActive &&
      (!code.expiresAt || code.expiresAt > new Date()) &&
      (code.maxUses === null || code.usedCount < code.maxUses) &&
      (code.minOrderAmount === null || subtotal >= parseFloat(code.minOrderAmount.toString()))
    ) {
      const value = parseFloat(code.value.toString());
      discountAmount =
        code.type === "PERCENTAGE"
          ? parseFloat((subtotal * (value / 100)).toFixed(2))
          : Math.min(value, subtotal);
      discountCodeId = code.id;
    }
  }

  const totalAmount = Math.max(0, subtotal + shippingCost - discountAmount);
  const amountCents = Math.round(totalAmount * 100);

  if (amountCents < 50) {
    return NextResponse.json({ error: "Order total is too low to process" }, { status: 400 });
  }

  // ── 4. Create Stripe PaymentIntent ───────────────────────────────────────────
  const orderNumber = generateOrderNumber();
  const stripe = getStripe();

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: "usd",
    automatic_payment_methods: { enabled: true },
    receipt_email: shippingInfo.email,
    metadata: { orderNumber },
  });

  // ── 5. Persist address + order in a transaction ──────────────────────────────
  await prisma.$transaction(async (tx) => {
    const address = await tx.address.create({
      data: {
        ...(userId ? { userId } : {}),
        name: shippingInfo.name,
        line1: shippingInfo.line1,
        ...(shippingInfo.line2 ? { line2: shippingInfo.line2 } : {}),
        city: shippingInfo.city,
        state: shippingInfo.state,
        zip: shippingInfo.zip,
        country: shippingInfo.country,
        isDefault: false,
      },
    });

    const order = await tx.order.create({
      data: {
        orderNumber,
        ...(userId ? { userId } : {}),
        customerEmail: shippingInfo.email,
        status: "PENDING",
        subtotal,
        shippingCost,
        taxAmount: 0,
        totalAmount,
        paymentProvider: "STRIPE",
        paymentIntentId: paymentIntent.id,
        shippingAddressId: address.id,
        billingAddressId: address.id,
        ...(discountCodeId ? { discountCode: discountCode!.toUpperCase(), discountAmount } : {}),
        ...(offerToken ? { offerToken } : {}),
      },
    });

    await tx.orderItem.createMany({
      data: items.map((item) => {
        const unitPrice =
          offerRecord && item.productId === offerRecord.productId
            ? parseFloat(offerRecord.offerPrice.toString())
            : parseFloat(productMap.get(item.productId)!.price.toString());
        return {
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice,
          totalPrice: unitPrice * item.quantity,
        };
      }),
    });

    // Increment discount code usage
    if (discountCodeId) {
      await tx.discountCode.update({
        where: { id: discountCodeId },
        data: { usedCount: { increment: 1 } },
      });
    }
  });

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    orderNumber,
    total: totalAmount,
  });
}
