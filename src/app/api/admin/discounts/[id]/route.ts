import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/adminLog";

const updateSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  type: z.enum(["PERCENTAGE", "FIXED"]).optional(),
  value: z.number().positive().optional(),
  minOrderAmount: z.number().positive().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session;
}

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const existing = await prisma.discountCode.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Discount code not found." }, { status: 404 });

  // Build update data field-by-field to satisfy exactOptionalPropertyTypes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};
  const d = parsed.data;
  if (d.code !== undefined) data.code = d.code.toUpperCase();
  if (d.type !== undefined) data.type = d.type;
  if (d.value !== undefined) data.value = d.value;
  if (d.minOrderAmount !== undefined) data.minOrderAmount = d.minOrderAmount ?? null;
  if (d.expiresAt !== undefined) data.expiresAt = d.expiresAt ? new Date(d.expiresAt) : null;
  if (d.maxUses !== undefined) data.maxUses = d.maxUses ?? null;
  if (d.isActive !== undefined) data.isActive = d.isActive;

  // If code changed, check uniqueness
  if (data.code && data.code !== existing.code) {
    const conflict = await prisma.discountCode.findUnique({ where: { code: data.code } });
    if (conflict) {
      return NextResponse.json(
        { error: "A discount code with this code already exists." },
        { status: 409 },
      );
    }
  }

  const updated = await prisma.discountCode.update({ where: { id }, data });

  await logAdminAction(session.user.id, "UPDATE_DISCOUNT", "DiscountCode", id, {
    fields: Object.keys(data),
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;

  const discount = await prisma.discountCode.findUnique({
    where: { id },
    select: { id: true, code: true, usedCount: true },
  });
  if (!discount) return NextResponse.json({ error: "Discount code not found." }, { status: 404 });

  if (discount.usedCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete a code that has been used. Deactivate it instead." },
      { status: 409 },
    );
  }

  await prisma.discountCode.delete({ where: { id } });

  await logAdminAction(session.user.id, "DELETE_DISCOUNT", "DiscountCode", id, {
    code: discount.code,
  });

  return new NextResponse(null, { status: 204 });
}
