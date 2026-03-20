import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const EXPORT_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      emailVerified: true,
      createdAt: true,
      lastExportAt: true,
      orders: {
        select: {
          orderNumber: true,
          status: true,
          createdAt: true,
          totalAmount: true,
          subtotal: true,
          shippingCost: true,
          taxAmount: true,
          trackingNumber: true,
          shippedAt: true,
          deliveredAt: true,
          items: {
            select: {
              quantity: true,
              unitPrice: true,
              totalPrice: true,
              productTitle: true,
              product: { select: { title: true } },
            },
          },
        },
      },
      addresses: {
        select: {
          name: true,
          line1: true,
          line2: true,
          city: true,
          state: true,
          zip: true,
          isDefault: true,
          createdAt: true,
        },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Rate limit: 1 export per 24 hours
  if (user.lastExportAt && Date.now() - user.lastExportAt.getTime() < EXPORT_COOLDOWN_MS) {
    const retryAfterSec = Math.ceil(
      (EXPORT_COOLDOWN_MS - (Date.now() - user.lastExportAt.getTime())) / 1000,
    );
    return NextResponse.json(
      { error: "You can only export your data once per 24 hours." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSec) },
      },
    );
  }

  await prisma.user.update({ where: { id: session.user.id }, data: { lastExportAt: new Date() } });

  const exportData = {
    exportedAt: new Date().toISOString(),
    profile: {
      email: user.email,
      name: user.name,
      phone: user.phone,
      memberSince: user.createdAt,
    },
    orders: user.orders.map((o) => ({
      orderNumber: o.orderNumber,
      status: o.status,
      placedAt: o.createdAt,
      total: Number(o.totalAmount),
      subtotal: Number(o.subtotal),
      shipping: Number(o.shippingCost),
      tax: Number(o.taxAmount),
      trackingNumber: o.trackingNumber,
      shippedAt: o.shippedAt,
      deliveredAt: o.deliveredAt,
      items: o.items.map((i) => ({
        product: i.product?.title ?? i.productTitle ?? "",
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        lineTotal: Number(i.totalPrice),
      })),
    })),
    addresses: user.addresses,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="casa-cards-data-${Date.now()}.json"`,
    },
  });
}
