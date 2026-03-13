/**
 * eBay → database sync logic — Task 4.3
 *
 * Strategy per listing:
 *   1. Look up product by ebayItemId
 *   2. If not found → create new Product (isActive: true)
 *   3. If found    → update eBay-managed fields (price, stock, title, images)
 *   4. Any product with an ebayItemId NOT in the current eBay feed → isActive = false
 *
 * Creates an EbaySyncLog record at start; updates it on completion/failure.
 */

import { Condition, Prisma, PrismaClient } from "@prisma/client";
import { fetchAllSellerListings, EbayItemSummary } from "./client";
import { prisma } from "@/lib/prisma";

const SELLER_USERNAME = "casa_cards_and_collectibles";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Converts an eBay condition string / conditionId to our Condition enum.
 * Defaults to USED for anything unrecognised.
 */
function mapCondition(condition?: string, conditionId?: string): Condition {
  const id = Number(conditionId ?? 0);

  if (id === 1000 || id === 1500) return Condition.NEW;
  if (id >= 2000 && id <= 2750) return Condition.REFURBISHED;
  if (id === 3000) return Condition.LIKE_NEW;

  // Fall back to string matching when conditionId is absent
  const c = (condition ?? "").toLowerCase();
  if (c.includes("new") && !c.includes("like")) return Condition.NEW;
  if (c.includes("like new") || c === "like new") return Condition.LIKE_NEW;
  if (c.includes("refurb") || c.includes("certified")) return Condition.REFURBISHED;

  return Condition.USED;
}

/**
 * Generates a URL-safe slug from a product title + eBay item ID suffix.
 * The suffix guarantees uniqueness across items with identical titles.
 */
function generateSlug(title: string, ebayItemId: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

  // Use last 8 chars of itemId as a short unique suffix
  const suffix = ebayItemId.replace(/\D/g, "").slice(-8);
  return `${base}-${suffix}`;
}

/**
 * Extracts an estimated available quantity from the eBay item.
 * Defaults to 1 (common for single-item collectible listings).
 */
function extractQuantity(item: EbayItemSummary): number {
  const avail = item.estimatedAvailabilities?.[0];
  if (avail?.estimatedAvailableQuantity != null) {
    return Math.max(0, avail.estimatedAvailableQuantity);
  }
  return 1;
}

/**
 * Returns the best image URL from the item, or null if none present.
 */
function primaryImageUrl(item: EbayItemSummary): string | null {
  return item.thumbnailImages?.[0]?.imageUrl ?? item.image?.imageUrl ?? null;
}

// ── Core sync ─────────────────────────────────────────────────────────────────

export interface SyncResult {
  itemsProcessed: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsDeactivated: number;
  errors: string[];
}

/**
 * Runs a full sync from eBay.
 * Returns a SyncResult summary; never throws (errors are captured in the result).
 */
export async function runEbaySync(): Promise<SyncResult> {
  const result: SyncResult = {
    itemsProcessed: 0,
    itemsCreated: 0,
    itemsUpdated: 0,
    itemsDeactivated: 0,
    errors: [],
  };

  // Create the log entry immediately so it's visible even if we crash
  const log = await prisma.ebaySyncLog.create({
    data: { status: "PARTIAL" }, // Will be updated on completion
  });

  try {
    const listings = await fetchAllSellerListings(SELLER_USERNAME);
    const fetchedIds = new Set<string>();

    for (const item of listings) {
      result.itemsProcessed++;

      try {
        await upsertProduct(item, prisma, result);
        fetchedIds.add(item.itemId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`itemId=${item.itemId}: ${msg}`);
      }
    }

    // Deactivate products that are no longer in the eBay feed
    result.itemsDeactivated = await deactivateMissing(fetchedIds);

    // Update log record with final counts
    await prisma.ebaySyncLog.update({
      where: { id: log.id },
      data: {
        completedAt: new Date(),
        status: result.errors.length === 0 ? "SUCCESS" : "PARTIAL",
        itemsProcessed: result.itemsProcessed,
        itemsCreated: result.itemsCreated,
        itemsUpdated: result.itemsUpdated,
        itemsDeactivated: result.itemsDeactivated,
        errorLog:
          result.errors.length > 0
            ? result.errors.slice(0, 50).join("\n") // cap at 50 errors in log
            : null,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Fatal: ${msg}`);

    await prisma.ebaySyncLog.update({
      where: { id: log.id },
      data: {
        completedAt: new Date(),
        status: "FAILED",
        errorLog: msg.slice(0, 2000),
      },
    });
  }

  return result;
}

// ── Upsert a single product ───────────────────────────────────────────────────

async function upsertProduct(
  item: EbayItemSummary,
  db: PrismaClient,
  result: SyncResult,
): Promise<void> {
  const price = parseFloat(item.price?.value ?? "0");
  const condition = mapCondition(item.condition, item.conditionId);
  const stockQuantity = extractQuantity(item);
  const imageUrl = primaryImageUrl(item);
  const slug = generateSlug(item.title, item.itemId);
  const now = new Date();

  const existing = await db.product.findUnique({
    where: { ebayItemId: item.itemId },
    select: { id: true },
  });

  if (!existing) {
    // ── Create new product ──
    const createData: Parameters<typeof db.product.create>[0]["data"] = {
      ebayItemId: item.itemId,
      title: item.title,
      slug,
      price: new Prisma.Decimal(price),
      condition,
      stockQuantity,
      isActive: true,
      lastSyncedAt: now,
    };

    if (imageUrl) {
      createData.images = {
        create: { url: imageUrl, altText: item.title, sortOrder: 0 },
      };
    }

    await db.product.create({ data: createData });
    result.itemsCreated++;
  } else {
    // ── Update existing product ──
    await db.product.update({
      where: { id: existing.id },
      data: {
        title: item.title,
        price: new Prisma.Decimal(price),
        condition,
        stockQuantity,
        isActive: true,
        lastSyncedAt: now,
      },
    });

    // Sync primary image: replace if the URL has changed
    if (imageUrl) {
      const firstImage = await db.productImage.findFirst({
        where: { productId: existing.id, sortOrder: 0 },
        select: { id: true, url: true },
      });

      if (!firstImage) {
        await db.productImage.create({
          data: {
            productId: existing.id,
            url: imageUrl,
            altText: item.title,
            sortOrder: 0,
          },
        });
      } else if (firstImage.url !== imageUrl) {
        await db.productImage.update({
          where: { id: firstImage.id },
          data: { url: imageUrl, altText: item.title },
        });
      }
    }

    result.itemsUpdated++;
  }
}

// ── Deactivate stale products ────────────────────────────────────────────────

/**
 * Sets isActive = false on any product that has an ebayItemId
 * but whose ID was NOT in the latest eBay feed.
 */
async function deactivateMissing(activeIds: Set<string>): Promise<number> {
  if (activeIds.size === 0) return 0;

  const { count } = await prisma.product.updateMany({
    where: {
      ebayItemId: { not: null },
      isActive: true,
      NOT: {
        ebayItemId: { in: [...activeIds] },
      },
    },
    data: { isActive: false },
  });

  return count;
}
