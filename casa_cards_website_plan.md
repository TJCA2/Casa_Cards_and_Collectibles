# Casa Cards & Collectibles — Website Build Plan

**For Claude Code | eBay Seller: `casa_cards_and_collectibles`**
**Security Priority: MAXIMUM at every phase**

---

## Overview

Build a secure, full-featured e-commerce website for an eBay seller specializing in cards and collectibles. The site must sync inventory from eBay in real time and eventually replace or complement the seller's eBay storefront. Take each phase slow and steady — complete and verify one phase before starting the next.

**Tech Stack Recommendation:**

- **Frontend:** Next.js 14+ (App Router) — server-side rendering for SEO, fast loads
- **Backend/API:** Next.js API Routes + Node.js
- **Database:** PostgreSQL (via Supabase or Railway) — reliable, scalable
- **Auth:** NextAuth.js with secure session handling
- **Payments:** Stripe (primary) + PayPal SDK
- **Hosting:** Vercel (frontend) + Supabase (DB/storage)
- **eBay Sync:** eBay REST API (Trading API / Inventory API)
- **Email:** Resend or SendGrid (transactional)
- **Image Storage:** Cloudinary or Supabase Storage

---

## 🔒 SECURITY MANDATE (Read Before Every Phase)

> **Security is the #1 priority on this project. The following rules apply to every single task, without exception.**

- **NEVER** store secrets, API keys, or credentials in source code or version control. Use `.env.local` and server-side environment variables only.
- **ALWAYS** validate and sanitize every user input on the server — never trust client-side data.
- **ALWAYS** use parameterized queries or an ORM (Prisma) — never raw SQL string concatenation.
- **ALWAYS** enforce HTTPS everywhere. Redirect all HTTP to HTTPS.
- **ALWAYS** set security headers: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Referrer-Policy`.
- **ALWAYS** implement rate limiting on all API routes (especially auth, checkout, contact).
- **ALWAYS** use CSRF protection on all forms and state-changing API calls.
- **NEVER** expose internal error details to the client — log server-side only.
- **ALWAYS** hash passwords with bcrypt (cost factor ≥ 12) — never store plaintext.
- **ALWAYS** use short-lived JWTs or secure httpOnly cookies for sessions.
- **ALWAYS** enforce row-level security (RLS) on the database.
- **ALWAYS** keep all dependencies up to date and audit with `npm audit` regularly.
- **NEVER** log sensitive data (passwords, tokens, card numbers, PII) in any log.
- **ALWAYS** implement input length limits to prevent denial-of-service via large payloads.
- **GDPR/CCPA compliance is required** — implement cookie consent and data deletion requests.

---

## Phase 1 — Project Foundation & Security Baseline

_Goal: Scaffold the project with security baked in from day one. No shortcuts._

### Task 1.1 — Repository & Environment Setup

- [x] Initialize Next.js 14 project with TypeScript (`npx create-next-app@latest --typescript`)
- [x] Set up `.gitignore` to exclude `.env*`, `node_modules`, build artifacts
- [x] Create `.env.local.example` with placeholder keys (never real values) and commit it
- [x] Configure ESLint + Prettier with strict rules
- [x] Enable TypeScript strict mode in `tsconfig.json`
- [x] Set up Husky pre-commit hooks to block secrets from being committed (use `detect-secrets` or `gitleaks`)

### Task 1.2 — Security Headers & HTTPS

- [x] Install and configure `next-secure-headers` or manually set headers in `next.config.js`
- [x] Add the following headers to all routes:
  - [x] `Content-Security-Policy` (restrictive — only allow needed sources)
  - [x] `Strict-Transport-Security` (max-age=31536000; includeSubDomains)
  - [x] `X-Content-Type-Options: nosniff`
  - [x] `X-Frame-Options: DENY`
  - [x] `Referrer-Policy: strict-origin-when-cross-origin`
  - [x] `Permissions-Policy` (disable camera, microphone, geolocation unless needed)
- [x] Confirm all HTTP requests redirect to HTTPS

### Task 1.3 — Database Setup (PostgreSQL via Supabase)

- [x] Create Supabase project and PostgreSQL database
- [x] Install Prisma ORM: `npm install prisma @prisma/client`
- [x] Initialize Prisma: `npx prisma init`
- [x] Enable Row Level Security (RLS) on all Supabase tables
- [x] Store database connection string in `.env.local` only — never hardcode
- [x] Create initial Prisma schema (see Phase 2 for full schema)
- [x] Run `npx prisma db push` to apply schema

### Task 1.4 — Rate Limiting Middleware

- [x] Install `upstash/ratelimit` or `express-rate-limit` equivalent for Next.js API routes
- [x] Apply rate limiting to: `/api/auth/*`, `/api/checkout/*`, `/api/contact`, `/api/ebay-sync`
- [x] Default limits: 10 requests/minute for auth; 30/minute for general APIs
- [x] Return `429 Too Many Requests` with `Retry-After` header on limit breach

### Task 1.5 — Input Validation Library

- [x] Install Zod: `npm install zod`
- [x] Create shared validation schemas for: user registration, login, product search, order creation, contact form
- [x] All API route handlers must validate request body/params with Zod before processing

### Phase 1 Verification

- [x] Run `npm audit` — zero high/critical vulnerabilities
- [x] Verify security headers using [securityheaders.com](https://securityheaders.com) (after deployment)
- [x] Confirm `.env.local` is NOT committed to git
- [ ] Test rate limiting: exceed limit and confirm 429 response — deferred to Task 3.1 (no API routes yet)
- [x] Verify TypeScript strict mode catches type errors

---

## Phase 2 — Database Schema & Core Models

_Goal: Design a solid, normalized database schema for the entire site._

### Task 2.1 — Prisma Schema: Users & Auth

```
User
  - id (uuid, PK)
  - email (unique, indexed)
  - passwordHash (string, nullable for OAuth users)
  - role (enum: CUSTOMER, ADMIN)
  - emailVerified (boolean)
  - createdAt, updatedAt

Session
  - id, userId (FK), expiresAt, token (hashed)

PasswordResetToken
  - id, userId (FK), tokenHash, expiresAt, used (boolean)
```

### Task 2.2 — Prisma Schema: Products & Inventory

```
Product
  - id (uuid, PK)
  - ebayItemId (string, unique, nullable) — links to eBay listing
  - title, description (text)
  - price (Decimal), compareAtPrice (Decimal, nullable)
  - condition (enum: NEW, USED, REFURBISHED, LIKE_NEW)
  - sku, barcode
  - stockQuantity (int)
  - lowStockThreshold (int, default: 5)
  - isActive (boolean)
  - categoryId (FK)
  - createdAt, updatedAt, lastSyncedAt

ProductImage
  - id, productId (FK), url, altText, sortOrder

ProductVariant
  - id, productId (FK), name, value (e.g., "Condition: Near Mint"), price (override), stock

Category
  - id, name, slug (unique), parentId (self-referential FK), description
```

### Task 2.3 — Prisma Schema: Orders & Cart

```
Cart
  - id, userId (FK, nullable for guests), sessionId (for guests), createdAt

CartItem
  - id, cartId (FK), productId (FK), quantity, priceAtAdd

Order
  - id (uuid), orderNumber (unique, human-readable), userId (FK, nullable)
  - status (enum: PENDING, PAID, PROCESSING, SHIPPED, DELIVERED, CANCELLED, REFUNDED)
  - subtotal, shippingCost, taxAmount, totalAmount (all Decimal)
  - paymentProvider (enum: STRIPE, PAYPAL)
  - paymentIntentId (string, unique) — Stripe/PayPal reference
  - shippingAddressId (FK), billingAddressId (FK)
  - trackingNumber, shippedAt, deliveredAt
  - notes, createdAt, updatedAt

OrderItem
  - id, orderId (FK), productId (FK), quantity, unitPrice, totalPrice

Address
  - id, userId (FK, nullable), line1, line2, city, state, zip, country, isDefault
```

### Task 2.4 — Prisma Schema: Reviews, Discounts, Email

```
Review
  - id, productId (FK), userId (FK), rating (1-5), title, body, isVerified, createdAt

DiscountCode
  - id, code (unique), type (PERCENTAGE | FIXED), value, minOrderAmount
  - maxUses, usedCount, expiresAt, isActive

EmailSubscriber
  - id, email (unique), subscribedAt, isActive

AbandonedCart
  - id, cartId (FK), email, reminderSentAt
```

### Task 2.5 — Prisma Schema: eBay Sync Log

```
EbaySyncLog
  - id, startedAt, completedAt, status (SUCCESS | PARTIAL | FAILED)
  - itemsProcessed, itemsCreated, itemsUpdated, itemsDeactivated
  - errorLog (text, nullable)
```

### Phase 2 Verification

- [x] Run `npx prisma validate` — no schema errors
- [x] Run `npx prisma db push` successfully
- [ ] Confirm RLS policies are applied in Supabase dashboard
- [ ] Seed database with 5 sample products and verify queries

---

## Phase 3 — Authentication System

_Goal: Secure user registration, login, sessions, and password management._

### Task 3.1 — NextAuth.js Setup

- [x] Install NextAuth.js: `npm install next-auth`
- [x] Configure providers: Email/Password (Credentials), Google OAuth (optional), GitHub OAuth (optional)
- [x] Use httpOnly, Secure, SameSite=Strict cookies for session tokens
- [x] Set session maxAge to 7 days; rotate tokens on each request
- [x] Configure NextAuth secret via `NEXTAUTH_SECRET` env variable (strong random string)

### Task 3.2 — Registration & Email Verification

- [ ] Registration form with Zod validation (email format, password strength: min 8 chars, upper + lower + number + special)
- [ ] Hash password with bcrypt (cost factor 12) before storing
- [ ] Send verification email with expiring token (24-hour expiry)
- [ ] Block login until email is verified
- [ ] Prevent user enumeration: return the same message whether email exists or not

### Task 3.3 — Login & Brute Force Protection

- [ ] Track failed login attempts per email + IP
- [ ] Lock account for 15 minutes after 5 failed attempts
- [ ] Implement CAPTCHA (hCaptcha or Cloudflare Turnstile) on login after 3 failures
- [ ] Log all login attempts (success/failure) with timestamp and IP — do NOT log passwords

### Task 3.4 — Password Reset

- [ ] "Forgot Password" flow: generate a secure random token, hash it, store in DB with 1-hour expiry
- [ ] Email one-time reset link (token in URL, not the hash)
- [ ] On reset: verify token hash, check expiry, mark token as used, require new password
- [ ] Invalidate all existing sessions after password change

### Task 3.5 — Admin Role Protection

- [ ] Create middleware to protect `/admin/*` routes — only ADMIN role users allowed
- [ ] Redirect unauthorized users to 403 page (never expose admin routes to guests)
- [ ] Admin accounts require email verification AND a separate admin invite flow

### Phase 3 Verification

- [ ] Test registration → verify email → login flow end-to-end
- [ ] Confirm passwords are hashed (never readable in DB)
- [ ] Test brute force: 5 failed logins trigger lockout
- [ ] Test password reset: expired token is rejected
- [ ] Confirm admin routes return 403 for non-admin users

---

## Phase 4 — eBay Inventory Sync

_Goal: Reliably pull listings from eBay and keep the website inventory in sync._

### Task 4.1 — eBay API Credentials Setup

- [ ] Register as an eBay developer at [developer.ebay.com](https://developer.ebay.com)
- [ ] Create a production application and obtain: `CLIENT_ID`, `CLIENT_SECRET`
- [ ] Store all eBay credentials in `.env.local` — never in code
- [ ] Implement OAuth 2.0 Client Credentials flow to get eBay API access tokens
- [ ] Store access tokens in memory or encrypted DB field — refresh before expiry

### Task 4.2 — eBay Inventory Fetch Service

- [ ] Create `lib/ebay/client.ts` — centralized eBay API client with automatic token refresh
- [ ] Use eBay **Inventory API** (`/sell/inventory/v1/inventory_item`) to fetch all items for `casa_cards_and_collectibles`
- [ ] Alternatively use **Browse API** (`/buy/browse/v1/item_summary/search?seller=casa_cards_and_collectibles`) for public listings
- [ ] Paginate through all results (handle eBay's 200-item page limits)
- [ ] Map eBay fields to Prisma `Product` schema:
  - `itemId` → `ebayItemId`
  - `title` → `title`
  - `description` → `description`
  - `price.value` → `price`
  - `condition` → `condition` (normalize to enum)
  - `quantity` → `stockQuantity`
  - `images` → `ProductImage` records
  - `categoryId` → map to local `Category`

### Task 4.3 — Sync Logic (Upsert Strategy)

- [ ] Create `lib/ebay/sync.ts` with the following logic per eBay listing:
  1. Look up product by `ebayItemId`
  2. If not found → create new `Product` (status: active)
  3. If found → update fields that eBay manages (price, stock, title, images)
  4. If listing ended/removed on eBay → set `isActive = false` (never hard-delete)
- [ ] Create a `EbaySyncLog` entry at start; update on completion with counts and errors
- [ ] Wrap sync in a database transaction — partial syncs roll back cleanly

### Task 4.4 — Scheduled Auto-Sync

- [ ] Create a Next.js API route: `POST /api/ebay/sync` — protected with a secret header (`X-Sync-Secret`)
- [ ] Set up a cron job (Vercel Cron Jobs or GitHub Actions scheduled workflow) to call this endpoint every 6 hours
- [ ] The `X-Sync-Secret` must be a strong random value stored in environment variables
- [ ] The sync route verifies the secret header before proceeding — reject all other requests with 401

### Task 4.5 — Manual Sync UI (Admin)

- [ ] Admin dashboard page: "eBay Sync" section showing last sync time, items synced, errors
- [ ] "Sync Now" button that triggers the sync endpoint on demand
- [ ] Display sync log history (last 10 syncs with status and counts)

### Phase 4 Verification

- [ ] Run a full sync and verify products appear in the database
- [ ] Modify a product price on eBay, re-run sync, verify price updates
- [ ] Test with an ended eBay listing — confirm product is deactivated (not deleted)
- [ ] Confirm sync route returns 401 without the correct secret header
- [ ] Verify sync logs are saved correctly

---

## Phase 5 — Core Frontend: Product Catalog & Search

_Goal: Build the public-facing storefront — product grid, individual product pages, search, and filtering._

### Task 5.1 — Homepage

- [ ] Hero section: seller name ("Casa Cards & Collectibles"), tagline, call-to-action ("Shop Now")
- [ ] Featured categories (cards, sports cards, collectibles, etc.) with images
- [ ] Featured/newest products grid (6–12 items)
- [ ] Trust badges row: SSL Secured, Secure Checkout, Free Returns (if applicable)
- [ ] Newsletter signup bar

### Task 5.2 — Product Listing Page (`/shop`)

- [ ] Grid view of all active products (server-side rendered for SEO)
- [ ] Filters sidebar:
  - Category (multi-select)
  - Price range (min/max slider)
  - Condition (New / Used / Like New / Refurbished)
  - In Stock only toggle
- [ ] Sort options: Newest, Price Low–High, Price High–Low, Most Popular
- [ ] Pagination (12 or 24 items per page) — use URL query params for shareable filtered URLs
- [ ] Skeleton loading state for product cards

### Task 5.3 — Product Detail Page (`/product/[slug]`)

- [ ] Image gallery with zoom (multiple images from eBay)
- [ ] Product title, condition badge, price, stock status ("Only 2 left!")
- [ ] Full description (render HTML from eBay safely — sanitize with DOMPurify)
- [ ] "Add to Cart" and "Add to Wishlist" buttons
- [ ] Shipping estimate calculator (enter zip code)
- [ ] Structured data: `Product` schema markup (JSON-LD) for Google Shopping
- [ ] Reviews section (display + write a review for verified purchasers)
- [ ] Related products (same category)
- [ ] Breadcrumb navigation

### Task 5.4 — Search

- [ ] Search bar in header (keyboard shortcut: `/` to focus)
- [ ] Full-text search using PostgreSQL `tsvector` (Prisma full-text search) or Algolia
- [ ] Search results page with the same filter/sort options as `/shop`
- [ ] Empty state with suggestions when no results found
- [ ] Search input: sanitize and limit to 200 characters

### Task 5.5 — Category Pages (`/category/[slug]`)

- [ ] Same layout as `/shop` but pre-filtered by category
- [ ] Category header with name and description
- [ ] Breadcrumb: Home > Category

### Phase 5 Verification

- [ ] Load `/shop` with 50+ products — confirm page renders in under 2 seconds
- [ ] Test all filter combinations — verify correct results
- [ ] Test search for a known product title
- [ ] Confirm product JSON-LD schema is valid at [schema.org/docs/gs.html](https://schema.org/docs/gs.html)
- [ ] Test on mobile (375px viewport) — all elements usable

---

## Phase 6 — Shopping Cart & Checkout

_Goal: Secure, frictionless checkout with Stripe and PayPal. No payment data ever touches our server._

### Task 6.1 — Shopping Cart (Client + Server)

- [ ] Cart state managed in React Context + `localStorage` for guests
- [ ] Cart syncs to DB `Cart` table for logged-in users (merge on login)
- [ ] Cart drawer/slide-over with item list, quantities, subtotal
- [ ] Quantity increase/decrease — enforce stock limits server-side
- [ ] Remove item, clear cart buttons
- [ ] "Proceed to Checkout" button

### Task 6.2 — Checkout Flow (Multi-Step)

**Step 1 — Contact & Shipping:**

- [ ] Email field (for order confirmation), guest or account login prompt
- [ ] Shipping address form with address validation (use USPS API or Google Address Validation)
- [ ] Save address to account (for logged-in users)

**Step 2 — Shipping Method:**

- [ ] Real-time shipping rate calculation via EasyPost or ShipEngine API
- [ ] Display options: USPS First Class, Priority, UPS Ground, FedEx Ground (with prices and ETAs)
- [ ] Free shipping threshold (configurable in admin)

**Step 3 — Payment:**

- [ ] Stripe Payment Element (handles card, Apple Pay, Google Pay, Link, BNPL)
- [ ] PayPal Smart Payment Button
- [ ] Display order summary with line items, shipping, tax, total
- [ ] Discount code input field (validate server-side)
- [ ] Sales tax auto-calculation by state (use TaxJar or Stripe Tax)

**Step 4 — Confirmation:**

- [ ] "Thank you" page with order number
- [ ] Order confirmation email sent immediately (Resend/SendGrid)
- [ ] Inventory decremented atomically in DB transaction

### Task 6.3 — Stripe Integration (CRITICAL SECURITY)

- [ ] Install Stripe SDK: `npm install stripe @stripe/stripe-js @stripe/react-stripe-js`
- [ ] Create `PaymentIntent` server-side only — never client-side
- [ ] Use Stripe Webhook (`/api/webhooks/stripe`) to confirm payment — never rely on client redirect
- [ ] Verify Stripe webhook signature using `stripe.webhooks.constructEvent` with `STRIPE_WEBHOOK_SECRET`
- [ ] Only fulfill orders (decrement stock, send confirmation email) inside the verified webhook handler
- [ ] Store `paymentIntentId` on `Order` — use as idempotency key to prevent double-fulfillment

### Task 6.4 — PayPal Integration

- [ ] Use PayPal JS SDK with `createOrder` and `onApprove` server-side API calls
- [ ] Verify payment server-side via PayPal `orders/{orderId}/capture` before fulfilling
- [ ] Same webhook/confirmation model as Stripe

### Task 6.5 — Guest Checkout

- [ ] Guest can checkout with email only — no account required
- [ ] After order, prompt guest to create an account to track their order
- [ ] Guest order lookup by email + order number at `/orders/lookup`

### Phase 6 Verification

- [ ] Complete a full checkout with Stripe test card (`4242 4242 4242 4242`)
- [ ] Complete a full checkout with PayPal sandbox
- [ ] Confirm stock decrements correctly after purchase
- [ ] Confirm order confirmation email is received
- [ ] Test webhook: simulate payment_intent.succeeded — confirm order is fulfilled
- [ ] Attempt to modify price client-side (DevTools) — verify server rejects tampered amount
- [ ] Test checkout with an out-of-stock product — must be blocked

---

## Phase 7 — Customer Accounts & Order Management

_Goal: Customer self-service portal for order history, tracking, and profile management._

### Task 7.1 — Account Dashboard

- [ ] Route: `/account` — requires authentication
- [ ] Sections: Overview, Orders, Addresses, Profile, Wishlist
- [ ] Display: recent orders (last 5), total spent, loyalty points (if enabled)

### Task 7.2 — Order History & Tracking

- [ ] List all orders with: order number, date, status badge, total
- [ ] Order detail page: line items, shipping address, payment method, tracking number
- [ ] Clickable tracking number → opens carrier tracking page (USPS/UPS/FedEx)
- [ ] Order status timeline (Placed → Paid → Processing → Shipped → Delivered)

### Task 7.3 — Address Book

- [ ] Save multiple shipping addresses
- [ ] Set default address (used at checkout)
- [ ] Edit and delete addresses
- [ ] Address validation on save

### Task 7.4 — Profile Management

- [ ] Update display name, email (requires re-verification), phone
- [ ] Change password (requires current password)
- [ ] Delete account — GDPR/CCPA compliant data erasure
- [ ] Download personal data (GDPR right to portability)

### Task 7.5 — Wishlist

- [ ] Add/remove products from wishlist (persistent for logged-in users)
- [ ] Wishlist page with "Move to Cart" and "Remove" actions
- [ ] Stock availability shown on wishlist items

### Phase 7 Verification

- [ ] Log in, view order history — all orders present
- [ ] Click tracking number — opens correct carrier tracking page
- [ ] Update email → verify re-verification email sent
- [ ] Test account deletion — confirm all PII is removed from DB

---

## Phase 8 — Admin Dashboard

_Goal: A secure, internal-only dashboard for managing the store._

### Task 8.1 — Admin Layout & Access Control

- [ ] Route: `/admin` — hard-blocked to ADMIN role only (middleware + server-side check)
- [ ] Sidebar navigation: Dashboard, Products, Orders, Customers, eBay Sync, Discounts, Settings
- [ ] Activity log: all admin actions recorded (who did what, when)

### Task 8.2 — Product Management

- [ ] Product list table with: image, title, price, stock, condition, status, last eBay sync
- [ ] Edit product (override eBay-synced fields for website-only customization)
- [ ] Toggle product active/inactive
- [ ] Low stock alerts: highlight products below `lowStockThreshold`
- [ ] Bulk actions: activate, deactivate, delete
- [ ] Manual product creation (for non-eBay items)

### Task 8.3 — Order Management

- [ ] Order list with filters: status, date range, payment provider
- [ ] Order detail view: customer info, items, payment status, shipping info
- [ ] Update order status: Processing → Shipped → Delivered
- [ ] Add/update tracking number (sends auto-notification email to customer)
- [ ] Issue refund (via Stripe/PayPal API — partial or full)
- [ ] Add notes to order

### Task 8.4 — Customer Management

- [ ] Customer list: name, email, orders count, total spent, registered date
- [ ] Customer detail: order history, addresses, account status
- [ ] Manually verify or ban accounts
- [ ] Export customer list (CSV) — for email marketing (respect consent)

### Task 8.5 — Discount Code Management

- [ ] Create discount codes: percentage off, fixed dollar off
- [ ] Set: min order amount, expiry date, max uses
- [ ] Activate/deactivate codes
- [ ] Usage report per code

### Task 8.6 — Analytics Dashboard

- [ ] Revenue chart: daily/weekly/monthly
- [ ] Top 10 best-selling products
- [ ] Orders by status
- [ ] New vs. returning customers
- [ ] Embed Google Analytics 4 tracking (GA4 Measurement ID via env variable)
- [ ] Conversion rate tracking: sessions → add-to-cart → checkout → purchase

### Phase 8 Verification

- [ ] Log in as non-admin user — confirm `/admin` returns 403
- [ ] Create a discount code → apply at checkout → verify discount applied correctly
- [ ] Process a refund → confirm Stripe balance updated
- [ ] Add tracking number to order → confirm customer notification email sent

---

## Phase 9 — Email System & Marketing

_Goal: Automated transactional emails and opt-in marketing._

### Task 9.1 — Transactional Emails (ALL REQUIRED)

- [ ] Order Confirmation — sent immediately after successful payment
- [ ] Shipping Notification — sent when tracking number is added
- [ ] Delivery Confirmation — optional, if carrier webhooks are available
- [ ] Password Reset — one-time link (60-minute expiry)
- [ ] Email Verification — on registration
- [ ] Review Request — 7 days after delivery
- [ ] Abandoned Cart Recovery — 1 hour after cart abandonment (opt-in only)

### Task 9.2 — Email Design

- [ ] Create branded HTML email templates (logo, colors matching site)
- [ ] Test on Gmail, Outlook, Apple Mail (use Litmus or Email on Acid)
- [ ] All emails include: unsubscribe link, physical mailing address (CAN-SPAM compliance)
- [ ] Plain-text fallback for all emails

### Task 9.3 — Newsletter & Marketing Emails

- [ ] Newsletter signup form in footer and as an optional pop-up (10-second delay, dismissible)
- [ ] Double opt-in: send confirmation email before adding to list
- [ ] Unsubscribe flow: one-click unsubscribe link in every marketing email
- [ ] Integrate with email provider list (Resend Audiences or Mailchimp)

### Phase 9 Verification

- [ ] Complete test purchase — confirm order confirmation email received within 2 minutes
- [ ] Test password reset email — confirm link works and expires after 60 minutes
- [ ] Subscribe to newsletter with a new email — confirm double opt-in email received
- [ ] Unsubscribe → confirm removed from list

---

## Phase 10 — SEO, Performance & Compliance

_Goal: Maximize discoverability, ensure fast load times, and meet all legal requirements._

### Task 10.1 — SEO Foundations

- [ ] Unique `<title>` and `<meta name="description">` for every page (Next.js Metadata API)
- [ ] Clean, keyword-rich URLs: `/product/1993-upper-deck-derek-jeter-rookie` (use slugs)
- [ ] `sitemap.xml` auto-generated from all active products and categories (update on sync)
- [ ] `robots.txt` — allow all crawlers, disallow `/admin/*`, `/api/*`, `/account/*`
- [ ] Open Graph tags for social sharing (product image, title, price)
- [ ] `hreflang` if multilingual support added later
- [ ] JSON-LD structured data on every product page (Product, BreadcrumbList, Organization)
- [ ] Submit sitemap to Google Search Console and Bing Webmaster Tools

### Task 10.2 — Performance

- [ ] Image optimization: use `next/image` for all images (automatic WebP, lazy loading, blur placeholder)
- [ ] Serve eBay images through Cloudinary for resizing and format optimization
- [ ] Code splitting: each page only loads what it needs
- [ ] Target Core Web Vitals: LCP < 2.5s, CLS < 0.1, FID/INP < 200ms
- [ ] Enable Next.js Incremental Static Regeneration (ISR) for product pages (revalidate every 5 minutes)
- [ ] Use a CDN for static assets (Vercel Edge Network covers this automatically)

### Task 10.3 — Mobile-First Design

- [ ] All pages fully responsive from 320px to 2560px
- [ ] Touch-friendly tap targets (min 44×44px)
- [ ] Mobile navigation: hamburger menu with slide-out drawer
- [ ] Test checkout flow on iOS Safari and Android Chrome

### Task 10.4 — Legal Pages (REQUIRED — create before launch)

- [ ] Privacy Policy (GDPR + CCPA compliant — disclose all data collected and why)
- [ ] Terms & Conditions (covers acceptable use, liability, disputes)
- [ ] Return & Refund Policy (clearly states conditions, timeframes)
- [ ] Shipping Policy (carriers used, estimated times, international shipping if applicable)
- [ ] Cookie Policy + Cookie Consent Banner (opt-in for non-essential cookies)

### Task 10.5 — GDPR / CCPA Compliance

- [ ] Cookie consent banner (use `react-cookie-consent` or custom) — shown to all users
  - Strictly Necessary (always on)
  - Analytics (opt-in)
  - Marketing (opt-in)
- [ ] Respect user consent choices — only load analytics/marketing scripts after consent
- [ ] Data deletion request form in account settings
- [ ] Respond to deletion requests within 30 days (admin workflow)
- [ ] Data retention policy: delete inactive accounts after 3 years (configurable)

### Task 10.6 — Sales Tax

- [ ] Integrate Stripe Tax or TaxJar for automatic sales tax calculation by US state
- [ ] Display tax amount at checkout before payment
- [ ] Store tax amounts on `Order` records for reporting

### ✅ Phase 10 Verification

- [ ] Run Lighthouse audit on homepage and a product page — target 90+ score in all categories
- [ ] Check sitemap at `/sitemap.xml` — all active products and categories present
- [ ] Validate all legal pages exist and are linked in the footer
- [ ] Test cookie consent: decline analytics → confirm GA4 does NOT load
- [ ] Test on real iPhone and Android device

---

## Phase 11 — Social & Cross-Platform Integration

_Goal: Expand reach through social selling and marketplace connectors._

### Task 11.1 — Social Media Links

- [ ] Add social media icons to header/footer (Instagram, Facebook, Twitter/X, TikTok)
- [ ] Social share buttons on product pages (Pinterest is especially valuable for collectibles)

### Task 11.2 — Facebook & Instagram Shopping (Optional)

- [ ] Generate a Facebook Product Catalog XML feed at `/feeds/facebook.xml`
- [ ] Feed includes: id, title, description, price, condition, image_link, availability
- [ ] Submit to Facebook Business Manager for Facebook/Instagram Shopping approval

### Task 11.3 — Google Shopping Feed

- [ ] Generate a Google Merchant Center product feed (XML or CSV) at `/feeds/google.xml`
- [ ] Include required fields: id, title, description, link, image_link, price, availability, condition, brand, gtin/mpn
- [ ] Submit to Google Merchant Center

### Task 11.4 — eBay Cross-Promotion

- [ ] Add an "Also available on eBay" note on product pages that are still active on eBay
- [ ] Footer link back to eBay store for buyers who prefer eBay's buyer protections

### ✅ Phase 11 Verification

- [ ] Validate Google Shopping feed with Google's Rich Results Test
- [ ] Confirm social share buttons generate correct Open Graph previews (use [opengraph.xyz](https://opengraph.xyz))

---

## Phase 12 — Testing, QA & Launch Preparation

_Goal: Thorough testing before going live. No shortcuts._

### Task 12.1 — Security Audit

- [ ] Run OWASP ZAP security scan against staging environment
- [ ] Manual test for: SQL injection, XSS, CSRF, broken authentication, insecure direct object reference
- [ ] Check all API routes: confirm unauthenticated requests are rejected where required
- [ ] Review all environment variables — confirm none are in source code
- [ ] Run `npm audit` — resolve all high/critical vulnerabilities

### Task 12.2 — End-to-End Testing (Playwright)

- [ ] Install Playwright: `npm install -D @playwright/test`
- [ ] Write E2E tests for:
  - Guest browses products and adds to cart
  - Guest completes checkout with Stripe test card
  - User registers, verifies email, logs in
  - User views order history
  - Admin logs in and views orders dashboard
  - eBay sync runs and new product appears on site

### Task 12.3 — Load Testing

- [ ] Use `k6` or Artillery to simulate 100 concurrent users
- [ ] Target: homepage, `/shop`, product detail, and checkout pages hold up under load
- [ ] Confirm database connection pooling is configured correctly (Supabase/Prisma pool size)

### Task 12.4 — Cross-Browser Testing

- [ ] Chrome, Firefox, Safari, Edge (latest versions)
- [ ] iOS Safari (iPhone 12+)
- [ ] Android Chrome (Samsung Galaxy S-series)
- [ ] Verify checkout and cart work on all browsers

### Task 12.5 — Pre-Launch Checklist

- [ ] Production environment variables set (NOT the same as dev/staging)
- [ ] Stripe live mode activated (replace test keys with live keys)
- [ ] Domain name configured and DNS pointing to Vercel
- [ ] SSL certificate active (Vercel handles this automatically)
- [ ] Email sending domain verified (SPF, DKIM, DMARC records set)
- [ ] Google Analytics 4 property connected and data flowing
- [ ] Google Search Console verified
- [ ] Sitemap submitted to Google and Bing
- [ ] 404 and 500 error pages created (branded, helpful)
- [ ] Favicon and web app manifest (`/public/site.webmanifest`)
- [ ] All legal pages live and linked in footer

### ✅ Phase 12 Verification

- [ ] OWASP ZAP finds zero HIGH or CRITICAL issues
- [ ] All Playwright E2E tests pass
- [ ] Load test: site handles 100 concurrent users without errors
- [ ] Place a real test order with a small amount in production to verify end-to-end

---

## Ongoing Maintenance (Post-Launch)

_These tasks should be scheduled and never neglected._

- **Weekly:** Run `npm audit` and update dependencies with security patches
- **Weekly:** Check eBay sync logs — investigate any FAILED or PARTIAL syncs
- **Monthly:** Review Google Analytics — identify top/bottom performing products
- **Monthly:** Rotate API keys and secrets (eBay, Stripe webhook secret)
- **Monthly:** Test backup restoration — confirm DB backups are working
- **Quarterly:** Full security review — OWASP scan, penetration test if budget allows
- **Quarterly:** Review and update Privacy Policy and Terms as laws change
- **As-needed:** Respond to GDPR/CCPA data deletion requests within 30 days

---

## Environment Variables Reference

_All must be in `.env.local` and in the hosting platform's secure environment settings. Never commit._

```
# App
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=<random 64-char string>
NEXT_PUBLIC_SITE_URL=https://yourdomain.com

# Database
DATABASE_URL=<Supabase PostgreSQL connection string>

# eBay API
EBAY_CLIENT_ID=<eBay App Client ID>
EBAY_CLIENT_SECRET=<eBay App Client Secret>
EBAY_SYNC_SECRET=<strong random string for securing the sync endpoint>

# Stripe
STRIPE_SECRET_KEY=<sk_live_...>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<pk_live_...>
STRIPE_WEBHOOK_SECRET=<whsec_...>

# PayPal
PAYPAL_CLIENT_ID=<PayPal App Client ID>
PAYPAL_CLIENT_SECRET=<PayPal App Client Secret>

# Email (Resend)
RESEND_API_KEY=<re_...>
EMAIL_FROM=orders@yourdomain.com

# Image Storage (Cloudinary)
CLOUDINARY_CLOUD_NAME=<cloud_name>
CLOUDINARY_API_KEY=<api_key>
CLOUDINARY_API_SECRET=<api_secret>

# Shipping (EasyPost)
EASYPOST_API_KEY=<...>

# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Tax (Stripe Tax or TaxJar)
TAXJAR_API_KEY=<...>
```

---

_Document prepared for: Claude Code_
_Project: Casa Cards & Collectibles E-Commerce Website_
_Security Level: Maximum — verify every phase before proceeding to the next._
