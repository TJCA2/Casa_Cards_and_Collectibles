import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";

export async function GET(req: NextRequest) {
  const rawToken = req.nextUrl.searchParams.get("token") ?? "";

  if (!rawToken) {
    return NextResponse.redirect(new URL("/auth/error?error=missing-token", SITE_URL || req.url));
  }

  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });

  if (!record) {
    return NextResponse.redirect(new URL("/auth/error?error=invalid-token", SITE_URL || req.url));
  }

  if (record.expiresAt < new Date()) {
    await prisma.emailVerificationToken.delete({ where: { tokenHash } });
    return NextResponse.redirect(new URL("/auth/error?error=expired-token", SITE_URL || req.url));
  }

  const user = await prisma.user.findUnique({ where: { id: record.userId } });

  if (!user?.pendingEmail) {
    await prisma.emailVerificationToken.delete({ where: { tokenHash } });
    return NextResponse.redirect(new URL("/auth/error?error=invalid-token", SITE_URL || req.url));
  }

  // Apply the email change atomically
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        email: user.pendingEmail,
        pendingEmail: null,
        // Bump passwordChangedAt to invalidate all existing sessions
        passwordChangedAt: new Date(),
      },
    }),
    prisma.emailVerificationToken.delete({ where: { tokenHash } }),
  ]);

  return NextResponse.redirect(new URL("/account/profile?emailChanged=true", SITE_URL || req.url));
}
