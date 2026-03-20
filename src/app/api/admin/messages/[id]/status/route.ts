import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/adminLog";

const schema = z.object({
  status: z.enum(["UNREAD", "READ", "RESOLVED"]),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    );
  }

  const message = await prisma.customerMessage.findUnique({ where: { id } });
  if (!message) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.customerMessage.update({
    where: { id },
    data: { status: parsed.data.status },
    select: { status: true },
  });

  await logAdminAction(session.user.id, "MESSAGE_STATUS_UPDATED", "CustomerMessage", id, {
    from: message.status,
    to: parsed.data.status,
  });

  return NextResponse.json({ status: updated.status });
}
