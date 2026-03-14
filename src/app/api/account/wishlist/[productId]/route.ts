import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ productId: string }> };

// GET /api/account/wishlist/[productId] — check if item is in wishlist
export async function GET(_request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ inWishlist: false });
  }

  const { productId } = await params;

  const wishlist = await prisma.wishlist.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!wishlist) {
    return NextResponse.json({ inWishlist: false });
  }

  const item = await prisma.wishlistItem.findUnique({
    where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
    select: { id: true },
  });

  return NextResponse.json({ inWishlist: !!item });
}

// DELETE /api/account/wishlist/[productId] — remove item
export async function DELETE(_request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { productId } = await params;

  const wishlist = await prisma.wishlist.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!wishlist) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const item = await prisma.wishlistItem.findUnique({
    where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
    select: { id: true },
  });

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.wishlistItem.delete({ where: { id: item.id } });

  return new Response(null, { status: 204 });
}
