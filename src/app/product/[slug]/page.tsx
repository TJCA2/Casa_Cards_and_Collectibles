import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import sanitizeHtml from "sanitize-html";
import { prisma } from "@/lib/prisma";
import ImageGallery from "@/components/products/ImageGallery";
import ProductCard from "@/components/products/ProductCard";
import AddToCartButton from "@/components/products/AddToCartButton";
import WishlistButton from "@/components/products/WishlistButton";

// ── Types ──────────────────────────────────────────────────────────────────────

type Props = { params: Promise<{ slug: string }> };

// ── Helpers ────────────────────────────────────────────────────────────────────

const CONDITION_LABEL: Record<string, string> = {
  NEW: "New",
  LIKE_NEW: "Like New",
  USED: "Used",
  REFURBISHED: "Refurbished",
};

const CONDITION_STYLE: Record<string, string> = {
  NEW: "bg-red-600 text-white",
  LIKE_NEW: "bg-gray-800 text-white",
  USED: "bg-gray-200 text-gray-700",
  REFURBISHED: "bg-blue-100 text-blue-700",
};

const CONDITION_SCHEMA: Record<string, string> = {
  NEW: "https://schema.org/NewCondition",
  LIKE_NEW: "https://schema.org/LikeNewCondition",
  USED: "https://schema.org/UsedCondition",
  REFURBISHED: "https://schema.org/RefurbishedCondition",
};

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "ul",
    "ol",
    "li",
    "strong",
    "b",
    "em",
    "i",
    "span",
    "div",
    "h2",
    "h3",
    "h4",
    "table",
    "thead",
    "tbody",
    "tr",
    "td",
    "th",
  ],
  allowedAttributes: { span: ["style"], div: ["style"] },
  allowedStyles: {
    "*": { color: [/.*/], "font-weight": [/.*/], "text-decoration": [/.*/] },
  },
};

// ── Data fetching ──────────────────────────────────────────────────────────────

async function getProduct(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      category: true,
      reviews: {
        include: { user: { select: { email: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

async function getRelatedProducts(categoryId: string | null, excludeId: string) {
  if (!categoryId) return [];
  return prisma.product.findMany({
    where: { categoryId, isActive: true, id: { not: excludeId } },
    take: 4,
    orderBy: { createdAt: "desc" },
    include: { images: { where: { sortOrder: 0 }, take: 1 } },
  });
}

// ── Metadata ───────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    select: { title: true, description: true, images: { take: 1, orderBy: { sortOrder: "asc" } } },
  });
  if (!product) return { title: "Product Not Found" };

  return {
    title: product.title,
    description: product.description
      ? sanitizeHtml(product.description, { allowedTags: [] }).slice(0, 160)
      : undefined,
    openGraph: {
      images: product.images[0] ? [{ url: product.images[0].url }] : [],
    },
  };
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product || !product.isActive) notFound();

  const related = await getRelatedProducts(product.categoryId, product.id);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://casacards.com";
  const productUrl = `${siteUrl}/product/${product.slug}`;

  // Stock status
  const outOfStock = product.stockQuantity === 0;
  const lowStock = !outOfStock && product.stockQuantity <= product.lowStockThreshold;

  // Clean description HTML
  const cleanDescription = product.description
    ? sanitizeHtml(product.description, SANITIZE_OPTIONS)
    : null;

  // JSON-LD
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image: product.images.map((img) => img.url),
    description: product.description
      ? sanitizeHtml(product.description, { allowedTags: [] }).slice(0, 500)
      : undefined,
    sku: product.sku ?? undefined,
    offers: {
      "@type": "Offer",
      url: productUrl,
      price: product.price.toString(),
      priceCurrency: "USD",
      availability: outOfStock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      itemCondition: CONDITION_SCHEMA[product.condition] ?? "https://schema.org/UsedCondition",
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      ...(product.category
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: product.category.name,
              item: `${siteUrl}/category/${product.category.slug}`,
            },
            { "@type": "ListItem", position: 3, name: product.title },
          ]
        : [{ "@type": "ListItem", position: 2, name: product.title }]),
    ],
  };

  const displayPrice = parseFloat(product.price.toString()).toFixed(2);
  const comparePrice = product.compareAtPrice
    ? parseFloat(product.compareAtPrice.toString()).toFixed(2)
    : null;

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="mx-auto max-w-7xl px-4 py-10">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-900">
            Home
          </Link>
          <span>/</span>
          {product.category ? (
            <>
              <Link href={`/category/${product.category.slug}`} className="hover:text-gray-900">
                {product.category.name}
              </Link>
              <span>/</span>
            </>
          ) : (
            <>
              <Link href="/shop" className="hover:text-gray-900">
                Shop
              </Link>
              <span>/</span>
            </>
          )}
          <span className="line-clamp-1 text-gray-900">{product.title}</span>
        </nav>

        {/* Product layout */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          {/* Image gallery */}
          <ImageGallery
            images={product.images.map((img) => ({ url: img.url, altText: img.altText }))}
            title={product.title}
          />

          {/* Product info */}
          <div className="flex flex-col gap-5">
            {/* Condition badge */}
            <span
              className={`w-fit rounded-full px-3 py-0.5 text-xs font-semibold ${
                CONDITION_STYLE[product.condition] ?? "bg-gray-200 text-gray-700"
              }`}
            >
              {CONDITION_LABEL[product.condition] ?? product.condition}
            </span>

            {/* Title */}
            <h1 className="text-2xl font-bold text-gray-900 leading-tight sm:text-3xl">
              {product.title}
            </h1>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-gray-900">${displayPrice}</span>
              {comparePrice && (
                <span className="text-lg text-gray-400 line-through">${comparePrice}</span>
              )}
            </div>

            {/* Stock status */}
            <div>
              {outOfStock ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  Out of Stock
                </span>
              ) : lowStock ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-600">
                  <span className="h-2 w-2 rounded-full bg-orange-500" />
                  Only {product.stockQuantity} left!
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  In Stock
                </span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <AddToCartButton
                outOfStock={outOfStock}
                item={{
                  productId: product.id,
                  slug: product.slug ?? slug,
                  title: product.title,
                  price: parseFloat(product.price.toString()),
                  imageUrl: product.images[0]?.url ?? null,
                  condition: product.condition,
                  quantity: 1,
                  stockQuantity: product.stockQuantity,
                }}
              />
              <WishlistButton productId={product.id} slug={product.slug ?? slug} />
            </div>

            {/* eBay cross-link */}
            {product.ebayItemId && (
              <a
                href={`https://www.ebay.com/itm/${product.ebayItemId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                Also available on eBay →
              </a>
            )}

            {/* Description */}
            {cleanDescription ? (
              <div className="border-t border-gray-100 pt-5">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Description
                </h2>
                <div
                  className="prose prose-sm max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: cleanDescription }}
                />
              </div>
            ) : product.description ? (
              <div className="border-t border-gray-100 pt-5">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Description
                </h2>
                <p className="text-sm text-gray-700">{product.description}</p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Reviews */}
        <section className="mt-16 border-t border-gray-100 pt-10">
          <h2 className="mb-6 text-xl font-bold text-gray-900">
            Customer Reviews
            {product.reviews.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({product.reviews.length})
              </span>
            )}
          </h2>

          {product.reviews.length === 0 ? (
            <p className="text-sm text-gray-400">No reviews yet. Check back after purchase.</p>
          ) : (
            <div className="space-y-6">
              {product.reviews.map((review) => (
                <div key={review.id} className="rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <svg
                            key={i}
                            className={`h-4 w-4 ${i < review.rating ? "text-yellow-400" : "text-gray-200"}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      {review.title && (
                        <p className="mt-1 font-semibold text-gray-900">{review.title}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(review.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  {review.body && <p className="mt-2 text-sm text-gray-700">{review.body}</p>}
                  {review.isVerified && (
                    <p className="mt-2 text-xs font-medium text-green-600">✓ Verified Purchase</p>
                  )}
                </div>
              ))}
            </div>
          )}
          <p className="mt-4 text-xs text-gray-400">
            Reviewing available for verified purchasers — coming in a future update.
          </p>
        </section>

        {/* Related products */}
        {related.length > 0 && (
          <section className="mt-16 border-t border-gray-100 pt-10">
            <h2 className="mb-6 text-xl font-bold text-gray-900">You May Also Like</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {related.map((p) => (
                <ProductCard
                  key={p.id}
                  id={p.id}
                  slug={p.slug}
                  title={p.title}
                  price={p.price.toString()}
                  condition={p.condition}
                  stockQuantity={p.stockQuantity}
                  imageUrl={p.images[0]?.url ?? null}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
