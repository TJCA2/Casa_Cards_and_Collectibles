import { prisma } from "@/lib/prisma";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://casa-cards.com";
const STORE_NAME = "Casa Cards & Collectibles";

// Map Prisma Condition enum → Google Merchant Center condition values
const CONDITION_MAP: Record<string, string> = {
  NEW: "new",
  LIKE_NEW: "used",
  USED: "used",
  REFURBISHED: "refurbished",
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET() {
  const products = await prisma.product.findMany({
    where: { isActive: true, slug: { not: null } },
    select: {
      id: true,
      title: true,
      description: true,
      slug: true,
      price: true,
      stockQuantity: true,
      condition: true,
      images: {
        where: { sortOrder: 0 },
        take: 1,
        select: { url: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const items = products
    .map((p) => {
      const imageUrl = p.images[0]?.url;
      // Skip products with no image — Google requires image_link
      if (!imageUrl) return null;

      const link = `${SITE_URL}/product/${p.slug}`;
      const price = parseFloat(p.price.toString()).toFixed(2);
      const availability = p.stockQuantity > 0 ? "in stock" : "out of stock";
      const condition = CONDITION_MAP[p.condition] ?? "used";

      const rawDescription = p.description ? stripHtml(p.description).slice(0, 5000) : p.title;

      return `
    <item>
      <g:id>${escapeXml(p.id)}</g:id>
      <g:title>${escapeXml(p.title)}</g:title>
      <g:description>${escapeXml(rawDescription)}</g:description>
      <g:link>${escapeXml(link)}</g:link>
      <g:image_link>${escapeXml(imageUrl)}</g:image_link>
      <g:availability>${availability}</g:availability>
      <g:price>${price} USD</g:price>
      <g:condition>${condition}</g:condition>
      <g:brand>${escapeXml(STORE_NAME)}</g:brand>
      <g:identifier_exists>no</g:identifier_exists>
    </item>`;
    })
    .filter(Boolean)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(STORE_NAME)}</title>
    <link>${SITE_URL}</link>
    <description>Sports cards and collectibles — baseball, basketball, football, and more.</description>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=600",
    },
  });
}
