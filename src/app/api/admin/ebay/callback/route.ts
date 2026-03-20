import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { exchangeCodeForTokens } from "@/lib/ebay/oauth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }

  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const base = `${origin}/admin/ebay-sync`;

  if (error) {
    return NextResponse.redirect(`${base}?ebay_auth=error&message=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${base}?ebay_auth=error&message=No+authorization+code+received`);
  }

  const ruName = process.env.EBAY_RUNAME;
  if (!ruName) {
    return NextResponse.redirect(`${base}?ebay_auth=error&message=Missing+EBAY_RUNAME`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code, ruName);

    await prisma.ebaySellerStats.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        oauthRefreshToken: tokens.refresh_token,
        oauthAccessToken: tokens.access_token,
        oauthTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
        positiveFeedbackPercent: 0,
        totalFeedbackCount: 0,
        positiveFeedbackCount: 0,
        negativeFeedbackCount: 0,
        neutralFeedbackCount: 0,
      },
      update: {
        oauthRefreshToken: tokens.refresh_token,
        oauthAccessToken: tokens.access_token,
        oauthTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });

    return NextResponse.redirect(`${base}?ebay_auth=success`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[ebay/callback] Error:", message);
    return NextResponse.redirect(`${base}?ebay_auth=error&message=${encodeURIComponent(message)}`);
  }
}
