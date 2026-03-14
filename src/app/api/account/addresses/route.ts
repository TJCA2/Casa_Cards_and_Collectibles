import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const addressSchema = z.object({
  name: z.string().min(1).max(100),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional().default(""),
  city: z.string().min(1).max(100),
  state: z.string().length(2),
  zip: z.string().regex(/^\d{5}$/, "ZIP must be 5 digits"),
  isDefault: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { name, line1, line2, city, state, zip, isDefault } = parsed.data;
  const userId = session.user.id;

  const address = await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return tx.address.create({
      data: { userId, name, line1, line2: line2 || null, city, state, zip, isDefault },
    });
  });

  return NextResponse.json(address, { status: 201 });
}
