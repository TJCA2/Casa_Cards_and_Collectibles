import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { contactIpRatelimit, contactEmailRatelimit } from "@/lib/ratelimit";
import { sendContactAdminEmail, sendContactAutoReplyEmail } from "@/lib/email";

// ── Validation ─────────────────────────────────────────────────────────────────

const ALLOWED_SUBJECTS = ["General Question", "Order Issue", "Product Inquiry", "Other"] as const;

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(254),
  subject: z.enum(ALLOWED_SUBJECTS),
  body: z.string().min(10).max(2000),
  productId: z.string().uuid().optional(),
  website: z.string().max(200).optional(), // honeypot
  turnstileToken: z.string().max(2048).optional(),
});

// ── Turnstile verification ─────────────────────────────────────────────────────

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // skip in dev if not configured

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token, remoteip: ip }),
  });

  const data = (await res.json()) as { success: boolean };
  return data.success === true;
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";

  // ── Parse body ───────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue?.message ?? "Invalid input", field: issue?.path[0] },
      { status: 422 },
    );
  }

  const {
    name,
    email,
    subject,
    body: messageBody,
    productId,
    website,
    turnstileToken,
  } = parsed.data;

  // ── Honeypot check ───────────────────────────────────────────────────────────
  // Silently succeed — never alert the bot that it was blocked
  if (website && website.trim().length > 0) {
    return NextResponse.json({ ok: true });
  }

  // ── Session ──────────────────────────────────────────────────────────────────
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  const isGuest = !userId;

  // ── Turnstile (guests only) ───────────────────────────────────────────────────
  if (isGuest) {
    if (!turnstileToken) {
      return NextResponse.json({ error: "CAPTCHA required" }, { status: 400 });
    }
    const valid = await verifyTurnstile(turnstileToken, ip);
    if (!valid) {
      return NextResponse.json(
        { error: "CAPTCHA verification failed. Please try again." },
        { status: 400 },
      );
    }
  }

  // ── Rate limiting ─────────────────────────────────────────────────────────────
  const [ipResult, emailResult] = await Promise.all([
    contactIpRatelimit.limit(ip),
    contactEmailRatelimit.limit(email.toLowerCase()),
  ]);

  if (!ipResult.success || !emailResult.success) {
    const reset = !ipResult.success ? ipResult.reset : emailResult.reset;
    return new NextResponse("Too many messages. Please try again later.", {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
      },
    });
  }

  // ── Validate productId (if provided) ─────────────────────────────────────────
  let productTitle: string | undefined;
  if (productId) {
    const product = await prisma.product.findUnique({
      where: { id: productId, isActive: true },
      select: { title: true },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 400 });
    }
    productTitle = product.title;
  }

  // ── Persist message ───────────────────────────────────────────────────────────
  await prisma.customerMessage.create({
    data: {
      name,
      email,
      subject,
      body: messageBody,
      status: "UNREAD",
      ...(userId ? { userId } : {}),
      ...(productId ? { productId } : {}),
    },
  });

  // ── Send emails (non-fatal) ───────────────────────────────────────────────────
  await Promise.allSettled([
    sendContactAdminEmail({
      name,
      email,
      subject,
      body: messageBody,
      ...(productTitle !== undefined ? { productTitle } : {}),
      ...(productId !== undefined ? { productId } : {}),
    }),
    sendContactAutoReplyEmail(email, name, messageBody),
  ]);

  return NextResponse.json({ ok: true });
}
