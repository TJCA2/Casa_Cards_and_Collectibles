import { prisma } from "@/lib/prisma";

const EBAY_TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const FEEDBACK_SCOPE = "https://api.ebay.com/oauth/api_scope/sell.feedback offline_access";

function getCredentials(): string {
  const clientId = process.env.EBAY_CLIENT_ID!;
  const clientSecret = process.env.EBAY_CLIENT_SECRET!;
  return Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

export function getEbayAuthUrl(ruName: string): string {
  const params = new URLSearchParams({
    client_id: process.env.EBAY_CLIENT_ID!,
    redirect_uri: ruName,
    response_type: "code",
    scope: FEEDBACK_SCOPE,
    prompt: "login",
  });
  return `https://auth.ebay.com/oauth2/authorize?${params}`;
}

export async function exchangeCodeForTokens(code: string, ruName: string) {
  const res = await fetch(EBAY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${getCredentials()}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: ruName,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay token exchange failed (${res.status}): ${text.slice(0, 300)}`);
  }

  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>;
}

async function refreshAccessToken(
  refreshToken: string,
): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(EBAY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${getCredentials()}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      scope: FEEDBACK_SCOPE,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay token refresh failed (${res.status}): ${text.slice(0, 300)}`);
  }

  return res.json();
}

export async function getEbayAccessToken(): Promise<string> {
  const stats = await prisma.ebaySellerStats.findUnique({
    where: { id: "singleton" },
    select: { oauthRefreshToken: true, oauthAccessToken: true, oauthTokenExpiry: true },
  });

  if (!stats?.oauthRefreshToken) {
    throw new Error(
      "eBay not authorized. Visit /admin/ebay-sync and click 'Connect eBay Account'.",
    );
  }

  // Return cached access token if still valid (with 60s buffer)
  if (
    stats.oauthAccessToken &&
    stats.oauthTokenExpiry &&
    stats.oauthTokenExpiry > new Date(Date.now() + 60_000)
  ) {
    return stats.oauthAccessToken;
  }

  // Refresh
  const tokens = await refreshAccessToken(stats.oauthRefreshToken);
  const expiry = new Date(Date.now() + tokens.expires_in * 1000);

  await prisma.ebaySellerStats.update({
    where: { id: "singleton" },
    data: { oauthAccessToken: tokens.access_token, oauthTokenExpiry: expiry },
  });

  return tokens.access_token;
}
