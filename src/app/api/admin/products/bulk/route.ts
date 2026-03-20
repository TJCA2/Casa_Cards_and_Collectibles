import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/adminLog";

const bulkSchema = z.object({
  action: z.enum(["activate", "deactivate", "delete"]),
  ids: z.array(z.string().uuid()).min(1).max(50),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { action, ids } = parsed.data;

  if (action === "activate" || action === "deactivate") {
    const { count } = await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { isActive: action === "activate" },
    });
    await logAdminAction(session.user.id, `BULK_${action.toUpperCase()}`, "Product", undefined, {
      ids,
      count,
    });
    return NextResponse.json({ count });
  }

  // delete — skip products with order items
  const orderedProductIds = await prisma.orderItem
    .findMany({
      where: { productId: { in: ids } },
      select: { productId: true },
      distinct: ["productId"],
    })
    .then((rows) => rows.map((r) => r.productId));

  const deletableIds = ids.filter((id) => !orderedProductIds.includes(id));

  const { count } = await prisma.product.deleteMany({ where: { id: { in: deletableIds } } });
  await logAdminAction(session.user.id, "BULK_DELETE", "Product", undefined, {
    requested: ids.length,
    deleted: count,
    skipped: orderedProductIds.length,
  });

  return NextResponse.json({
    count,
    skipped: orderedProductIds.length,
    skippedMessage:
      orderedProductIds.length > 0
        ? `${orderedProductIds.length} product(s) skipped — they have existing orders.`
        : undefined,
  });
}
