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
import { fetchAllSellerListings, getItem, ITEMS_BATCH_SIZE, EbayItemSummary } from "./client";
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
  if (id === 3000) return Condition.LIKE_NEW;

  // Fall back to string matching when conditionId is absent
  const c = (condition ?? "").toLowerCase();
  if (c.includes("new") && !c.includes("like")) return Condition.NEW;
  if (c.includes("like new") || c === "like new") return Condition.LIKE_NEW;

  return Condition.USED;
}

/**
 * Attempts to extract a professional grade from a card listing title.
 * Recognises PSA, BGS, SGC, CGC, HGA, GMA, KSA, BVG, CSG.
 * Returns formatted as "GRADER NUMBER" (e.g. "PSA 10", "BGS 9.5", "SGC 98").
 * Returns null if no recognisable grade is found.
 */
export function extractGradeFromTitle(title: string): string | null {
  const match = title.match(
    /\b(PSA|BGS|SGC|CGC|HGA|GMA|KSA|BVG|CSG)\s*(?:GEM\s*(?:MINT|MT)\s*|PRISTINE\s*|MINT\s*)?(\d+(?:\.\d+)?)\b/i,
  );
  if (!match || !match[1] || !match[2]) return null;
  return `${match[1].toUpperCase()} ${match[2]}`;
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
 * Upgrades an eBay thumbnail URL to full-size by replacing the size suffix.
 * e.g. s-l140.jpg → s-l1600.jpg
 */
function upgradeImageUrl(url: string): string {
  return url.replace(/s-l\d+(\.\w+)$/, "s-l1600$1");
}

/**
 * Returns all image URLs for the item, full-size, deduplicated.
 * Falls back to the single image field if thumbnailImages is absent.
 */
function allImageUrls(item: EbayItemSummary): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];

  const candidates = [
    ...(item.thumbnailImages?.map((t) => t.imageUrl) ?? []),
    item.image?.imageUrl,
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    const upgraded = upgradeImageUrl(raw);
    if (!seen.has(upgraded)) {
      seen.add(upgraded);
      urls.push(upgraded);
    }
  }

  return urls;
}

/**
 * Converts a category name to a URL-safe slug.
 */
function categorySlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

/** In-memory cache so we don't hit the DB for every product in a sync run. */
const categoryCache = new Map<string, string>(); // name → id

/**
 * Finds or creates a category by name, returns its ID.
 */
async function findOrCreateCategory(db: PrismaClient, name: string): Promise<string> {
  const cached = categoryCache.get(name);
  if (cached) return cached;

  const slug = categorySlug(name);

  const category = await db.category.upsert({
    where: { slug },
    create: { name, slug },
    update: {},
    select: { id: true },
  });

  categoryCache.set(name, category.id);
  return category.id;
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

  // Clear category cache for this sync run
  categoryCache.clear();

  // Create the log entry immediately so it's visible even if we crash
  const log = await prisma.ebaySyncLog.create({
    data: { status: "PARTIAL" }, // Will be updated on completion
  });

  try {
    const listings = await fetchAllSellerListings(SELLER_USERNAME);
    const fetchedIds = new Set<string>();

    // Batch-fetch item details (sport, grade + other specifics) 20 at a time
    console.warn(`[eBay sync] Fetching item specifics for ${listings.length} listings…`);
    const detailsMap = new Map<
      string,
      { sport: string | null; grade: string | null; images: string[] }
    >();
    const itemIds = listings.map((item) => item.itemId);

    const totalRounds = Math.ceil(itemIds.length / ITEMS_BATCH_SIZE);
    for (let i = 0; i < itemIds.length; i += ITEMS_BATCH_SIZE) {
      const round = Math.floor(i / ITEMS_BATCH_SIZE) + 1;
      const batchIds = itemIds.slice(i, i + ITEMS_BATCH_SIZE);
      console.warn(
        `[eBay sync] Fetching item details ${round}/${totalRounds} (${batchIds.length} concurrent)…`,
      );

      const results = await Promise.allSettled(batchIds.map((id) => getItem(id)));

      results.forEach((result, j) => {
        const itemId = batchIds[j]!;
        if (result.status === "rejected") {
          detailsMap.set(itemId, { sport: null, grade: null, images: [] });
          return;
        }

        const detail = result.value;
        const aspects = detail.localizedAspects ?? [];
        const getAspect = (name: string) =>
          aspects.find((a) => a.name.toLowerCase() === name.toLowerCase())?.value ?? null;

        const sport = getAspect("sport");
        const grader = getAspect("grading company") ?? getAspect("professional grader");
        const gradeNum = getAspect("grade");
        const gradeFromAspects =
          getAspect("professional grade") ??
          (grader && gradeNum ? `${grader} ${gradeNum}` : (grader ?? gradeNum ?? null));
        // Fall back to parsing the title when eBay item specifics don't have a grade
        const grade = gradeFromAspects ?? extractGradeFromTitle(detail.title ?? item.title);

        // Collect all images: primary first, then additionalImages
        const seen = new Set<string>();
        const images: string[] = [];
        for (const raw of [
          detail.image?.imageUrl,
          ...(detail.additionalImages?.map((img) => img.imageUrl) ?? []),
        ]) {
          if (!raw) continue;
          const upgraded = upgradeImageUrl(raw);
          if (!seen.has(upgraded)) {
            seen.add(upgraded);
            images.push(upgraded);
          }
        }

        console.warn(
          `[eBay sync]   ${itemId}: ${images.length} image(s), sport=${sport}, grade=${grade}`,
        );
        detailsMap.set(itemId, { sport, grade, images });
      });
    }

    // Pre-fetch ALL existing products + images in one query to avoid N+1
    console.warn(`[eBay sync] Loading existing products from database…`);
    const existingProducts = await prisma.product.findMany({
      where: { ebayItemId: { in: listings.map((l) => l.itemId) } },
      select: {
        id: true,
        ebayItemId: true,
        title: true,
        price: true,
        condition: true,
        stockQuantity: true,
        isActive: true,
        sport: true,
        grade: true,
        categoryId: true,
        images: { select: { url: true }, orderBy: { sortOrder: "asc" } },
      },
    });
    const existingMap = new Map(existingProducts.map((p) => [p.ebayItemId!, p]));

    console.warn(`[eBay sync] Upserting ${listings.length} products to database…`);
    for (const item of listings) {
      result.itemsProcessed++;

      try {
        const details = detailsMap.get(item.itemId) ?? { sport: null, grade: null, images: [] };
        await upsertProduct(
          item,
          prisma,
          result,
          details.sport,
          details.grade,
          details.images,
          existingMap,
        );
        fetchedIds.add(item.itemId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`itemId=${item.itemId}: ${msg}`);
      }

      // Fire-and-forget DB update every 25 items for live progress display
      if (result.itemsProcessed % 25 === 0) {
        prisma.ebaySyncLog
          .update({
            where: { id: log.id },
            data: {
              itemsProcessed: result.itemsProcessed,
              itemsCreated: result.itemsCreated,
              itemsUpdated: result.itemsUpdated,
            },
          })
          .catch(() => {});
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

type ExistingProduct = {
  id: string;
  ebayItemId: string | null;
  title: string;
  price: Prisma.Decimal;
  condition: string;
  stockQuantity: number;
  isActive: boolean;
  sport: string | null;
  grade: string | null;
  categoryId: string | null;
  images: { url: string }[];
};

async function upsertProduct(
  item: EbayItemSummary,
  db: PrismaClient,
  result: SyncResult,
  sport: string | null,
  grade: string | null,
  detailImages: string[],
  existingMap: Map<string, ExistingProduct>,
): Promise<void> {
  const price = parseFloat(item.price?.value ?? "0");
  const condition = mapCondition(item.condition, item.conditionId);
  const stockQuantity = extractQuantity(item);
  const gradeToValue = (g: string | null): number | null => {
    if (!g) return null;
    const n = parseFloat(g.split(" ").pop() ?? "");
    return isNaN(n) ? null : n;
  };
  // Prefer full-size images from the getItems detail call; fall back to search thumbnails
  const imageUrls = detailImages.length > 0 ? detailImages : allImageUrls(item);
  const slug = generateSlug(item.title, item.itemId);
  const now = new Date();

  const ebayCategoryName = item.categories?.[0]?.categoryName ?? null;
  const categoryId = ebayCategoryName ? await findOrCreateCategory(db, ebayCategoryName) : null;

  const existing = existingMap.get(item.itemId);

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
      sport,
      grade,
      gradeValue: gradeToValue(grade),
      lastSyncedAt: now,
      ...(categoryId && { categoryId }),
    };

    if (imageUrls.length > 0) {
      createData.images = {
        create: imageUrls.map((url, i) => ({ url, altText: item.title, sortOrder: i })),
      };
    }

    await db.product.create({ data: createData });
    result.itemsCreated++;
  } else {
    // ── Check if anything actually changed before hitting the DB ──
    const existingUrls = existing.images.map((img) => img.url);
    const imagesChanged =
      existingUrls.length !== imageUrls.length ||
      imageUrls.some((url, i) => existingUrls[i] !== url);

    // Never overwrite an existing grade with null — keep the DB value if eBay has nothing
    const resolvedGrade = grade ?? existing.grade;

    const fieldsChanged =
      existing.title !== item.title ||
      existing.price.toFixed(2) !== price.toFixed(2) ||
      existing.condition !== condition ||
      existing.stockQuantity !== stockQuantity ||
      !existing.isActive ||
      existing.sport !== sport ||
      existing.grade !== resolvedGrade ||
      existing.categoryId !== categoryId;

    if (!fieldsChanged && !imagesChanged) {
      // Nothing changed — skip all DB writes for this product
      result.itemsUpdated++;
      return;
    }

    if (fieldsChanged) {
      await db.product.update({
        where: { id: existing.id },
        data: {
          title: item.title,
          price: new Prisma.Decimal(price),
          condition,
          stockQuantity,
          isActive: true,
          sport,
          grade: resolvedGrade,
          gradeValue: gradeToValue(resolvedGrade),
          lastSyncedAt: now,
          ...(categoryId && { categoryId }),
        },
      });
    }

    if (imagesChanged && imageUrls.length > 0) {
      console.warn(
        `[eBay sync] Updating images for ${item.itemId}: ${existingUrls.length} → ${imageUrls.length} images`,
      );
      await db.productImage.deleteMany({ where: { productId: existing.id } });
      await db.productImage.createMany({
        data: imageUrls.map((url, i) => ({
          productId: existing.id,
          url,
          altText: item.title,
          sortOrder: i,
        })),
      });
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
