import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping Policy | Casa Cards & Collectibles",
  description:
    "Shipping information for Casa Cards & Collectibles — carriers, processing times, rates, and lost package policy.",
};

export default function ShippingPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">Shipping Policy</h1>
      <p className="mb-12 text-sm text-gray-500">Last updated: March 23, 2026</p>

      <div className="space-y-10 text-gray-700">
        {/* 1. Domestic Only */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">1. Domestic Shipping Only</h2>
          <p>
            We currently ship within the <strong>United States only</strong>. We do not offer
            international shipping at this time. All orders must have a valid US shipping address at
            checkout.
          </p>
        </section>

        {/* 2. Processing Time */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">2. Processing Time</h2>
          <p>
            Orders are processed and shipped within <strong>1&ndash;2 business days</strong> of
            payment confirmation. Orders placed on weekends or federal holidays will be processed on
            the next business day.
          </p>
          <p>You will receive an email with your tracking number once your order has shipped.</p>
        </section>

        {/* 3. Shipping Options */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">3. Shipping Options &amp; Rates</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Method</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Cost</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Estimated Delivery
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                <tr>
                  <td className="px-4 py-3">USPS First Class Mail</td>
                  <td className="px-4 py-3">$4.99</td>
                  <td className="px-4 py-3">5&ndash;7 business days after dispatch</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">USPS Priority Mail</td>
                  <td className="px-4 py-3">$9.99</td>
                  <td className="px-4 py-3">2&ndash;3 business days after dispatch</td>
                </tr>
                <tr className="bg-red-50">
                  <td className="px-4 py-3 font-medium text-red-700">Free Shipping</td>
                  <td className="px-4 py-3 font-medium text-red-700">FREE</td>
                  <td className="px-4 py-3 text-red-700">
                    On orders over $75 — shipped via USPS Priority Mail
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500">
            Delivery estimates begin after the order is dispatched, not after payment. Add 1&ndash;2
            business days for processing.
          </p>
        </section>

        {/* 4. Packaging */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">4. Packaging</h2>
          <p>
            We take packaging seriously to ensure cards arrive in the same condition they left us:
          </p>
          <ul className="list-disc space-y-1.5 pl-6">
            <li>Individual cards are placed in a penny sleeve and a rigid top loader</li>
            <li>Multiple cards are packed securely in team bags or a protective case</li>
            <li>
              Orders are shipped in padded bubble mailers or boxes depending on size and value
            </li>
          </ul>
        </section>

        {/* 5. Tracking */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">5. Tracking</h2>
          <p>
            A tracking number is emailed to you as soon as your order ships. You can also find it in
            your{" "}
            <a href="/account/orders" className="text-red-600 underline">
              order history
            </a>{" "}
            if you have an account. Track your package directly on the{" "}
            <a
              href="https://www.usps.com/"
              className="text-red-600 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              USPS website
            </a>
            .
          </p>
        </section>

        {/* 6. Delivery Estimates */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">6. Delivery Estimates</h2>
          <p>
            Delivery estimates are provided by USPS and are not guaranteed. Delays may occur during
            peak mailing periods (holidays), adverse weather, or other circumstances outside our
            control. We are not responsible for delays caused by USPS after the package has been
            handed off.
          </p>
        </section>

        {/* 7. Lost/Undelivered */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">7. Lost or Undelivered Packages</h2>
          <p>
            If your tracking shows &ldquo;Delivered&rdquo; but you have not received your package:
          </p>
          <ol className="list-decimal space-y-1.5 pl-6">
            <li>Check with neighbors and any safe drop locations at your address</li>
            <li>Contact your local post office with your tracking number</li>
            <li>
              If the package is still not located, email us at{" "}
              <a href="mailto:orders@casa-cards.com" className="text-red-600 underline">
                orders@casa-cards.com
              </a>{" "}
              — we will assist you in filing a missing mail claim with USPS
            </li>
          </ol>
          <p>
            For packages lost in transit (tracking never updated after label creation), contact us
            and we will open a USPS inquiry. We are not liable for losses once the package has been
            accepted by USPS, but we will do our best to assist with the resolution process.
          </p>
        </section>

        {/* 8. Address Accuracy */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">8. Address Accuracy</h2>
          <p>
            You are responsible for providing a complete and accurate shipping address at checkout.
            We ship to the address provided and are not liable for orders delivered to an incorrect
            address entered by the buyer. If you notice an error in your shipping address after
            placing an order, contact us immediately at{" "}
            <a href="mailto:orders@casa-cards.com" className="text-red-600 underline">
              orders@casa-cards.com
            </a>{" "}
            — if your order has not yet shipped, we will do our best to correct it.
          </p>
        </section>

        {/* 9. Contact */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">9. Contact Us</h2>
          <p>
            Shipping questions? We&rsquo;re happy to help:{" "}
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
