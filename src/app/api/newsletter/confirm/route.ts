import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://casa-cards.com";

// GET /api/newsletter/confirm?token=...
// Confirms a newsletter subscription via double opt-in link.

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(`${SITE_URL}/newsletter/confirmed?status=error`);
  }

  const subscriber = await prisma.emailSubscriber.findUnique({
    where: { confirmToken: token },
  });

  if (!subscriber) {
    return NextResponse.redirect(`${SITE_URL}/newsletter/confirmed?status=error`);
  }

  await prisma.emailSubscriber.update({
    where: { id: subscriber.id },
    data: {
      isActive: true,
      confirmedAt: new Date(),
      confirmToken: null,
    },
  });

  return NextResponse.redirect(`${SITE_URL}/newsletter/confirmed?status=success`);
}
