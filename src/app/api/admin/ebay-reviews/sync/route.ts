import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { syncEbayReviews } from "@/lib/ebay/reviews";
import { logAdminAction } from "@/lib/adminLog";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await syncEbayReviews();

    await logAdminAction(session.user.id, "EBAY_REVIEWS_SYNCED", undefined, undefined, {
      created: result.created,
      skipped: result.skipped,
      total: result.total,
      errors: result.errors.length,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[admin/ebay-reviews/sync] Error:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
