import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://casa-cards.com";

// GET /api/unsubscribe?email=...
// One-click unsubscribe link included in marketing emails (CAN-SPAM compliance).
// Marks the subscriber as inactive and redirects to a confirmation page.

export async function GET(req: NextRequest) {
  const raw = new URL(req.url).searchParams.get("email");
  const parsed = z.string().email().max(254).safeParse(raw);

  if (!parsed.success) {
    return NextResponse.redirect(`${SITE_URL}/unsubscribe?status=error`);
  }

  const email = parsed.data;

  try {
    await prisma.emailSubscriber.updateMany({
      where: { email: String(email.toLowerCase()) },
      data: { isActive: false },
    });
  } catch {
    // If the email isn't in the list at all, that's fine — still show success
  }

  return NextResponse.redirect(
    `${SITE_URL}/unsubscribe?status=success&email=${encodeURIComponent(email)}`,
  );
}
