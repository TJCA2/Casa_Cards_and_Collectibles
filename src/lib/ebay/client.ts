/**
 * eBay API client — Task 4.1 / 4.2
 *
 * Uses the OAuth 2.0 Client Credentials flow to get an application token,
 * then queries the Browse API to fetch all active listings for our seller.
 *
 * Token is cached in module memory and refreshed automatically before expiry.
 */

const EBAY_API_BASE = "https://api.ebay.com";
const EBAY_TOKEN_URL = `${EBAY_API_BASE}/identity/v1/oauth2/token`;
const BROWSE_SEARCH_URL = `${EBAY_API_BASE}/buy/browse/v1/item_summary/search`;
const EBAY_SCOPE = "https://api.ebay.com/oauth/api_scope";

/** eBay application token cached in module-level memory. */
let cachedToken: { value: string; expiresAt: number } | null = null;

// ── Types ──────────────────────────────────────────────────────────────────────

export interface EbayItemSummary {
  itemId: string;
  title: string;
  price?: { value: string; currency: string };
  condition?: string;
  conditionId?: string;
  thumbnailImages?: { imageUrl: string }[];
  image?: { imageUrl: string };
  categories?: { categoryId: string; categoryName: string }[];
  estimatedAvailabilities?: {
    estimationStatus?: string;
    estimatedAvailableQuantity?: number;
    availabilityThreshold?: number;
    availabilityThresholdType?: string;
  }[];
  itemWebUrl?: string;
}

interface EbaySearchResponse {
  total: number;
  limit: number;
  offset: number;
  itemSummaries?: EbayItemSummary[];
  next?: string;
}

// ── Token management ───────────────────────────────────────────────────────────

/**
 * Fetches a fresh Client Credentials token from eBay.
 * Caches the result with a 5-minute buffer before the stated expiry.
 */
async function getAccessToken(): Promise<string> {
  const now = Date.now();

  // Return cached token if still valid (with 5-min buffer)
  if (cachedToken && now < cachedToken.expiresAt - 300_000) {
    return cachedToken.value;
  }

  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing EBAY_CLIENT_ID or EBAY_CLIENT_SECRET environment variables.");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(EBAY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=client_credentials&scope=${encodeURIComponent(EBAY_SCOPE)}`,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`eBay token request failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedToken = {
    value: data.access_token,
    // expires_in is in seconds
    expiresAt: now + data.expires_in * 1000,
  };

  return cachedToken.value;
}

// ── Browse API ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 200;

/**
 * Fetches all active listings for a given seller using the Browse API.
 * Paginates automatically through all results.
 */
export async function fetchAllSellerListings(sellerUsername: string): Promise<EbayItemSummary[]> {
  const token = await getAccessToken();
  const allItems: EbayItemSummary[] = [];
  let offset = 0;
  let total: number | null = null;

  do {
    const url = new URL(BROWSE_SEARCH_URL);
    url.searchParams.set("sellers", sellerUsername);
    url.searchParams.set("limit", String(PAGE_SIZE));
    url.searchParams.set("offset", String(offset));
    // Request estimated availability so we can get stock quantity
    url.searchParams.set("fieldgroups", "EXTENDED");

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`eBay Browse API error (${response.status}) at offset ${offset}: ${body}`);
    }

    const data = (await response.json()) as EbaySearchResponse;

    if (total === null) {
      total = data.total ?? 0;
    }

    const items = data.itemSummaries ?? [];
    allItems.push(...items);
    offset += items.length;

    // Stop if we received fewer items than the page size or reached the total
  } while (offset < (total ?? 0) && allItems.length < (total ?? 0));

  return allItems;
}
