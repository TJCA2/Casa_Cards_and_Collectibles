import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/auth/error?error=missing-token", request.url));
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");

  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
  });

  if (!record) {
    return NextResponse.redirect(new URL("/auth/error?error=invalid-token", request.url));
  }

  if (record.expiresAt < new Date()) {
    await prisma.emailVerificationToken.delete({ where: { tokenHash } });
    return NextResponse.redirect(new URL("/auth/error?error=expired-token", request.url));
  }

  // Mark user as verified and delete the token
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: true },
    }),
    prisma.emailVerificationToken.delete({ where: { tokenHash } }),
  ]);

  return NextResponse.redirect(new URL("/auth/login?verified=true", request.url));
}
