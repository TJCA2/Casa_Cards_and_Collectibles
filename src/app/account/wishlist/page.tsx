import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import WishlistManager from "@/components/account/WishlistManager";

export const metadata: Metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login?callbackUrl=/account/wishlist");

  const wishlist = await prisma.wishlist.findUnique({
    where: { userId: session.user.id },
    include: {
      items: {
        orderBy: { addedAt: "desc" },
        include: {
          product: {
            select: {
              id: true,
              title: true,
              slug: true,
              price: true,
              stockQuantity: true,
              condition: true,
              images: { where: { sortOrder: 0 }, take: 1, select: { url: true } },
            },
          },
        },
      },
    },
  });

  const items = (wishlist?.items ?? []).map((wi) => ({
    id: wi.product.id,
    title: wi.product.title,
    slug: wi.product.slug,
    price: wi.product.price.toString(),
    stockQuantity: wi.product.stockQuantity,
    condition: wi.product.condition,
    imageUrl: wi.product.images[0]?.url ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Wishlist</h2>
        {items.length > 0 && (
          <p className="mt-1 text-sm text-gray-500">
            {items.length} {items.length === 1 ? "item" : "items"} saved
          </p>
        )}
      </div>

      <WishlistManager items={items} />
    </div>
  );
}
