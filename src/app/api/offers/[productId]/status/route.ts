import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ productId: string }> };

// GET /api/offers/[productId]/status
// Returns { hasOffer: false } for unauthenticated users (no error)
// Returns { hasOffer: true, status, purchaseToken? } if user has an offer on this product

export async function GET(_req: NextRequest, { params }: Params) {
  const { productId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ hasOffer: false });
  }

  const offer = await prisma.offer.findFirst({
    where: {
      productId,
      userId: session.user.id,
      status: { in: ["PENDING", "ACCEPTED"] },
    },
    orderBy: { createdAt: "desc" },
    select: { status: true, purchaseToken: true, tokenExpiresAt: true },
  });

  if (!offer) {
    return NextResponse.json({ hasOffer: false });
  }

  return NextResponse.json({
    hasOffer: true,
    status: offer.status,
    ...(offer.status === "ACCEPTED" && offer.purchaseToken
      ? {
          purchaseToken: offer.purchaseToken,
          tokenExpiresAt: offer.tokenExpiresAt,
        }
      : {}),
  });
}
