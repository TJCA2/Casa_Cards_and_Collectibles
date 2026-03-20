import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/adminLog";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session;
}

type Params = { params: Promise<{ id: string }> };

export async function PATCH(_req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;

  const discount = await prisma.discountCode.findUnique({
    where: { id },
    select: { id: true, isActive: true, code: true },
  });
  if (!discount) return NextResponse.json({ error: "Discount code not found." }, { status: 404 });

  const updated = await prisma.discountCode.update({
    where: { id },
    data: { isActive: !discount.isActive },
    select: { isActive: true },
  });

  await logAdminAction(
    session.user.id,
    updated.isActive ? "ACTIVATE_DISCOUNT" : "DEACTIVATE_DISCOUNT",
    "DiscountCode",
    id,
    { code: discount.code },
  );

  return NextResponse.json({ isActive: updated.isActive });
}
