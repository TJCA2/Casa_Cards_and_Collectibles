/**
 * POST /api/newsletter/subscribe
 *
 * Adds an email to the EmailSubscriber table.
 * Idempotent: existing active subscriber returns 200 silently.
 * Rate-limited via proxy.ts (apiRatelimit).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  email: z.string().email("Invalid email address").max(254),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 422 },
    );
  }

  const { email } = parsed.data;

  await prisma.emailSubscriber.upsert({
    where: { email },
    update: { isActive: true },
    create: { email, isActive: true },
  });

  return NextResponse.json({ ok: true });
}
