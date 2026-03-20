import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/adminLog";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    select: { id: true, isActive: true, title: true },
  });
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const updated = await prisma.product.update({
    where: { id },
    data: { isActive: !product.isActive },
    select: { isActive: true },
  });

  await logAdminAction(
    session.user.id,
    updated.isActive ? "ACTIVATE_PRODUCT" : "DEACTIVATE_PRODUCT",
    "Product",
    id,
    { title: product.title },
  );

  return NextResponse.json({ isActive: updated.isActive });
}
