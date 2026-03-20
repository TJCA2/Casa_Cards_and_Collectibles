/**
 * eBay API client — uses the Browse API with OAuth Client Credentials.
 *
 * The Browse API requires either a `q` or `category_ids` parameter alongside
 * the seller filter. We use a broad multi-category search across all major
 * eBay categories to capture every listing for the seller.
 */

const EBAY_API_BASE = "https://api.ebay.com";
const EBAY_TOKEN_URL = `${EBAY_API_BASE}/identity/v1/oauth2/token`;
const BROWSE_SEARCH_URL = `${EBAY_API_BASE}/buy/browse/v1/item_summary/search`;
const EBAY_SCOPE = "https://api.ebay.com/oauth/api_scope";

// eBay top-level category IDs — covers all major categories
const ROOT_CATEGORY_IDS = [
  "550", // Art
  "1", // Antiques
  "267", // Books & Magazines
  "11450", // Clothing, Shoes & Accessories
  "26395", // Collectibles
  "293", // Consumer Electronics
  "237", // Dolls & Bears
  "64482", // Computers & Networking
  "45100", // DVDs & Movies
  "9355", // Games
  "172008", // Health & Beauty
  "11116", // Home & Garden
  "281", // Jewelry & Watches
  "11233", // Music
  "1249", // Musical Instruments
  "870", // Pottery & Glass
  "888", // Sporting Goods
  "64482", // Tablets
  "220", // Golf
  "2984", // Baby
  "58058", // Coins & Paper Money
  "6000", // Toys & Hobbies
  "9800", // Travel
  "6028", // Video Games & Consoles
  "625", // Cameras & Photo
  "15032", // Cell Phones & Accessories
];

const PAGE_SIZE = 200;

/** eBay application token cached in module-level memory. */
let cachedToken: { value: string; expiresAt: number } | null = null;

// ── Types ──────────────────────────────────────────────────────────────────────

export interface EbayItemDetail {
  itemId: string;
  image?: { imageUrl: string };
  additionalImages?: { imageUrl: string }[];
  localizedAspects?: { name: string; value: string }[];
}

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
    estimatedAvailableQuantity?: number;
  }[];
}

interface EbaySearchResponse {
  total: number;
  limit: number;
  offset: number;
  itemSummaries?: EbayItemSummary[];
}

// ── Token management ───────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  const now = Date.now();

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
    expiresAt: now + data.expires_in * 1000,
  };

  return cachedToken.value;
}

// ── Browse API ─────────────────────────────────────────────────────────────────

const ITEM_URL = `${EBAY_API_BASE}/buy/browse/v1/item`;
export const ITEMS_BATCH_SIZE = 20; // concurrent requests per round

/**
 * Fetches full details for a single eBay listing.
 * Returns image, additionalImages, and localizedAspects (sport, grade, etc.).
 */
export async function getItem(itemId: string): Promise<EbayItemDetail> {
  const token = await getAccessToken();
  const url = `${ITEM_URL}/${encodeURIComponent(itemId)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`eBay getItem failed (${response.status}): ${body}`);
  }

  return response.json() as Promise<EbayItemDetail>;
}

/**
 * Fetches all active listings for a seller by searching across all major
 * eBay categories. Runs all category searches concurrently for speed.
 * Deduplicates by itemId since a listing can appear in multiple categories.
 */
export async function fetchAllSellerListings(sellerUsername: string): Promise<EbayItemSummary[]> {
  const token = await getAccessToken();

  console.warn(`[eBay sync] Searching ${ROOT_CATEGORY_IDS.length} categories in parallel…`);

  const results = await Promise.allSettled(
    ROOT_CATEGORY_IDS.map((categoryId) =>
      fetchSellerListingsByCategory(token, sellerUsername, categoryId),
    ),
  );

  const seen = new Set<string>();
  const allItems: EbayItemSummary[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const item of result.value) {
        if (!seen.has(item.itemId)) {
          seen.add(item.itemId);
          allItems.push(item);
        }
      }
    }
    // Silently skip failed categories — don't abort the whole sync
  }

  console.warn(`[eBay sync] Found ${allItems.length} unique listings.`);
  return allItems;
}

async function fetchSellerListingsByCategory(
  token: string,
  sellerUsername: string,
  categoryId: string,
): Promise<EbayItemSummary[]> {
  const items: EbayItemSummary[] = [];
  let offset = 0;
  let total: number | null = null;

  do {
    const url = new URL(BROWSE_SEARCH_URL);
    url.searchParams.set("category_ids", categoryId);
    url.searchParams.set("filter", `sellers:{${sellerUsername}}`);
    url.searchParams.set("limit", String(PAGE_SIZE));
    url.searchParams.set("offset", String(offset));
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
      throw new Error(`eBay Browse API error (${response.status}): ${body}`);
    }

    const data = (await response.json()) as EbaySearchResponse;

    if (total === null) total = data.total ?? 0;

    const page = data.itemSummaries ?? [];
    items.push(...page);
    offset += page.length;
  } while (offset < (total ?? 0));

  return items;
}
