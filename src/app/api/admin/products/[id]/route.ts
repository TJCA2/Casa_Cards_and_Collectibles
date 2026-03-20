import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/adminLog";

const updateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(50000).nullable().optional(),
  price: z.number().positive().optional(),
  compareAtPrice: z.number().positive().nullable().optional(),
  stockQuantity: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  sport: z.string().max(100).nullable().optional(),
  imageUrls: z.array(z.string().url()).max(10).optional(),
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

  const product = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const { imageUrls, ...fields } = parsed.data;

  // Build update data, only including fields that were provided, converting undefined → omitted
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};
  if (fields.title !== undefined) data.title = fields.title;
  if (fields.description !== undefined) data.description = fields.description ?? null;
  if (fields.price !== undefined) data.price = fields.price;
  if (fields.compareAtPrice !== undefined) data.compareAtPrice = fields.compareAtPrice ?? null;
  if (fields.stockQuantity !== undefined) data.stockQuantity = fields.stockQuantity;
  if (fields.lowStockThreshold !== undefined) data.lowStockThreshold = fields.lowStockThreshold;
  if (fields.isActive !== undefined) data.isActive = fields.isActive;
  if (fields.isFeatured !== undefined) data.isFeatured = fields.isFeatured;
  if (fields.sport !== undefined) data.sport = fields.sport ?? null;

  const updated = await prisma.$transaction(async (tx) => {
    const p = await tx.product.update({ where: { id }, data });

    if (imageUrls !== undefined) {
      await tx.productImage.deleteMany({ where: { productId: id } });
      if (imageUrls.length > 0) {
        await tx.productImage.createMany({
          data: imageUrls.map((url, i) => ({ productId: id, url, sortOrder: i })),
        });
      }
    }

    return p;
  });

  await logAdminAction(session.user.id, "UPDATE_PRODUCT", "Product", id, {
    fields: Object.keys(parsed.data),
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    select: { id: true, title: true },
  });
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const activeOrderItemCount = await prisma.orderItem.count({
    where: {
      productId: id,
      order: { status: { notIn: ["CANCELLED", "REFUNDED"] } },
    },
  });
  if (activeOrderItemCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete a product that has active orders. Deactivate it instead." },
      { status: 409 },
    );
  }

  await prisma.product.delete({ where: { id } });
  await logAdminAction(session.user.id, "DELETE_PRODUCT", "Product", id, { title: product.title });

  return new NextResponse(null, { status: 204 });
}
