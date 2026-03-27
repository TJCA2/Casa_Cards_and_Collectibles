import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

const addressSchema = z.object({
  name: z.string().min(1).max(100),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional().default(""),
  city: z.string().min(1).max(100),
  state: z.string().length(2),
  zip: z.string().regex(/^\d{5}$/, "ZIP must be 5 digits"),
  isDefault: z.boolean().optional().default(false),
});

export async function PUT(req: NextRequest, { params }: { params: Params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.address.findUnique({ where: { id } });

  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { name, line1, line2, city, state, zip, isDefault } = parsed.data;
  const userId = session.user.id;

  const address = await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.address.updateMany({
        where: { userId: String(userId), isDefault: true, id: { not: String(id) } },
        data: { isDefault: false },
      });
    }
    return tx.address.update({
      where: { id },
      data: { name, line1, line2: line2 || null, city, state, zip, isDefault },
    });
  });

  return NextResponse.json(address);
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.address.findUnique({ where: { id } });

  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Prevent deletion if address is on an active order
  const activeOrder = await prisma.order.findFirst({
    where: {
      OR: [{ shippingAddressId: id }, { billingAddressId: id }],
      status: { notIn: ["CANCELLED", "REFUNDED"] },
    },
    select: { orderNumber: true },
  });

  if (activeOrder) {
    return NextResponse.json(
      { error: `This address is used on order ${activeOrder.orderNumber} and cannot be deleted.` },
      { status: 409 },
    );
  }

  await prisma.address.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
