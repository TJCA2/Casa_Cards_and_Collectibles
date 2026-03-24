import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions | Casa Cards & Collectibles",
  description:
    "Terms and conditions governing your use of the Casa Cards & Collectibles website and purchases.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">Terms &amp; Conditions</h1>
      <p className="mb-12 text-sm text-gray-500">Last updated: March 23, 2026</p>

      <div className="space-y-10 text-gray-700">
        {/* 1. Acceptance */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the Casa Cards &amp; Collectibles website at casa-cards.com (the
            &ldquo;Site&rdquo;), you agree to be bound by these Terms &amp; Conditions. If you do
            not agree, please do not use the Site.
          </p>
        </section>

        {/* 2. Use of Site */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">2. Use of the Site</h2>
          <p>You agree to use the Site only for lawful purposes. You may not:</p>
          <ul className="list-disc space-y-1.5 pl-6">
            <li>Use the Site to commit fraud or place orders you do not intend to pay for</li>
            <li>
              Scrape, crawl, or harvest content or data from the Site without our written permission
            </li>
            <li>Attempt to gain unauthorized access to any part of the Site or our systems</li>
            <li>Interfere with or disrupt the Site&rsquo;s operation</li>
            <li>Use the Site in any way that violates applicable federal, state, or local law</li>
          </ul>
        </section>

        {/* 3. Accounts */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">3. Account Responsibility</h2>
          <p>
            If you create an account, you are responsible for maintaining the confidentiality of
            your password and for all activity that occurs under your account. Notify us immediately
            at{" "}
            <a href="mailto:orders@casa-cards.com" className="text-red-600 underline">
              orders@casa-cards.com
            </a>{" "}
            if you suspect unauthorized access.
          </p>
          <p>
            We reserve the right to suspend or terminate accounts that violate these Terms or that
            we reasonably believe are being used fraudulently.
          </p>
        </section>

        {/* 4. Product Listings */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">
            4. Product Listings &amp; Condition
          </h2>
          <p>
            We make every reasonable effort to accurately describe the condition of each item,
            including photographs of the actual card or collectible where noted.
          </p>
          <p>
            Card condition assessments (e.g., Near Mint, Excellent, Good) represent our subjective
            evaluation based on industry-standard grading guidelines. Condition descriptions are
            provided for informational purposes and do not constitute a professional third-party
            grade unless explicitly stated.
          </p>
          <p>
            We reserve the right to correct errors in product descriptions or pricing at any time
            before an order is fulfilled.
          </p>
        </section>

        {/* 5. Pricing */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">5. Pricing</h2>
          <p>
            All prices are listed in US Dollars (USD). We reserve the right to change prices at any
            time without prior notice. In the event of a pricing error, we will notify you and give
            you the option to proceed at the correct price or cancel your order for a full refund.
          </p>
        </section>

        {/* 6. All Sales Final */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">6. All Sales Final</h2>
          <p>
            <strong>All sales are final.</strong> We do not accept returns or exchanges. We
            encourage you to review product photos and descriptions carefully before purchasing.
          </p>
          <p>
            <strong>Exception:</strong> If an item arrives significantly not as described (e.g.,
            wrong card, wrong player, or condition materially worse than the listing stated), or is
            damaged in transit, please contact us at{" "}
            <a href="mailto:orders@casa-cards.com" className="text-red-600 underline">
              orders@casa-cards.com
            </a>{" "}
            within <strong>7 days of delivery</strong> with photos of the item and packaging. We
            will review each situation and may issue a refund at our discretion. See our{" "}
            <a href="/returns" className="text-red-600 underline">
              Return &amp; Refund Policy
            </a>{" "}
            for full details.
          </p>
        </section>

        {/* 7. Payment */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">7. Payment</h2>
          <p>
            Payments are processed securely through Stripe. We do not store your credit card number,
            CVV, or full payment details on our servers. By placing an order, you authorize the
            charge to your selected payment method for the total amount shown at checkout.
          </p>
        </section>

        {/* 8. Shipping */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">8. Shipping</h2>
          <p>
            We ship within the United States only. Orders are processed within 1&ndash;2 business
            days of payment. See our{" "}
            <a href="/shipping" className="text-red-600 underline">
              Shipping Policy
            </a>{" "}
            for full details on carriers, estimated delivery times, and lost package procedures.
          </p>
          <p>
            Risk of loss transfers to the buyer upon our handoff of the package to the carrier
            (USPS). We are not responsible for delays, losses, or damage caused by the carrier after
            pickup.
          </p>
        </section>

        {/* 9. Make-an-Offer */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">9. Make-an-Offer</h2>
          <p>
            When you submit an offer on a listing and it is accepted, the offer constitutes a
            binding agreement to purchase the item at the accepted price. Accepted offers generate a
            one-time purchase link valid for 48 hours. Purchase tokens are non-transferable and may
            not be shared. Failure to complete the purchase within 48 hours will result in the offer
            expiring.
          </p>
        </section>

        {/* 10. Intellectual Property */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">10. Intellectual Property</h2>
          <p>
            All content on the Site — including text, product descriptions, photographs, logos, and
            design — is the property of Casa Cards &amp; Collectibles or its content suppliers. You
            may not reproduce, distribute, or create derivative works from any Site content without
            our express written permission.
          </p>
        </section>

        {/* 11. Disclaimer of Warranties */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">11. Disclaimer of Warranties</h2>
          <p>
            The Site is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without
            warranties of any kind, express or implied. We do not warrant that the Site will be
            uninterrupted, error-free, or free of viruses or other harmful components. We make no
            warranty regarding the accuracy, completeness, or timeliness of any content on the Site.
          </p>
        </section>

        {/* 12. Limitation of Liability */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">12. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, Casa Cards &amp; Collectibles shall not be
            liable for any indirect, incidental, special, consequential, or punitive damages arising
            from your use of the Site or any products purchased through it. Our total liability for
            any claim related to a specific order shall not exceed the amount you paid for that
            order.
          </p>
        </section>

        {/* 13. Governing Law */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">13. Governing Law</h2>
          <p>
            These Terms are governed by the laws of the Commonwealth of Pennsylvania, without regard
            to its conflict of law principles. Any disputes arising from these Terms or your use of
            the Site shall be resolved exclusively in the state or federal courts located in
            Allegheny County, Pennsylvania.
          </p>
        </section>

        {/* 14. Changes */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">14. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. Changes will be posted on this page with an
            updated &ldquo;Last updated&rdquo; date. Continued use of the Site after changes are
            posted constitutes your acceptance of the revised Terms.
          </p>
        </section>

        {/* 15. Contact */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">15. Contact Us</h2>
          <p>
            Questions about these Terms? Reach us at:{" "}
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
