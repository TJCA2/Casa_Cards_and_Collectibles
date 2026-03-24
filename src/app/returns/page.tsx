import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Return & Refund Policy | Casa Cards & Collectibles",
  description:
    "Casa Cards & Collectibles return and refund policy. All sales are final. Learn about our exception process for damaged or misrepresented items.",
};

export default function ReturnsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">Return &amp; Refund Policy</h1>
      <p className="mb-12 text-sm text-gray-500">Last updated: March 23, 2026</p>

      <div className="space-y-10 text-gray-700">
        {/* 1. All Sales Final */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">1. All Sales Final</h2>
          <p>
            <strong>We do not accept returns or exchanges on any orders.</strong> All sales are
            final. We encourage you to review product photos and condition descriptions carefully
            before purchasing.
          </p>
        </section>

        {/* 2. Why */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">
            2. Our Commitment to Accurate Listings
          </h2>
          <p>
            Every card and collectible is personally inspected before listing. We provide detailed
            condition descriptions and photographs of the actual item so you know exactly what you
            are purchasing. Our condition grades follow standard industry guidelines and reflect our
            honest assessment.
          </p>
          <p>
            If you have questions about a specific item before buying, please use the &ldquo;Ask a
            Question&rdquo; feature on any product page or{" "}
            <a href="/contact" className="text-red-600 underline">
              contact us
            </a>{" "}
            — we are happy to provide additional photos or details.
          </p>
        </section>

        {/* 3. SNAD Exception */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">
            3. Exception: Item Significantly Not As Described
          </h2>
          <p>
            If you receive an item that is <strong>materially different</strong> from its listing —
            for example, the wrong card, the wrong player, or a condition substantially worse than
            described — please contact us within <strong>7 days of delivery</strong>.
          </p>
          <p>To open a dispute, email us at:</p>
          <p>
            <a href="mailto:orders@casa-cards.com" className="text-red-600 underline font-medium">
              orders@casa-cards.com
            </a>
          </p>
          <p>Please include:</p>
          <ul className="list-disc space-y-1.5 pl-6">
            <li>Your order number</li>
            <li>A description of the discrepancy</li>
            <li>Clear photos of the item received and, if applicable, the packaging</li>
          </ul>
          <p>
            We will review each case individually and, if the claim is valid, may issue a full
            refund at our discretion. Disputes submitted more than 7 days after the confirmed
            delivery date will not be eligible for review.
          </p>
        </section>

        {/* 4. Damaged in Transit */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">4. Damaged in Transit</h2>
          <p>
            If your item arrives damaged due to shipping (e.g., crushed packaging, bent card from
            postal handling), contact us within <strong>7 days of delivery</strong> at{" "}
            <a href="mailto:orders@casa-cards.com" className="text-red-600 underline">
              orders@casa-cards.com
            </a>{" "}
            with photos of both the item and the packaging. We will file a claim with USPS on your
            behalf and work toward a fair resolution.
          </p>
          <p>
            Please retain all original packaging until the matter is resolved, as USPS may require
            it to process the claim.
          </p>
        </section>

        {/* 5. Refund Processing */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">5. Refund Processing</h2>
          <p>
            If a refund is approved, it will be issued to your original payment method within
            5&ndash;10 business days. Refunds are processed through Stripe and the time to appear on
            your statement may vary by bank or card issuer.
          </p>
        </section>

        {/* 6. eBay Purchases */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">6. Items Purchased via eBay</h2>
          <p>
            If you purchased an item through our eBay store (
            <a
              href="https://www.ebay.com/usr/casa_cards_and_collectibles"
              className="text-red-600 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              ebay.com/usr/casa_cards_and_collectibles
            </a>
            ), your purchase is covered by eBay&rsquo;s Money Back Guarantee policy, which
            supersedes this policy for that transaction.
          </p>
        </section>

        {/* 7. Contact */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">7. Contact Us</h2>
          <p>
            For any questions about your order, please reach out at:{" "}
            <a href="mailto:orders@casa-cards.com" className="text-red-600 underline">
              orders@casa-cards.com
            </a>
          </p>
          <p className="text-sm text-gray-500">
            Casa Cards &amp; Collectibles &bull; Pittsburgh, PA
          </p>
        </section>
      </div>
    </main>
  );
}
