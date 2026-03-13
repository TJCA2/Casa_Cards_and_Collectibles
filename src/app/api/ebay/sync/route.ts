/**
 * /api/ebay/sync — Task 4.4
 *
 * Two invocation paths:
 *
 * GET  — called by Vercel Cron (every 6 hours, see vercel.json).
 *         Vercel injects an `Authorization: Bearer <CRON_SECRET>` header.
 *
 * POST — called manually (e.g. scripts, CI) with `X-Sync-Secret` header.
 *         Uses the EBAY_SYNC_SECRET env variable for auth.
 *
 * Both return 401 for missing/wrong credentials and 200 with counts on success.
 */

import { NextRequest, NextResponse } from "next/server";
import { runEbaySync } from "@/lib/ebay/sync";

export const dynamic = "force-dynamic";
// Allow up to 5 minutes for the sync to complete (Vercel Pro / Enterprise)
export const maxDuration = 300;

/** Runs the sync and returns a standard JSON response. */
async function handleSync(label: string): Promise<NextResponse> {
  try {
    console.log(`[ebay/sync:${label}] Starting sync...`);
    const result = await runEbaySync();
    console.log(`[ebay/sync:${label}] Complete:`, result);

    return NextResponse.json({
      ok: true,
      itemsProcessed: result.itemsProcessed,
      itemsCreated: result.itemsCreated,
      itemsUpdated: result.itemsUpdated,
      itemsDeactivated: result.itemsDeactivated,
      errorCount: result.errors.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[ebay/sync:${label}] Unexpected error:`, msg);
    return NextResponse.json({ error: "Sync failed." }, { status: 500 });
  }
}

/**
 * GET — Vercel Cron handler.
 * Vercel sets CRON_SECRET and sends it as `Authorization: Bearer <secret>`.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[ebay/sync] CRON_SECRET is not set.");
    return NextResponse.json({ error: "Sync not configured." }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${cronSecret}`;

  if (!authHeader || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return handleSync("cron");
}

/**
 * POST — Manual invocation via X-Sync-Secret header.
 */
export async function POST(request: NextRequest) {
  const syncSecret = process.env.EBAY_SYNC_SECRET;

  if (!syncSecret) {
    console.error("[ebay/sync] EBAY_SYNC_SECRET is not set.");
    return NextResponse.json({ error: "Sync not configured." }, { status: 503 });
  }

  const providedSecret = request.headers.get("x-sync-secret");

  if (!providedSecret || providedSecret !== syncSecret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return handleSync("manual");
}
