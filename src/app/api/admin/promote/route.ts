import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Bootstrap endpoint: promotes a verified user to ADMIN role.
// Protected by ADMIN_BOOTSTRAP_SECRET — intended for first-time setup only.
// Full invite UI will be built in Phase 8 (Admin Dashboard).

const bodySchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(request: NextRequest) {
  const secret = process.env.ADMIN_BOOTSTRAP_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Not configured." }, { status: 501 });
  }

  const providedSecret = request.headers.get("x-admin-secret");
  if (!providedSecret || providedSecret !== secret) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { email } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, emailVerified: true, role: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (!user.emailVerified) {
    return NextResponse.json(
      { error: "User must verify their email before being granted admin access." },
      { status: 400 },
    );
  }

  if (user.role === "ADMIN") {
    return NextResponse.json({ message: "User is already an admin." });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: "ADMIN" },
  });

  return NextResponse.json({ message: `${email} has been granted ADMIN role.` });
}
