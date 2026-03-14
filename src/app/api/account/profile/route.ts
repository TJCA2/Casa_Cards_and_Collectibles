import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  name: z.string().max(100).optional().nullable(),
  phone: z
    .string()
    .max(30)
    .regex(/^(\+?[0-9\s\-().]{7,30})?$/, "Invalid phone number")
    .optional()
    .nullable(),
});

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { name, phone } = parsed.data;

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: name ?? null,
      phone: phone ?? null,
    },
    select: { id: true, name: true, phone: true, email: true },
  });

  return NextResponse.json(updated);
}
