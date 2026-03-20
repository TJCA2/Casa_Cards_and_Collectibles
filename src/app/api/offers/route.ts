import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendOfferReceivedAdminEmail, sendOfferConfirmationEmail } from "@/lib/email";

const submitSchema = z.object({
  productId: z.string().uuid(),
  offerPrice: z
    .number()
    .positive()
    .refine((v) => Math.round(v * 100) === v * 100, {
      message: "Offer price must have at most 2 decimal places",
    }),
});

// ── POST /api/offers — submit an offer ────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { productId, offerPrice } = parsed.data;

  // Fetch product
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, title: true, price: true, isActive: true, stockQuantity: true },
  });
  if (!product || !product.isActive) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  if (product.stockQuantity <= 0) {
    return NextResponse.json({ error: "Product is out of stock" }, { status: 400 });
  }

  // Server-side 70% floor check
  const askingPrice = parseFloat(product.price.toString());
  const minimum = Math.ceil(askingPrice * 0.7 * 100) / 100;
  if (offerPrice < minimum) {
    return NextResponse.json({ error: "Offer too low", minimum }, { status: 400 });
  }

  // Check for existing PENDING offer from this user on this product
  const existing = await prisma.offer.findFirst({
    where: { productId, userId: session.user.id, status: "PENDING" },
  });
  if (existing) {
    return NextResponse.json(
      { error: "You already have a pending offer on this item" },
      { status: 409 },
    );
  }

  // Create offer
  await prisma.offer.create({
    data: {
      productId,
      userId: session.user.id,
      offerPrice,
    },
  });

  // Send emails (non-fatal)
  const customerName = session.user.name ?? session.user.email ?? "Customer";
  const customerEmail = session.user.email!;

  try {
    await Promise.all([
      sendOfferReceivedAdminEmail({
        productTitle: product.title,
        productId: product.id,
        offerPrice,
        askingPrice,
        customerName,
        customerEmail,
      }),
      sendOfferConfirmationEmail(customerEmail, customerName, product.title, offerPrice),
    ]);
  } catch (err) {
    console.error("[offers] email send failed:", err);
  }

  return NextResponse.json({ ok: true });
}

// ── GET /api/offers — list current user's offers ──────────────────────────────

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = 20;
  const skip = (page - 1) * limit;

  const [offers, total] = await Promise.all([
    prisma.offer.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        product: {
          select: {
            id: true,
            title: true,
            slug: true,
            price: true,
            images: { where: { sortOrder: 0 }, take: 1 },
          },
        },
      },
    }),
    prisma.offer.count({ where: { userId: session.user.id } }),
  ]);

  return NextResponse.json({ offers, total, page, pages: Math.ceil(total / limit) });
}
