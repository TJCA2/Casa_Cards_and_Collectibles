import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function DELETE(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  // Soft-delete: anonymize PII, disassociate orders, delete addresses and tokens
  await prisma.$transaction(async (tx) => {
    const anonymisedEmail = `deleted_${randomUUID()}@deleted.local`;

    // Anonymize user record
    await tx.user.update({
      where: { id: userId },
      data: {
        email: anonymisedEmail,
        passwordHash: null,
        name: null,
        phone: null,
        pendingEmail: null,
        emailVerified: false,
        // Bump passwordChangedAt so any live JWT is immediately invalidated
        passwordChangedAt: new Date(),
      },
    });

    // Disassociate orders (preserve records for accounting/legal)
    await tx.order.updateMany({ where: { userId }, data: { userId: null } });

    // Remove auth tokens, addresses, and wishlist
    await tx.emailVerificationToken.deleteMany({ where: { userId } });
    await tx.passwordResetToken.deleteMany({ where: { userId } });
    await tx.address.deleteMany({ where: { userId } });

    // Delete wishlist (cascade removes WishlistItems)
    await tx.wishlist.deleteMany({ where: { userId } });
  });

  return NextResponse.json({ deleted: true });
}
