import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * Write an entry to AdminActivityLog.
 * Non-fatal — logs to console on failure so a logging error never breaks a response.
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  detail?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.adminActivityLog.create({
      data: {
        adminId,
        action,
        targetType: targetType ?? null,
        targetId: targetId ?? null,
        detail: detail !== undefined ? (detail as Prisma.InputJsonValue) : Prisma.DbNull,
      },
    });
  } catch (err) {
    console.error("[adminLog] Failed to write activity log:", err);
  }
}
