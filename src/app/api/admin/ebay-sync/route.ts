/**
 * Admin eBay Sync API — Task 4.5
 *
 * GET  /api/admin/ebay-sync  — returns last 10 sync log entries
 * POST /api/admin/ebay-sync  — triggers an immediate sync (admin only)
 *
 * Admin-only: protected by middleware in proxy.ts (ADMIN role required).
 */

import { NextResponse } from "next/server";
import { runEbaySync } from "@/lib/ebay/sync";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  try {
    const logs = await prisma.ebaySyncLog.findMany({
      orderBy: { startedAt: "desc" },
      take: 10,
    });

    return NextResponse.json({ logs });
  } catch (err) {
    console.error("[admin/ebay-sync GET]", err);
    return NextResponse.json({ error: "Failed to fetch sync logs." }, { status: 500 });
  }
}

export async function POST() {
  try {
    const result = await runEbaySync();

    return NextResponse.json({
      ok: true,
      itemsProcessed: result.itemsProcessed,
      itemsCreated: result.itemsCreated,
      itemsUpdated: result.itemsUpdated,
      itemsDeactivated: result.itemsDeactivated,
      errorCount: result.errors.length,
      errors: result.errors.slice(0, 10), // show first 10 in response
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[admin/ebay-sync POST]", msg);
    return NextResponse.json({ error: "Sync failed." }, { status: 500 });
  }
}
