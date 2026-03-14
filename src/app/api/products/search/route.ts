import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  q: z.string().min(1).max(200),
  page: z.coerce.number().int().min(1).default(1),
});

const PAGE_SIZE = 12;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const parsed = schema.safeParse({
    q: searchParams.get("q") ?? "",
    page: searchParams.get("page") ?? "1",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid query" },
      { status: 400 },
    );
  }

  const { q, page } = parsed.data;

  const where = {
    isActive: true,
    title: { contains: q, mode: "insensitive" as const },
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { createdAt: "desc" },
      include: { images: { where: { sortOrder: 0 }, take: 1 } },
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({
    products: products.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      price: p.price.toString(),
      condition: p.condition,
      stockQuantity: p.stockQuantity,
      imageUrl: p.images[0]?.url ?? null,
    })),
    total,
    page,
    totalPages: Math.ceil(total / PAGE_SIZE),
  });
}
