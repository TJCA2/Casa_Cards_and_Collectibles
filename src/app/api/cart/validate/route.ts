import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const itemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1),
});

const schema = z.object({
  items: z.array(itemSchema).min(1).max(50),
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

  const { items } = parsed.data;
  const productIds = items.map((i) => i.productId);

  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    select: { id: true, title: true, price: true, stockQuantity: true, slug: true },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  const validated = items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) {
      return {
        productId: item.productId,
        available: false,
        reason: "Product not found or inactive",
      };
    }
    if (product.stockQuantity < item.quantity) {
      return {
        productId: item.productId,
        available: false,
        reason:
          product.stockQuantity === 0 ? "Out of stock" : `Only ${product.stockQuantity} available`,
        stockQuantity: product.stockQuantity,
        currentPrice: product.price.toString(),
      };
    }
    return {
      productId: item.productId,
      available: true,
      stockQuantity: product.stockQuantity,
      currentPrice: product.price.toString(),
    };
  });

  const allAvailable = validated.every((v) => v.available);

  return NextResponse.json({ allAvailable, items: validated });
}
