import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import sanitizeHtml from "sanitize-html";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ImageGallery from "@/components/products/ImageGallery";
import ProductCard from "@/components/products/ProductCard";
import AddToCartButton from "@/components/products/AddToCartButton";
import WishlistButton from "@/components/products/WishlistButton";
import MakeOfferButton from "@/components/products/MakeOfferButton";
import BackButton from "@/components/products/BackButton";
import ShareButtons from "@/components/products/ShareButtons";

// ISR is intentionally NOT used on this route. The page calls getServerSession()
// which reads cookies — a dynamic function that opts the route into per-request
// rendering. ISR would have no effect on Prisma queries and could cause stale
// wishlist/offer button states for different users. Dynamic rendering is correct here.

// ── Types ──────────────────────────────────────────────────────────────────────

type Props = { params: Promise<{ slug: string }> };

// ── Helpers ────────────────────────────────────────────────────────────────────

const CONDITION_SCHEMA: Record<string, string> = {
  NEW: "https://schema.org/NewCondition",
  LIKE_NEW: "https://schema.org/LikeNewCondition",
  USED: "https://schema.org/UsedCondition",
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
  const [product, session] = await Promise.all([getProduct(slug), getServerSession(authOptions)]);

  if (!product || !product.isActive) notFound();

  const related = await getRelatedProducts(product.categoryId, product.id);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://casa-cards.com";
  const productUrl = `${siteUrl}/product/${product.slug}`;

  // Stock status
  const outOfStock = product.stockQuantity === 0;

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
        {/* Back button */}
        <div className="mb-4">
          <BackButton />
        </div>

        {/* Product layout */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          {/* Image gallery */}
          <ImageGallery
            images={product.images.map((img) => ({ url: img.url, altText: img.altText }))}
            title={product.title}
          />

          {/* Product info */}
          <div className="flex flex-col gap-5">
            {/* Admin edit shortcut */}
            {session?.user?.role === "ADMIN" && (
              <Link
                href={`/admin/products/${product.id}/edit`}
                className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 transition"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit in Admin
              </Link>
            )}

            {/* Grade + sport badges */}
            <div className="flex flex-wrap gap-2">
              <span className="w-fit rounded-full bg-yellow-100 px-3 py-0.5 text-xs font-semibold text-yellow-800">
                {product.grade ? product.grade.split(" ").pop() : "N/A"}
              </span>
              {product.sport && (
                <span className="w-fit rounded-full bg-blue-100 px-3 py-0.5 text-xs font-semibold text-blue-700">
                  {product.sport}
                </span>
              )}
            </div>

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

            {/* Make an Offer — only shown when product is active, in stock, and has a price */}
            {!outOfStock && (
              <MakeOfferButton
                productId={product.id}
                productTitle={product.title}
                price={parseFloat(product.price.toString())}
                slug={product.slug ?? slug}
                isLoggedIn={!!session?.user}
              />
            )}

            {/* Ask a Question */}
            <Link
              href={`/contact?productId=${product.id}&productName=${encodeURIComponent(product.title)}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-colors sm:w-auto"
            >
              <svg
                className="h-5 w-5 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              Ask a Question
            </Link>

            {/* eBay cross-link pill */}
            {product.ebayItemId &&
              (() => {
                // Browse API returns "v1|396117382121|0" — extract the numeric listing ID
                const numericId = product.ebayItemId!.split("|")[1] ?? product.ebayItemId!;
                return (
                  <div className="inline-block w-fit">
                    <a
                      href={`https://www.ebay.com/itm/${numericId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-white hover:shadow"
                    >
                      <span
                        className="font-extrabold tracking-tight leading-none"
                        aria-hidden="true"
                      >
                        <span className="text-[#e53238]">e</span>
                        <span className="text-[#0064d2]">B</span>
                        <span className="text-[#f5af02]">a</span>
                        <span className="text-[#86b817]">y</span>
                      </span>
                      Also available on eBay
                      <svg
                        className="h-3.5 w-3.5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  </div>
                );
              })()}

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

            {/* Share buttons */}
            <ShareButtons
              title={product.title}
              url={productUrl}
              imageUrl={product.images[0]?.url ?? null}
            />
          </div>
        </div>

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
