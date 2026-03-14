import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  code: z.string().min(1).max(50),
  subtotal: z.number().nonnegative(),
});

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

  const { code, subtotal } = parsed.data;

  const discount = await prisma.discountCode.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!discount || !discount.isActive) {
    return NextResponse.json({ error: "Invalid discount code" }, { status: 404 });
  }

  if (discount.expiresAt && discount.expiresAt < new Date()) {
    return NextResponse.json({ error: "This discount code has expired" }, { status: 400 });
  }

  if (discount.maxUses !== null && discount.usedCount >= discount.maxUses) {
    return NextResponse.json(
      { error: "This discount code has reached its usage limit" },
      { status: 400 },
    );
  }

  if (discount.minOrderAmount !== null) {
    const minAmount = parseFloat(discount.minOrderAmount.toString());
    if (subtotal < minAmount) {
      return NextResponse.json(
        { error: `Minimum order of $${minAmount.toFixed(2)} required for this code` },
        { status: 400 },
      );
    }
  }

  const value = parseFloat(discount.value.toString());
  const amount =
    discount.type === "PERCENTAGE"
      ? parseFloat((subtotal * (value / 100)).toFixed(2))
      : Math.min(value, subtotal); // FIXED — can't discount more than subtotal

  return NextResponse.json({
    type: discount.type,
    value,
    amount,
  });
}
