import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/adminLog";
import { sendOfferDeclinedEmail } from "@/lib/email";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  adminNote: z.string().max(500).optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // body is optional
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { adminNote } = parsed.data;

  const offer = await prisma.offer.findUnique({
    where: { id },
    include: {
      product: { select: { title: true } },
      user: { select: { email: true, name: true } },
    },
  });

  if (!offer) {
    return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  }
  if (offer.status !== "PENDING") {
    return NextResponse.json({ error: "Offer is not in PENDING status" }, { status: 400 });
  }

  await prisma.offer.update({
    where: { id },
    data: { status: "DECLINED", adminNote: adminNote ?? null },
  });

  // Send customer decline email (non-fatal)
  try {
    await sendOfferDeclinedEmail(
      offer.user.email,
      offer.user.name ?? offer.user.email,
      offer.product.title,
      adminNote,
    );
  } catch (err) {
    console.error("[offers/decline] email send failed:", err);
  }

  await logAdminAction(session.user.id, "DECLINE_OFFER", "Offer", id, {
    productTitle: offer.product.title,
    customerEmail: offer.user.email,
    ...(adminNote ? { adminNote } : {}),
  });

  return NextResponse.json({ ok: true });
}
