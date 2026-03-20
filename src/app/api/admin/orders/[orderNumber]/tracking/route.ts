import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/adminLog";
import { sendShippingNotificationEmail } from "@/lib/email";

const bodySchema = z.object({
  trackingNumber: z.string().min(1).max(200),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session;
}

type Params = { params: Promise<{ orderNumber: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { orderNumber } = await params;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { trackingNumber } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: {
      id: true,
      customerEmail: true,
      user: { select: { name: true, email: true } },
    },
  });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  await prisma.order.update({ where: { orderNumber }, data: { trackingNumber } });

  // Send shipping notification
  const recipientEmail = order.user?.email ?? order.customerEmail;
  const recipientName = order.user?.name ?? "Valued Customer";
  if (recipientEmail) {
    try {
      await sendShippingNotificationEmail({
        orderNumber,
        customerEmail: recipientEmail,
        customerName: recipientName,
        trackingNumber,
      });
    } catch (err) {
      console.error("[tracking] Failed to send shipping notification:", err);
    }
  }

  await logAdminAction(session.user.id, "ADD_TRACKING", "Order", order.id, {
    orderNumber,
    trackingNumber,
  });

  return NextResponse.json({ trackingNumber, emailSent: !!recipientEmail });
}
