import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/adminLog";

const bodySchema = z.object({
  action: z.enum(["verify", "ban", "unban"]),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session;
}

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { action } = parsed.data;

  // Prevent admins from banning themselves
  if (action === "ban" && id === session.user.id) {
    return NextResponse.json({ error: "You cannot ban your own account." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, banned: true, emailVerified: true },
  });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  let data: Record<string, unknown> = {};
  if (action === "verify") {
    data = { emailVerified: true };
  } else if (action === "ban") {
    data = { banned: true };
  } else {
    data = { banned: false };
  }

  await prisma.user.update({ where: { id }, data });

  await logAdminAction(session.user.id, `CUSTOMER_${action.toUpperCase()}`, "User", id, {
    email: user.email,
  });

  return NextResponse.json({ ok: true });
}
