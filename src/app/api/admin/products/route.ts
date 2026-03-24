import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { randomBytes } from "crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/adminLog";

const productSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().max(50000).optional(),
  price: z.number().positive("Price must be positive"),
  compareAtPrice: z.number().positive().nullable().optional(),
  condition: z.enum(["NEW", "LIKE_NEW", "USED"]).default("USED"),
  stockQuantity: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  isActive: z.boolean().default(true),
  categoryId: z.string().uuid().nullable().optional(),
  imageUrls: z.array(z.string().url("Invalid image URL")).max(10).optional(),
});

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
  const suffix = randomBytes(3).toString("hex");
  return `${base}-${suffix}`;
}

function requireAdmin() {
  return getServerSession(authOptions).then((session) => {
    if (!session?.user) return null;
    if (session.user.role !== "ADMIN") return null;
    return session;
  });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const {
    title,
    description,
    price,
    compareAtPrice,
    condition,
    stockQuantity,
    lowStockThreshold,
    isActive,
    categoryId,
    imageUrls,
  } = parsed.data;

  // Generate a unique slug (retry once if collision)
  let slug = generateSlug(title);
  const existing = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
  if (existing) slug = generateSlug(title);

  const product = await prisma.$transaction(async (tx) => {
    const p = await tx.product.create({
      data: {
        title,
        slug,
        description: description ?? null,
        price,
        compareAtPrice: compareAtPrice ?? null,
        condition,
        stockQuantity,
        lowStockThreshold,
        isActive,
        categoryId: categoryId ?? null,
      },
    });

    if (imageUrls && imageUrls.length > 0) {
      await tx.productImage.createMany({
        data: imageUrls.map((url, i) => ({ productId: p.id, url, sortOrder: i })),
      });
    }

    return p;
  });

  await logAdminAction(session.user.id, "CREATE_PRODUCT", "Product", product.id, { title, slug });

  return NextResponse.json(product, { status: 201 });
}
