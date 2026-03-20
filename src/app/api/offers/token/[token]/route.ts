import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ token: string }> };

// GET /api/offers/token/[token]
// Public — validates an accepted offer purchase token and returns product + offer price.

export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;

  const offer = await prisma.offer.findUnique({
    where: { purchaseToken: token },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          slug: true,
          price: true,
          isActive: true,
          stockQuantity: true,
          images: { where: { sortOrder: 0 }, take: 1 },
        },
      },
    },
  });

  if (!offer) {
    return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  }

  if (offer.status !== "ACCEPTED") {
    if (offer.status === "PURCHASED") {
      return NextResponse.json({ error: "This offer has already been purchased" }, { status: 400 });
    }
    return NextResponse.json({ error: "This offer link is no longer valid" }, { status: 400 });
  }

  if (!offer.tokenExpiresAt || offer.tokenExpiresAt < new Date()) {
    return NextResponse.json({ error: "This offer link has expired" }, { status: 400 });
  }

  if (!offer.product.isActive || offer.product.stockQuantity <= 0) {
    return NextResponse.json({ error: "This product is no longer available" }, { status: 400 });
  }

  return NextResponse.json({
    product: {
      id: offer.product.id,
      title: offer.product.title,
      slug: offer.product.slug,
      price: parseFloat(offer.product.price.toString()),
      imageUrl: offer.product.images[0]?.url ?? null,
    },
    offerPrice: parseFloat(offer.offerPrice.toString()),
    tokenExpiresAt: offer.tokenExpiresAt,
  });
}
