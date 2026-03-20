import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/adminLog";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session;
}

export async function GET(_req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  // Get all active subscriber emails
  const subscribers = await prisma.emailSubscriber.findMany({
    where: { isActive: true },
    select: { email: true },
  });
  const subscribedEmails = new Set(subscribers.map((s) => s.email.toLowerCase()));

  if (subscribedEmails.size === 0) {
    const empty = "name,email,orders,total_spent,joined\n";
    return new NextResponse(empty, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="customers-${Date.now()}.csv"`,
      },
    });
  }

  // Fetch users whose email is in the subscriber list
  const users = await prisma.user.findMany({
    where: { email: { in: Array.from(subscribedEmails) } },
    select: {
      name: true,
      email: true,
      createdAt: true,
      orders: {
        where: { status: { notIn: ["CANCELLED", "REFUNDED"] } },
        select: { totalAmount: true },
      },
    },
  });

  const rows = users.map((u) => {
    const orderCount = u.orders.length;
    const totalSpent = u.orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const joined = u.createdAt.toISOString().slice(0, 10);
    // Escape CSV fields: wrap in quotes, escape inner quotes
    const csvName = `"${(u.name ?? "").replace(/"/g, '""')}"`;
    const csvEmail = `"${u.email.replace(/"/g, '""')}"`;
    return `${csvName},${csvEmail},${orderCount},${totalSpent.toFixed(2)},${joined}`;
  });

  const csv = ["name,email,orders,total_spent,joined", ...rows].join("\n");

  await logAdminAction(session.user.id, "EXPORT_CUSTOMERS", undefined, undefined, {
    count: users.length,
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="customers-${Date.now()}.csv"`,
    },
  });
}
