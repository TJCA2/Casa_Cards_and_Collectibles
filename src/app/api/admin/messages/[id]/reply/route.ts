import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendAdminReplyEmail } from "@/lib/email";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { replyText } = body as { replyText?: string };
  if (!replyText || typeof replyText !== "string" || replyText.trim().length === 0) {
    return NextResponse.json({ error: "Reply text is required" }, { status: 422 });
  }

  const message = await prisma.customerMessage.findUnique({ where: { id } });
  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  await sendAdminReplyEmail({
    toName: message.name,
    toEmail: message.email,
    subject: message.subject,
    originalBody: message.body,
    replyText: replyText.trim(),
  });

  // Mark as resolved after replying
  await prisma.customerMessage.update({
    where: { id },
    data: { status: "RESOLVED" },
  });

  return NextResponse.json({ ok: true });
}
