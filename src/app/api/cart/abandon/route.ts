import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  email: z.string().email(),
  items: z.array(
    z.object({
      productId: z.string(),
      title: z.string(),
      quantity: z.number().int().positive(),
      price: z.number().positive(),
      imageUrl: z.string().nullable().optional(),
    }),
  ),
  subtotal: z.number().nonnegative(),
});

// POST /api/cart/abandon
// Called from the checkout form when the user types/blurs their email.
// Upserts an AbandonedCart record keyed by email.

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { email, items, subtotal } = parsed.data;
  if (items.length === 0) return NextResponse.json({ ok: true });

  const existing = await prisma.abandonedCart.findFirst({ where: { email } });

  if (existing) {
    await prisma.abandonedCart.update({
      where: { id: existing.id },
      data: {
        itemsJson: { items, subtotal },
        reminderSentAt: null,
        createdAt: new Date(),
      },
    });
  } else {
    await prisma.abandonedCart.create({
      data: {
        email,
        itemsJson: { items, subtotal },
        reminderSentAt: null,
      },
    });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/cart/abandon?email=... — called on successful checkout to clear the record
export async function DELETE(req: NextRequest) {
  const email = new URL(req.url).searchParams.get("email");
  if (!email) return NextResponse.json({ ok: true });

  await prisma.abandonedCart.deleteMany({ where: { email } });
  return NextResponse.json({ ok: true });
}
