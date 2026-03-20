import { NextRequest, NextResponse } from "next/server";
import { syncEbayReviews } from "@/lib/ebay/reviews";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncEbayReviews();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/ebay-reviews] Error:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
