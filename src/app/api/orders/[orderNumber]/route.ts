import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ orderNumber: string }>;

export async function GET(req: NextRequest, { params }: { params: Params }) {
  const { orderNumber } = await params;

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: {
        include: {
          product: {
            select: {
              title: true,
              slug: true,
              images: { select: { url: true }, orderBy: { sortOrder: "asc" }, take: 1 },
            },
          },
        },
      },
      shippingAddress: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Access control: logged-in owner OR matching guest email via query param
  const session = await getServerSession(authOptions);
  const guestEmail = req.nextUrl.searchParams.get("email")?.toLowerCase().trim();

  const isOwner = session?.user?.id && order.userId === session.user.id;
  const isGuestMatch =
    guestEmail && order.customerEmail && order.customerEmail.toLowerCase() === guestEmail;

  if (!isOwner && !isGuestMatch) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  return NextResponse.json({
    orderNumber: order.orderNumber,
    status: order.status,
    createdAt: order.createdAt,
    items: order.items.map((i) => ({
      title: i.product?.title ?? i.productTitle ?? "",
      slug: i.product?.slug ?? null,
      imageUrl: i.product?.images[0]?.url ?? null,
      quantity: i.quantity,
      unitPrice: parseFloat(i.unitPrice.toString()),
      totalPrice: parseFloat(i.totalPrice.toString()),
    })),
    subtotal: parseFloat(order.subtotal.toString()),
    shippingCost: parseFloat(order.shippingCost.toString()),
    total: parseFloat(order.totalAmount.toString()),
    shippingAddress: {
      name: order.shippingAddress.name,
      line1: order.shippingAddress.line1,
      ...(order.shippingAddress.line2 ? { line2: order.shippingAddress.line2 } : {}),
      city: order.shippingAddress.city,
      state: order.shippingAddress.state,
      zip: order.shippingAddress.zip,
    },
    customerEmail: order.customerEmail,
  });
}
