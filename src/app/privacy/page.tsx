import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Casa Cards & Collectibles",
  description:
    "Learn how Casa Cards & Collectibles collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">Privacy Policy</h1>
      <p className="mb-12 text-sm text-gray-500">Last updated: March 23, 2026</p>

      <div className="space-y-10 text-gray-700">
        {/* 1. Introduction */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">1. Introduction</h2>
          <p>
            Casa Cards &amp; Collectibles (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;)
            operates the website at casa-cards.com (the &ldquo;Site&rdquo;). This Privacy Policy
            explains what personal information we collect, how we use it, and your rights regarding
            that information.
          </p>
          <p>
            By using the Site or placing an order, you agree to the collection and use of
            information in accordance with this policy.
          </p>
        </section>

        {/* 2. Information We Collect */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">2. Information We Collect</h2>
          <p>We collect information you provide directly to us, including:</p>
          <ul className="list-disc space-y-1.5 pl-6">
            <li>
              <strong>Account information</strong> — name, email address, and password (stored as a
              one-way bcrypt hash; we never store your plaintext password)
            </li>
            <li>
              <strong>Order information</strong> — shipping address, billing address, and order
              history
            </li>
            <li>
              <strong>Payment information</strong> — payment is processed entirely by PayPal. We
              never see, receive, or store your card number, CVV, or full payment details.
            </li>
            <li>
              <strong>Communications</strong> — messages you send us through the contact form
            </li>
            <li>
              <strong>Marketing preferences</strong> — whether you have subscribed to our newsletter
              (opt-in only)
            </li>
          </ul>
          <p>We also collect certain information automatically when you visit the Site:</p>
          <ul className="list-disc space-y-1.5 pl-6">
            <li>IP address and approximate location (city/region level)</li>
            <li>Browser type and version</li>
            <li>
              Pages visited, referring URL, and time spent on pages (via Google Analytics, with your
              consent)
            </li>
            <li>Session cookies necessary for login and cart functionality</li>
          </ul>
        </section>

        {/* 3. How We Use Your Information */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">3. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul className="list-disc space-y-1.5 pl-6">
            <li>
              Process and fulfill your orders, including sending order confirmation and shipping
              notification emails
            </li>
            <li>Manage your account and authenticate your identity</li>
            <li>Respond to your messages and customer service requests</li>
            <li>
              Send transactional emails (order confirmations, shipping updates, password resets)
            </li>
            <li>
              Send marketing emails, but only if you have opted in — you can unsubscribe at any time
            </li>
            <li>Prevent fraud and abuse</li>
            <li>Improve the Site using aggregated, anonymized analytics data</li>
            <li>Comply with legal obligations</li>
          </ul>
          <p>
            We do not sell, rent, or share your personal information with third parties for their
            own marketing purposes.
          </p>
        </section>

        {/* 4. Third-Party Services */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">4. Third-Party Services</h2>
          <p>
            We use the following third-party services to operate the Site. Each has its own privacy
            policy governing how they handle data:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>PayPal</strong> — payment processing. PayPal securely handles all payment data
              and is PCI-DSS compliant.{" "}
              <a
                href="https://www.paypal.com/us/legalhub/privacy-full"
                className="text-red-600 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                paypal.com/privacy
              </a>
            </li>
            <li>
              <strong>Resend</strong> — transactional and marketing email delivery.{" "}
              <a
                href="https://resend.com/privacy"
                className="text-red-600 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                resend.com/privacy
              </a>
            </li>
            <li>
              <strong>Supabase</strong> — database hosting. Your order and account data is stored in
              a Supabase-managed PostgreSQL database.{" "}
              <a
                href="https://supabase.com/privacy"
                className="text-red-600 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                supabase.com/privacy
              </a>
            </li>
            <li>
              <strong>Vercel</strong> — website hosting and CDN. Vercel processes server request
              logs that may include your IP address.{" "}
              <a
                href="https://vercel.com/legal/privacy-policy"
                className="text-red-600 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                vercel.com/legal/privacy-policy
              </a>
            </li>
            <li>
              <strong>eBay API</strong> — we sync our product listings from eBay using their API. No
              personal customer data is shared with eBay through this integration.{" "}
              <a
                href="https://www.ebay.com/help/policies/member-behaviour-policies/user-privacy-notice-privacy-policy"
                className="text-red-600 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                eBay Privacy Policy
              </a>
            </li>
            <li>
              <strong>Google Analytics 4</strong> — site analytics (page views, session data). This
              script only loads if you have accepted analytics cookies via our consent banner.{" "}
              <a
                href="https://policies.google.com/privacy"
                className="text-red-600 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                policies.google.com/privacy
              </a>
            </li>
            <li>
              <strong>Cloudflare Turnstile</strong> — bot and spam protection on login and contact
              forms.{" "}
              <a
                href="https://www.cloudflare.com/privacypolicy/"
                className="text-red-600 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                cloudflare.com/privacypolicy
              </a>
            </li>
          </ul>
        </section>

        {/* 5. Cookies */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">5. Cookies</h2>
          <p>We use two categories of cookies:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Strictly Necessary</strong> — session and authentication cookies required for
              the Site to function (login sessions, cart state). These are always active and cannot
              be disabled.
            </li>
            <li>
              <strong>Analytics</strong> — Google Analytics 4 cookies that help us understand how
              visitors use the Site. These are only set after you accept analytics cookies via our
              cookie consent banner. You can withdraw consent at any time by clearing your browser
              cookies.
            </li>
          </ul>
          <p>
            You can control cookies through your browser settings or our consent banner. Disabling
            strictly necessary cookies will prevent you from logging in or using the cart.
          </p>
        </section>

        {/* 6. Data Retention */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">6. Data Retention</h2>
          <ul className="list-disc space-y-1.5 pl-6">
            <li>
              <strong>Order records</strong> are retained for 7 years to satisfy tax and accounting
              obligations, even if you delete your account.
            </li>
            <li>
              <strong>Account data</strong> (name, email, addresses) is retained until you request
              deletion. You can delete your account from your{" "}
              <a href="/account/profile" className="text-red-600 underline">
                account profile page
              </a>
              .
            </li>
            <li>
              <strong>Marketing email subscriptions</strong> are retained until you unsubscribe.
            </li>
          </ul>
        </section>

        {/* 7. GDPR Rights */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">7. Your Rights (GDPR)</h2>
          <p>
            If you are located in the European Economic Area, you have the following rights
            regarding your personal data:
          </p>
          <ul className="list-disc space-y-1.5 pl-6">
            <li>
              <strong>Access</strong> — request a copy of the data we hold about you
            </li>
            <li>
              <strong>Rectification</strong> — correct inaccurate data
            </li>
            <li>
              <strong>Erasure</strong> — request deletion of your personal data
            </li>
            <li>
              <strong>Portability</strong> — export your data in a machine-readable format
              (available from your account profile)
            </li>
            <li>
              <strong>Restriction</strong> — request that we limit how we process your data
            </li>
            <li>
              <strong>Objection</strong> — object to processing based on legitimate interests
            </li>
          </ul>
          <p>
            To exercise any of these rights, email us at{" "}
            <a href="mailto:orders@casa-cards.com" className="text-red-600 underline">
              orders@casa-cards.com
            </a>
            . We will respond within 30 days.
          </p>
        </section>

        {/* 8. CCPA Rights */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">
            8. Your Rights (CCPA — California Residents)
          </h2>
          <p>If you are a California resident, you have the right to:</p>
          <ul className="list-disc space-y-1.5 pl-6">
            <li>
              <strong>Know</strong> what personal information we collect and how it is used
            </li>
            <li>
              <strong>Delete</strong> your personal information
            </li>
            <li>
              <strong>Opt out of the sale of personal information</strong> — we do not sell your
              personal information to any third party
            </li>
            <li>
              <strong>Non-discrimination</strong> — we will not discriminate against you for
              exercising these rights
            </li>
          </ul>
          <p>
            To submit a CCPA request, email{" "}
            <a href="mailto:orders@casa-cards.com" className="text-red-600 underline">
              orders@casa-cards.com
            </a>
            .
          </p>
        </section>

        {/* 9. Data Security */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">9. Data Security</h2>
          <p>
            We take security seriously and implement appropriate technical and organizational
            measures, including:
          </p>
          <ul className="list-disc space-y-1.5 pl-6">
            <li>HTTPS encryption for all data in transit</li>
            <li>Passwords stored as bcrypt hashes (never in plaintext)</li>
            <li>Payment data handled exclusively by PayPal (PCI-DSS compliant)</li>
            <li>Database access restricted to server-side code only</li>
            <li>Rate limiting on authentication and sensitive API endpoints</li>
          </ul>
          <p>
            No method of transmission over the internet is 100% secure. While we strive to protect
            your information, we cannot guarantee absolute security.
          </p>
        </section>

        {/* 10. Children */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">10. Children&rsquo;s Privacy</h2>
          <p>
            The Site is not directed to children under the age of 13. We do not knowingly collect
            personal information from children under 13. If you believe we have inadvertently
            collected such information, please contact us and we will delete it promptly.
          </p>
        </section>

        {/* 11. Changes */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">11. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. When we do, we will update the
            &ldquo;Last updated&rdquo; date at the top of this page. Continued use of the Site after
            changes are posted constitutes your acceptance of the updated policy.
          </p>
        </section>

        {/* 12. Contact */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">12. Contact Us</h2>
          <p>
            For privacy-related questions, requests, or concerns, please contact us at:{" "}
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
