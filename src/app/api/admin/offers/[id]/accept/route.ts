import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import crypto from "crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/adminLog";
import { sendOfferAcceptedEmail } from "@/lib/email";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const offer = await prisma.offer.findUnique({
    where: { id },
    include: {
      product: { select: { title: true, slug: true } },
      user: { select: { email: true, name: true } },
    },
  });

  if (!offer) {
    return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  }
  if (offer.status !== "PENDING") {
    return NextResponse.json({ error: "Offer is not in PENDING status" }, { status: 400 });
  }

  const purchaseToken = crypto.randomBytes(32).toString("hex");
  const tokenExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await prisma.offer.update({
    where: { id },
    data: { status: "ACCEPTED", purchaseToken, tokenExpiresAt },
  });

  // Send customer acceptance email (non-fatal)
  try {
    await sendOfferAcceptedEmail(
      offer.user.email,
      offer.user.name ?? offer.user.email,
      offer.product.title,
      parseFloat(offer.offerPrice.toString()),
      purchaseToken,
    );
  } catch (err) {
    console.error("[offers/accept] email send failed:", err);
  }

  await logAdminAction(session.user.id, "ACCEPT_OFFER", "Offer", id, {
    offerPrice: offer.offerPrice.toString(),
    productTitle: offer.product.title,
    customerEmail: offer.user.email,
  });

  return NextResponse.json({ ok: true });
}
