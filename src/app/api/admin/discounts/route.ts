import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/adminLog";

const createSchema = z.object({
  code: z.string().min(1).max(50),
  type: z.enum(["PERCENTAGE", "FIXED"]),
  value: z.number().positive(),
  minOrderAmount: z.number().positive().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().default(true),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session;
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { code, type, value, minOrderAmount, expiresAt, maxUses, isActive } = parsed.data;
  const normalizedCode = code.toUpperCase();

  const existing = await prisma.discountCode.findUnique({ where: { code: normalizedCode } });
  if (existing) {
    return NextResponse.json(
      { error: "A discount code with this code already exists." },
      { status: 409 },
    );
  }

  const discount = await prisma.discountCode.create({
    data: {
      code: normalizedCode,
      type,
      value,
      minOrderAmount: minOrderAmount ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      maxUses: maxUses ?? null,
      isActive,
    },
  });

  await logAdminAction(session.user.id, "CREATE_DISCOUNT", "DiscountCode", discount.id, {
    code: normalizedCode,
  });

  return NextResponse.json(discount, { status: 201 });
}
