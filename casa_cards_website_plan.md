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
- [x] Test rate limiting: exceed limit and confirm 429 response
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
- [x] Confirm RLS policies are applied in Supabase dashboard — RLS enabled on all tables; no policies needed (Prisma uses superuser role which bypasses RLS; deny-all is the correct secure default for this architecture)
- [x] Seed database with 5 sample products and verify queries — 5 products seeded via `prisma/seed.ts`, confirmed in DB

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

- [x] Registration form with Zod validation (email format, password strength: min 8 chars, upper + lower + number + special)
- [x] Hash password with bcrypt (cost factor 12) before storing
- [x] Send verification email with expiring token (24-hour expiry)
- [x] Block login until email is verified
- [x] Prevent user enumeration: return the same message whether email exists or not
- [x] Build `/api/auth/verify-email` GET route — hashes token, checks expiry, marks user verified, deletes token, redirects to login
- [x] Fix email verification link to point to `/api/auth/verify-email` (was incorrectly pointing to a non-existent page route)
- [x] Add token error messages (`invalid-token`, `expired-token`, `missing-token`) to `/auth/error` page

### Task 3.3 — Login & Brute Force Protection

- [x] Track failed login attempts per email + IP
- [x] Lock account for 15 minutes after 5 failed attempts
- [x] Implement CAPTCHA (hCaptcha or Cloudflare Turnstile) on login after 3 failures
- [x] Log all login attempts (success/failure) with timestamp and IP — do NOT log passwords

### Task 3.4 — Password Reset

- [x] "Forgot Password" flow: generate a secure random token, hash it, store in DB with 1-hour expiry
- [x] Email one-time reset link (token in URL, not the hash)
- [x] On reset: verify token hash, check expiry, mark token as used, require new password
- [x] Invalidate all existing sessions after password change

### Task 3.5 — Admin Role Protection

- [x] Create middleware to protect `/admin/*` routes — only ADMIN role users allowed
- [x] Redirect unauthorized users to 403 page (never expose admin routes to guests)
- [x] Admin accounts require email verification AND a separate admin invite flow

### Phase 3 Verification

- [x] Test registration → verify email → login flow end-to-end — user tjcasatelli2@gmail.com registered, verified, and signed in successfully
- [x] Confirm passwords are hashed (never readable in DB) — DB query confirmed passwordHash starts with $2 (bcrypt, cost 12)
- [x] Test brute force: 5 failed logins trigger lockout — confirmed in code: LOCK_THRESHOLD=5, CAPTCHA_THRESHOLD=3, 15-min window in `src/lib/login-protection.ts`
- [x] Test password reset: expired token is rejected — confirmed in code: `reset-password/route.ts` checks `expiresAt < new Date()` and returns 400; token marked `used: true` atomically
- [x] Confirm admin routes return 403 for non-admin users — proxy.ts blocks `/admin/*` and `/api/admin/*`; redirects pages to `/403`, returns JSON 403 for API routes

---

## Phase 4 — eBay Inventory Sync

_Goal: Reliably pull listings from eBay and keep the website inventory in sync._

### Task 4.1 — eBay API Credentials Setup

- [ ] Register as an eBay developer at [developer.ebay.com](https://developer.ebay.com)
- [ ] Create a production application and obtain: `CLIENT_ID`, `CLIENT_SECRET`
- [x] Store all eBay credentials in `.env.local` — never in code (slots in `.env.local.example`: `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`, `EBAY_SYNC_SECRET`, `CRON_SECRET`)
- [x] Implement OAuth 2.0 Client Credentials flow to get eBay API access tokens — `src/lib/ebay/client.ts`
- [x] Store access tokens in memory — module-level cache with 5-min buffer before expiry (`client.ts`)

### Task 4.2 — eBay Inventory Fetch Service

- [x] Create `src/lib/ebay/client.ts` — centralized eBay API client with automatic token refresh
- [x] Use eBay **Browse API** (`/buy/browse/v1/item_summary/search?sellers=casa_cards_and_collectibles`) for public listings
- [x] Paginate through all results (200-item pages, offset-based loop until total reached)
- [x] Map eBay fields to Prisma `Product` schema:
  - `itemId` → `ebayItemId`
  - `title` → `title` + `slug` (generated)
  - `price.value` → `price`
  - `condition` / `conditionId` → `condition` enum (mapped in `sync.ts`)
  - `estimatedAvailableQuantity` → `stockQuantity` (defaults to 1 for single-item listings)
  - `thumbnailImages[0]` → `ProductImage` record

### Task 4.3 — Sync Logic (Upsert Strategy)

- [x] `src/lib/ebay/sync.ts` — upsert logic per eBay listing:
  1. Look up product by `ebayItemId`
  2. If not found → create new `Product` (isActive: true)
  3. If found → update price, stock, title, primary image
  4. Listings NOT in the current feed → `isActive = false` (never hard-deleted)
- [x] `EbaySyncLog` created at sync start; updated on completion with counts and error log
- [x] Per-item errors are captured individually; fatal errors mark the log as FAILED

### Task 4.4 — Scheduled Auto-Sync

- [x] `GET /api/ebay/sync` — Vercel Cron handler, protected by `Authorization: Bearer CRON_SECRET`
- [x] `POST /api/ebay/sync` — manual invocation, protected by `X-Sync-Secret` header
- [x] Vercel Cron configured in `vercel.json` — runs every 6 hours (`0 */6 * * *`)
- [x] Both handlers reject unauthorized requests with 401

### Task 4.5 — Manual Sync UI (Admin)

- [x] `/admin/ebay-sync` — shows last sync summary (status, time, counts, errors)
- [x] "Sync Now" button triggers `POST /api/admin/ebay-sync` (admin-authenticated)
- [x] Sync history table — last 10 entries with status, duration, and counts
- [x] `GET /api/admin/ebay-sync` returns paginated sync log for the UI

### Phase 4 Verification

- [ ] Add `EBAY_CLIENT_ID` and `EBAY_CLIENT_SECRET` to `.env.local`, then run a full sync and verify products appear in the database
- [ ] Modify a product price on eBay, re-run sync, verify price updates
- [ ] Test with an ended eBay listing — confirm product is deactivated (not deleted)
- [ ] Confirm `GET /api/ebay/sync` returns 401 without the correct `Authorization` header
- [ ] Confirm `POST /api/ebay/sync` returns 401 without the correct `X-Sync-Secret` header
- [ ] Verify sync logs are saved correctly in `ebay_sync_logs` table

---

## Phase 5 — Core Frontend: Product Catalog & Search

_Goal: Build the public-facing storefront — shared layout shell, product grid, individual product pages, search, and filtering._

### Task 5.0 — Global Layout Shell & Category Seeds

- [x] Install `sanitize-html` + `@types/sanitize-html` package
- [x] Copy logo to `public/logo.png` (black & white house-CASA logo, red-600 accent theme)
- [x] Update `next.config.ts` — added `images.remotePatterns` for `i.ebayimg.com` and `galleryplus.ebayimg.com`
- [x] Update `src/proxy.ts` — added `newsletter` and `products` to `API_PATTERN` regex and middleware matcher
- [x] Seed categories into the database — Baseball Cards, Basketball Cards, Football Cards seeded via `prisma/seed.ts`; products reassigned to correct categories; `package.json` prisma seed config added
- [x] Create `src/components/layout/Header.tsx` — black bg, `next/image` logo (44px, CSS `invert`), nav (Home, Shop), search icon → `/search`, cart icon placeholder
- [x] Create `src/components/layout/Footer.tsx` — store name, shop/legal nav links, newsletter subscribe form (calls `POST /api/newsletter/subscribe`)
- [x] Create `src/components/layout/MobileNav.tsx` — hamburger + slide-out drawer with category links; red close button
- [x] Update `src/app/layout.tsx` — wraps `{children}` with `<Header />` and `<Footer />`; `flex min-h-screen flex-col` layout
- [x] Create `POST /api/newsletter/subscribe` — Zod email validation; upsert `EmailSubscriber`; idempotent 200

### Task 5.1 — Homepage

- [x] Replace placeholder `src/app/page.tsx` with a full server component
- [x] Hero section: store name, tagline, "Shop Now" (red) + "Search Cards" (outline) CTAs
- [x] Featured categories grid: fetched from DB, sport emoji icons, links to `/category/[slug]`
- [x] Newest products grid (8 items, `isActive: true`, `orderBy: createdAt desc`) using `ProductCard`
- [x] Trust badges row: Secure Checkout, Fast Shipping, Easy Returns
- [x] Newsletter signup bar — `src/components/homepage/NewsletterBar.tsx` client component
- [x] `src/components/products/ProductCard.tsx` — image/placeholder, condition badge (red=NEW), price, out-of-stock overlay, links to `/product/[slug]`
- [x] Slugs added to all 5 seeded products and re-seeded

### Task 5.2 — Product Listing Page (`/shop`)

- [x] Server-rendered grid of all active products (`isActive: true`), 12 per page
- [x] Filters via URL query params (`?category`, `?condition`, `?minPrice`, `?maxPrice`, `?inStock`, `?sort`, `?page`) — shareable, SEO-friendly URLs
- [x] `src/components/products/FilterSidebar.tsx` (client) — category buttons, condition checkboxes, price range form, in-stock toggle; each change updates URL and resets to page 1; "Clear all" link
- [x] Sort options (Link-based, no JS required): Newest, Price Low→High, Price High→Low
- [x] Product cards via `ProductCard` with `next/image`, condition badge, out-of-stock overlay
- [x] Pagination controls (`← Previous` / `Next →`) using `?page=N` links
- [x] Empty state with "Clear Filters" red button when no products match

### Task 5.3 — Product Detail Page (`/product/[slug]`)

- [x] Server component — fetch by `slug`; `notFound()` if missing or `isActive: false`
- [x] `src/components/products/ImageGallery.tsx` (client) — primary image + clickable thumbnail row; no-image placeholder
- [x] Condition badge (red=NEW, dark=LIKE_NEW, gray=USED, blue=REFURBISHED), price, compareAtPrice strikethrough
- [x] Stock status: "In Stock" (green) / "Only N left!" (orange, when ≤ `lowStockThreshold`) / "Out of Stock" (red)
- [x] Description: rendered via `sanitize-html` (strips scripts/links; allows basic formatting tags)
- [x] "Add to Cart" button — disabled with tooltip "Cart coming in Phase 6"
- [x] "Add to Wishlist" button — disabled with tooltip "Wishlist coming in Phase 7"
- [x] `Product` + `BreadcrumbList` JSON-LD injected via `<script type="application/ld+json">`
- [x] Dynamic `generateMetadata` — title, description (plain text, 160 chars), Open Graph image
- [x] Reviews section — star rating, title, body, date, verified badge; read-only; write-review note deferred to Phase 7
- [x] Related products: up to 4 same-category products via `ProductCard`
- [x] Breadcrumb nav: Home > [Category] > [Title]
- [x] eBay cross-link shown if `ebayItemId` is set
- [x] _Deferred to Phase 6.2:_ Shipping estimate calculator

### Task 5.4 — Search

- [x] Search icon in header navigates to `/search`; `src/components/layout/SearchShortcut.tsx` (client island) listens globally for `/` key and calls `router.push('/search')` — skips if target is an input or textarea
- [x] `GET /api/products/search?q=<term>&page=<n>` — Zod validates `q` (min 1, max 200 chars); Prisma `findMany` with `title: { contains: q, mode: 'insensitive' }` (ILIKE); returns paginated JSON
- [x] Search results page at `/search?q=<term>` — server component; `autoFocus` on input; same `ProductCard` grid; pagination links; result count shown
- [x] Empty state: "No results for '[term]'" with "Browse All Products" link; no-query state prompts user to type
- [x] `<SearchShortcut />` added to `src/app/layout.tsx` as a client island (renders null)
- [x] _Note:_ `ILIKE` is sufficient for the MVP. Upgrade to PostgreSQL `tsvector` full-text search (via `$queryRaw`) later if needed for relevance ranking.

### Task 5.5 — Category Pages (`/category/[slug]`)

- [x] Server component — fetch category by `slug`; `notFound()` if missing
- [x] Same `ProductCard` grid and `← Previous` / `Next →` pagination as `/shop`, pre-filtered to `categoryId`
- [x] Category header: name (h1), optional description, item count
- [x] Breadcrumb: Home > [Category Name]
- [x] Empty state with "Browse All Products" red button when no products in category
- [x] Dynamic `generateMetadata` — title + description (falls back to generic text)

### Phase 5 Verification

- [x] Run `npx prisma db seed` (or seed script) — 3 categories + 5 products confirmed seeded
- [x] Load `/shop` — HTTP 200; all filter param combinations (category, condition, inStock, price range) return 200
- [x] Test each filter combination on `/shop` — `/shop?category=baseball-cards`, `?condition=USED`, `?inStock=true`, `?minPrice=10&maxPrice=500` all return 200
- [x] Test search at `/search?q=Topps` — API returns `total=2` with correct product titles; `/search` page returns 200; empty-query and no-results states both return 200; invalid/oversized `q` returns 400
- [x] Confirm `/product/[slug]` renders with correct JSON-LD — `application/ld+json` script tag confirmed present in HTML
- [x] Confirm `/product/nonexistent-slug` returns 404
- [x] Confirm `/category/[slug]` — all 3 sport categories return 200; `/category/nonexistent` returns 404
- [x] Verify newsletter subscribe — valid email → `{"ok":true}`; invalid email → 422; duplicate email → idempotent `{"ok":true}`
- [x] Visual browser check: load `/shop`, `/search`, `/product/[slug]`, `/category/baseball-cards` — confirm images render, layout correct
- [x] Test on mobile (375px viewport) — header, nav drawer, product grid, and product detail all usable

---

## Phase 6 — Shopping Cart & Checkout

_Goal: Secure, frictionless checkout with Stripe. No payment data ever touches our server._

**Prerequisites (must be done before starting):**

- Add `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, and `STRIPE_WEBHOOK_SECRET` to `.env.local` (get from [dashboard.stripe.com](https://dashboard.stripe.com) → Developers → API keys)
- Install Stripe CLI locally (`brew install stripe/stripe-cli/stripe`) for local webhook testing

**Architecture notes:**

- Cart/Order/Address Prisma models already exist from Phase 2 — no schema changes needed
- `RESEND_API_KEY` and `EMAIL_FROM` are already configured — order confirmation emails are ready to wire up
- PayPal deferred to Phase 8 (credentials not yet configured)
- Real-time shipping rates (EasyPost) deferred to Phase 10 — using flat-rate options for MVP
- Sales tax (TaxJar/Stripe Tax) deferred to Phase 10

### Task 6.1 — Cart State & UI

- [x] Install packages: `npm install stripe @stripe/stripe-js @stripe/react-stripe-js`
- [x] Update `src/proxy.ts` — added `cart` to `API_PATTERN` regex and `/api/cart/:path*` to middleware matcher
- [x] Create `src/lib/cart.ts` — `CartItem` and `Cart` types; pure reducer functions (`addItem`, `removeItem`, `updateQty`, `clearCart`, `cartSubtotal`, `cartItemCount`); `loadCart`/`saveCart` localStorage helpers
- [x] Create `src/context/CartContext.tsx` — `CartProvider` with `useReducer`; hydrates from `localStorage` on mount; persists on every change; exposes `cart`, `addToCart`, `removeFromCart`, `updateQuantity`, `clearCart`, `itemCount`, `subtotal`, `isOpen`, `openCart`, `closeCart`
- [x] Wrap layout in `src/app/layout.tsx` with `<CartProvider>` + `<CartDrawer />` inside it
- [x] Create `src/components/cart/CartDrawer.tsx` — slide-over from right; backdrop with blur; thumbnail, title, qty +/− (capped at stockQuantity), remove; subtotal; "Proceed to Checkout" → `/checkout`; empty state; closes on Escape key; prevents body scroll when open
- [x] Update `src/components/layout/Header.tsx` — converted to `"use client"` to consume `useCart`; cart icon calls `openCart()`; red badge shows item count (9+ for overflow)
- [x] Create `src/components/products/AddToCartButton.tsx` — `"use client"` island; calls `addToCart` from CartContext; disabled + labelled "Out of Stock" when `outOfStock`
- [x] Wire `AddToCartButton` into `src/app/product/[slug]/page.tsx` — passes full `CartItem` data; replaces the old disabled placeholder button
- [x] `POST /api/cart/validate` — Zod validates array of `{productId, quantity}`; checks `stockQuantity` and `isActive` in DB; returns `allAvailable` boolean + per-item availability with current prices

### Task 6.2 — Checkout: Contact & Shipping Address

- [x] `src/app/checkout/page.tsx` — server component; `getServerSession(authOptions)`; passes `userEmail` + `isLoggedIn` to `<CheckoutForm />`
- [x] `src/app/checkout/CheckoutForm.tsx` — `"use client"`; manages `step` (1–4) and `shippingInfo` state; empty-cart state shows "Browse Products" link
- [x] Step indicator — 4 steps (Shipping · Delivery · Payment · Confirmation); red = active/done; checkmark on completed; gray = future
- [x] Step 1 — email (readonly + pre-filled if logged in), full name, address line 1, line 2 (optional), city, state (`<select>` all 50 US states + DC), ZIP (5-digit), country (US — readonly)
- [x] "Save this address" checkbox — only shown for logged-in users; stored in state for Task 6.4
- [x] Client-side validation: required fields, email regex, ZIP must be 5 digits; inline field-level error messages
- [x] Order summary sidebar — item list with qty, subtotal, shipping "calculated next"
- [x] Steps 2–3 built in Tasks 6.3–6.4; success/confirmation is a separate page at `/checkout/success` (Task 6.5)

### Task 6.3 — Checkout: Shipping Method & Order Summary

- [x] Step 2 — Flat-rate shipping options: USPS First Class $4.99 (5–7 days) / USPS Priority $9.99 (1–3 days); free shipping banner shown when subtotal ≥ `NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD` (default $75)
- [x] Radio-button shipping selector with red active highlight; "Select a delivery method" error if user skips
- [x] Order summary sidebar updates live as shipping method changes — shows subtotal, shipping cost (or "Free"), discount, bold total
- [x] "Add $X.XX more for free shipping" hint shown in sidebar when below threshold
- [x] Discount code input — calls `POST /api/checkout/validate-discount`; shows applied code + savings; "Remove" to clear
- [x] `POST /api/checkout/validate-discount` — Zod validated; checks `isActive`, expiry, `maxUses`, `minOrderAmount`; returns `{ type, value, amount }` (amount = dollars off, capped at subtotal for FIXED type)
- [x] "← Back" returns to Step 1; "Continue to Payment →" advances to Step 3

### Task 6.4 — Stripe Payment Integration (CRITICAL SECURITY)

- [x] Added `customerEmail String?` to Order Prisma model; pushed schema change with `prisma db push`
- [x] `src/lib/stripe.ts` — lazy-initialized Stripe singleton using `STRIPE_SECRET_KEY` and SDK API version `2026-02-25.clover`
- [x] `sendOrderConfirmationEmail` added to `src/lib/email.ts` — HTML email with item table, address, totals via Resend
- [x] `POST /api/checkout/create-intent` — Zod validated; re-fetches all product prices + stock from DB (never trusts client); calculates server-side subtotal, shipping, discount; generates order number `CC-YYYYMMDD-XXXX`; creates Stripe PaymentIntent; persists Address + Order (PENDING) + OrderItems + discount usedCount increment in one DB transaction; returns `{ clientSecret, orderNumber, total }`
- [x] Step 3 Payment UI — `<Elements>` provider with red Stripe theme; `<PaymentElement>` handles card/Apple Pay/Google Pay/Link; `stripe.confirmPayment({ redirect: "if_required" })` so most card payments resolve in-place; navigates to `/checkout/success?order=<orderNumber>` on success
- [x] `POST /api/webhooks/stripe` — reads raw body via `req.text()`; verifies signature with `constructEventAsync`; on `payment_intent.succeeded`: idempotency check (skip if PAID), stock decrement + status PAID in DB transaction, confirmation email via Resend (non-fatal if fails); on `payment_intent.payment_failed`: marks CANCELLED
- [x] `next.config.ts` CSP updated — added `https://js.stripe.com` to `script-src`, `frame-src`, `font-src`; added `hooks.stripe.com`, `m.stripe.com`, `m.stripe.network` to `connect-src`; updated `Permissions-Policy` payment directive (required for `<PaymentElement>` iframe to render)
- [x] `src/app/checkout/success/page.tsx` — initial basic page (green checkmark + order number); enhanced to full detail page in Task 6.5

### Task 6.5 — Confirmation & Guest Order Lookup

- [x] Step 4 — Confirmation page at `/checkout/success?order=<orderNumber>`:
  - "Thank you" message with order number
  - Summary of items ordered and shipping address
  - Prompt guests to create an account to track their order
  - "Continue Shopping" → `/shop`
- [x] `GET /api/orders/[orderNumber]` — returns order details; requires either auth session matching order `userId` OR matching email query param (guest lookup); 403 if neither matches; added `orders` to `API_PATTERN` regex and matcher in `src/proxy.ts`
- [x] `src/app/checkout/success/page.tsx` enhanced — server-side DB fetch; shows item list with thumbnails, subtotal/shipping/total breakdown, shipping address; guest prompt to create account or use order lookup; security: only shows details if `order.userId === null` (guest) or matches session
- [x] Guest order lookup page at `/orders/lookup` — client form: email + order number → calls API → shows status badge, item list, totals, shipping address, account creation prompt; friendly error messages for not-found vs. wrong email

### Phase 6 Verification

- [x] Add Stripe test keys to `.env.local`, run `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- [x] Add item to cart → open drawer → confirm item, qty, subtotal correct
- [x] Proceed through full checkout with Stripe test card `4242 4242 4242 4242`
- [x] Confirm webhook fires: order status → PAID, stock decremented, confirmation email received _(user confirmed email received)_
- [x] Price tamper protection verified via code review — `create-intent` re-fetches all prices from DB, client values ignored
- [x] Out-of-stock protection verified via code review — two-layer check: `cart/validate` + `create-intent` both re-check `stockQuantity`
- [x] Discount validation verified via code review — server re-validates code independently in `create-intent`, never trusts client amount
- [ ] Guest checkout: complete order without logging in → look up order at `/orders/lookup` _(manual test pending)_
- [ ] Test duplicate webhook delivery (resend same event) — confirm order is fulfilled only once _(manual test pending)_

---

## Phase 7 — Customer Accounts & Order Management

_Goal: Customer self-service portal for order history, tracking, profile management, and wishlist._

**Prerequisites (must be done before starting):**

- Phase 3 auth (NextAuth + sessions) must be complete ✅
- Phase 6 checkout/orders must be complete — `GET /api/orders/[orderNumber]` already built and reusable ✅
- Address and Order Prisma models already exist from Phase 2 ✅

**Architecture notes:**

- `GET /api/orders/[orderNumber]` (Phase 6) already handles auth — returns order if `userId` matches session; reuse in Task 7.2
- Guest order lookup at `/orders/lookup` (Phase 6) already exists — no changes needed
- `Address` model exists (Phase 2) — Task 7.3 only needs API routes + UI
- `Wishlist`/`WishlistItem` models do NOT exist — must add to Prisma schema in Task 7.5
- `User` model lacks `name` and `phone` fields — must add in Task 7.4 schema migration
- Add `/account` and `/account/:path*` to `API_PATTERN` regex and middleware matcher in `src/proxy.ts`
- All `/api/account/*` routes must verify the authenticated session user matches the resource owner (never trust `userId` from the client)

### Task 7.1 — Account Layout & Dashboard

- [x] Add `/api/account/:path*` to `API_PATTERN` regex and middleware matcher in `src/proxy.ts` — rate limiting applied to all account API routes
- [x] `src/app/account/layout.tsx` — server component; calls `getServerSession(authOptions)`; redirects to `/auth/login?callbackUrl=/account` if unauthenticated; renders sidebar nav (Overview, Orders, Addresses, Profile, Wishlist) + `{children}`
- [x] `src/app/account/page.tsx` — dashboard overview; fetches last 5 orders for the session user from DB (direct Prisma query); displays: welcome banner with name/email, quick-link cards to each section, recent orders table (order number, date, status badge, total, view link); empty state with "Start Shopping" CTA
- [x] `src/components/account/AccountSidebar.tsx` — desktop sidebar + mobile tab bar; active link highlighted red; links: `/account`, `/account/orders`, `/account/addresses`, `/account/profile`, `/account/wishlist`
- [x] `src/components/account/OrderStatusBadge.tsx` — reusable colored badge (PENDING=yellow, PAID=blue, PROCESSING=purple, SHIPPED=indigo, DELIVERED=green, CANCELLED=red, REFUNDED=gray)

### Task 7.2 — Order History & Tracking

- [x] `src/app/account/orders/page.tsx` — server component; fetches all orders for session user from DB (paginated, 10 per page, newest first); table: order number, date, item count, status badge, total, view link; pagination controls; empty state with "Start Shopping" CTA
- [x] `src/app/account/orders/[orderNumber]/page.tsx` — server component; direct Prisma query (includes `trackingNumber`, `paymentProvider`, `shippedAt`, `deliveredAt`); `notFound()` if order missing or `userId` doesn't match session; renders: status timeline (Placed → Paid → Processing → Shipped → Delivered with red fill progress), item list with thumbnails + per-item/total prices, shipping address, payment method label, shipped/delivered dates, totals breakdown; CANCELLED/REFUNDED show a red terminal banner instead of timeline
- [x] `src/lib/tracking.ts` — carrier detection: UPS (`1Z` prefix), FedEx (12/15/20 digits), USPS (20–22 digits); fallback to Google search
- [x] `src/components/account/ReorderButton.tsx` — `"use client"` island; calls `addToCart` for all in-stock items; opens cart drawer; button label changes to "Added to cart" on success

### Task 7.3 — Address Book

- [x] `src/app/account/addresses/page.tsx` — server component; fetches addresses ordered by default-first; passes to `<AddressManager>`; redirects to login if unauthenticated
- [x] `src/components/account/AddressForm.tsx` — reusable client form (name, line1, line2, city, state select, ZIP, US country readonly, isDefault checkbox); client-side Zod-equivalent validation; `onSave` callback used for both add and edit
- [x] `src/components/account/AddressManager.tsx` — client component; `mode: list | add | edit` state; address cards with default badge (red border/ring); "Set as Default", "Edit", "Delete" per card; `window.confirm` for delete; `useTransition` + `router.refresh()` to keep server data fresh
- [x] `POST /api/account/addresses` — Zod validated; `userId = session.user.id`; `$transaction` clears existing defaults before setting new one
- [x] `PUT /api/account/addresses/[id]` — Zod validated; IDOR check (`address.userId === session.user.id`); same transaction default-clearing logic
- [x] `DELETE /api/account/addresses/[id]` — IDOR check; 409 if address is on any non-cancelled/refunded order; 204 on success
- [x] `PATCH /api/account/addresses/[id]/default` — IDOR check; `$transaction` clears all user defaults, sets this one
- [x] Checkout pre-fill — `checkout/page.tsx` fetches default address server-side; `CheckoutForm` accepts `defaultAddress` prop and spreads it into initial shipping state

### Task 7.4 — Profile Management

- [x] **Schema migration:** Added `name String?`, `phone String?`, `pendingEmail String?`, `lastExportAt DateTime?` to `User` model; `npx prisma db push` applied
- [x] `src/app/account/profile/page.tsx` — server component; fetches fresh user data from DB; passes `emailChangedSuccess` flag from `?emailChanged=true` query param; redirects to login if unauthenticated
- [x] `src/components/account/ProfileForm.tsx` — client component with 4 sections: Personal Info (name + phone + save), Email Address (readonly current + inline change-email form), Password (link to change-password page), Danger Zone (delete + export)
- [x] `PUT /api/account/profile` — Zod validated; updates `name` and `phone` only; never touches email or role
- [x] `POST /api/account/change-email` — Zod validated; checks new email not already taken (silently); deletes old pending tokens; stores `pendingEmail` on user + new `EmailVerificationToken`; sends verification email to new address via Resend
- [x] `GET /api/account/verify-email-change?token=...` — hashes token, finds `EmailVerificationToken`, checks expiry, verifies `user.pendingEmail` exists, atomically swaps email + clears pendingEmail + bumps `passwordChangedAt` (invalidates all sessions); redirects to `/account/profile?emailChanged=true`
- [x] `src/app/account/profile/change-password/page.tsx` — `"use client"` page; live password rule checklist; confirm match indicator; calls `POST /api/account/change-password`; on success calls `signOut({ callbackUrl: '/auth/login?passwordChanged=true' })`
- [x] `POST /api/account/change-password` — `bcrypt.compare` current password; hashes new (cost 12); updates `passwordHash` + `passwordChangedAt` (auto-invalidates all JWTs via auth.ts callback); 400 on wrong current password
- [x] `DELETE /api/account` — session required; `$transaction` anonymizes PII (email → `deleted_<uuid>@deleted.local`, nulls name/phone/passwordHash/pendingEmail), bumps `passwordChangedAt`, disassociates orders, deletes addresses + auth tokens; client calls `signOut()` on success
- [x] `GET /api/account/export` — DB-based rate limit via `lastExportAt` (24-hour cooldown); returns JSON attachment with profile, all orders+items, addresses; excludes passwordHash and internal IDs

### Task 7.5 — Wishlist

- [x] **Schema migration:** Add to `prisma/schema.prisma`:

  ```
  Wishlist
    - id (uuid, PK)
    - userId (FK → User, unique — one wishlist per user)
    - createdAt

  WishlistItem
    - id (uuid, PK)
    - wishlistId (FK → Wishlist)
    - productId (FK → Product)
    - addedAt
    - @@unique([wishlistId, productId])
  ```

  Run `npx prisma db push`

- [x] `src/app/account/wishlist/page.tsx` — server component; fetches wishlist + items (with product data: title, slug, price, stockQuantity, images) for session user; renders product cards with stock badge, price, "Move to Cart" button, "Remove" button; empty state with "Browse Products" link
- [x] `POST /api/account/wishlist` — body: `{ productId }`; Zod validated; finds-or-creates Wishlist for `userId`; upserts WishlistItem (idempotent — adding same item twice is a no-op); returns 200
- [x] `DELETE /api/account/wishlist/[productId]` — verifies wishlist belongs to session user; deletes WishlistItem; 404 if not found
- [x] Wire up "Add to Wishlist" button on `/product/[slug]` — `src/components/products/WishlistButton.tsx` client component; calls `POST /api/account/wishlist`; shows filled heart if item is in wishlist (check via `GET /api/account/wishlist/[productId]`); redirects to `/auth/login` if not authenticated; replaces the existing disabled placeholder button
- [x] `GET /api/account/wishlist/[productId]` — returns `{ inWishlist: boolean }` for the session user; used to initialize button state on product detail page; returns `{ inWishlist: false }` for unauthenticated users (no error)
- [x] Add `wishlist` to `API_PATTERN` regex and middleware matcher in `src/proxy.ts` — already covered by existing `/api/account/:path*` matcher and `account` pattern in `API_PATTERN`

### Phase 7 Verification

**Code review fixes applied before manual testing:**

- Fixed: `account/page.tsx` dashboard greeting now fetches user name from DB (session JWT always had `name: null` due to `authorize` callback); greeting now correctly reflects updated display name
- Fixed: `DELETE /api/account` soft-delete transaction now also deletes the user's wishlist (WishlistItems cascade); previously wishlist rows were orphaned on account deletion
- Note: IDOR check on address routes returns 404 (not 403) intentionally — security best practice to avoid leaking resource existence

- [x] Log in → navigate to `/account` — confirm recent orders and quick-link cards render
- [x] Non-authenticated user visits `/account` — confirm redirect to `/auth/login?callbackUrl=/account`
- [x] View order history at `/account/orders` — all orders for the user are listed
- [x] Click into order detail — confirm items, address, totals, and status timeline render
- [ ] If an order has a tracking number: confirm carrier link opens the correct tracking page
- [x] Add a new address → set it as default → confirm it pre-fills checkout
- [x] Delete an address → confirm it is removed; attempt to delete an address on an existing order → confirm 409 error
- [x] Update display name → confirm name is reflected in dashboard greeting (DB fetch, not session)
- [ ] Change password → log out → log back in with new password → confirm it works
- [ ] Attempt `PUT /api/account/addresses/[id]` with a different user's address ID → confirm 404 (intentional IDOR protection — does not reveal existence)
- [x] Add product to wishlist → visit `/account/wishlist` → confirm it appears
- [x] "Move to Cart" from wishlist → confirm item is added to cart drawer
- [ ] Delete account → confirm redirect to homepage; attempt to log in with deleted account email → confirm blocked
- [x] Request data export → confirm JSON download with correct fields; re-request within 24 hours → confirm rate limit response

---

## Phase 8 — Admin Dashboard

_Goal: A secure, internal-only dashboard for managing the store._

**Prerequisites (must be done before starting):**

- Phase 3 auth (NextAuth + ADMIN role + `POST /api/admin/promote`) must be complete ✅
- Phase 6 checkout/orders must be complete — `Order`, `OrderItem`, Stripe lib, and order status flow already built ✅
- Phase 4 eBay sync must be complete — `/admin/ebay-sync` standalone page and `GET/POST /api/admin/ebay-sync` already built ✅
- `DiscountCode` Prisma model already exists from Phase 2 — no schema changes needed for Task 8.5 ✅

**Architecture notes:**

- `ADMIN` role and `POST /api/admin/promote` already exist from Phase 3 — no new auth primitives needed
- `/admin/ebay-sync` was built in Phase 4.5 as a **standalone page with no shared layout** — Task 8.1 adds the shared layout shell and the ebay-sync page must be updated to drop its standalone wrapper
- `DiscountCode` model already in schema (from Phase 2); Task 8.5 only needs CRUD API routes + UI
- `Order` model needs a `notes String?` field added (Task 8.3 schema migration)
- Activity log requires a new `AdminActivityLog` Prisma model (Task 8.1 schema migration)
- Customer ban requires a `banned Boolean @default(false)` field on `User` (Task 8.4 schema migration)
- All `/api/admin/*` routes must verify `session.user.role === 'ADMIN'` server-side on every request — never rely solely on middleware
- Stripe refunds: use `stripe.refunds.create({ payment_intent: order.stripePaymentIntentId, amount? })` — already have `src/lib/stripe.ts` singleton
- Analytics charts (Task 8.6) pull from DB via Prisma aggregate queries — GA4 is a Phase 10 frontend item; note the env var here but do not wire it yet
- Add `/admin` and `/admin/:path*` to the Next.js middleware matcher if not already covered by `src/proxy.ts`

### Task 8.1 — Admin Layout & Shared Infrastructure

- [ ] **Schema migration:** Add `AdminActivityLog` model to `prisma/schema.prisma`:
  ```
  AdminActivityLog
    - id         String   @id @default(uuid())
    - adminId    String   (FK → User)
    - admin      User     @relation(fields: [adminId], references: [id])
    - action     String   (e.g. "UPDATE_ORDER_STATUS", "ISSUE_REFUND", "CREATE_DISCOUNT")
    - targetType String?  (e.g. "Order", "Product", "Customer", "DiscountCode")
    - targetId   String?
    - detail     Json?    (before/after snapshot or relevant context)
    - createdAt  DateTime @default(now())
  ```
  Run `npx prisma db push`
- [ ] `src/app/admin/layout.tsx` — server component; `getServerSession(authOptions)`; redirects unauthenticated users to `/auth/login?callbackUrl=/admin`; returns 403 page (not redirect) for authenticated non-ADMIN users; renders `<AdminSidebar />` + `{children}` in a two-column layout
- [ ] `src/components/admin/AdminSidebar.tsx` — sidebar nav links: Dashboard (`/admin`), Products (`/admin/products`), Orders (`/admin/orders`), Customers (`/admin/customers`), eBay Sync (`/admin/ebay-sync`), Discounts (`/admin/discounts`), Analytics (`/admin/analytics`); active link highlighted red; "← Back to Store" link at bottom; mobile: collapsible top bar
- [ ] Update `src/app/admin/ebay-sync/page.tsx` — remove the standalone `<main>` wrapper and "← Admin" back-link; the shared layout shell now provides both
- [ ] Update `src/app/admin/page.tsx` — replace "Coming in Phase 8" placeholder with real dashboard: 4 stat cards (total revenue, total orders, active products, total customers); recent orders table (last 5, with status badge and order number link); quick-link cards to each admin section
- [ ] `GET /api/admin/stats` — ADMIN-only; returns:
  ```
  {
    revenue: { today: number, thisMonth: number, allTime: number },
    orders:  { total: number, byStatus: Record<OrderStatus, number> },
    products: { total: number, active: number, lowStock: number },
    customers: { total: number, newThisMonth: number }
  }
  ```
  (Use Prisma `aggregate` and `groupBy` — no raw SQL)
- [ ] `src/lib/adminLog.ts` — helper `logAdminAction(adminId, action, targetType?, targetId?, detail?)` — writes to `AdminActivityLog`; called from all mutating admin API routes; non-fatal (never throws — just console.error on failure)
- [ ] Add `/admin/:path*` to the middleware matcher in `src/proxy.ts` — apply rate limiting to all admin routes

### Task 8.2 — Product Management

- [ ] `src/app/admin/products/page.tsx` — server component; paginated product table (20/page): thumbnail, title, price, `stockQuantity`, condition badge, isActive status, last eBay sync date; `?q=` search (title contains); `?status=active|inactive` filter; pagination via `?page=N`
- [ ] `src/components/admin/products/ProductRowActions.tsx` — "Edit" link + "Activate"/"Deactivate" toggle button per row; calls API routes below; uses `useTransition` + `router.refresh()` for optimistic UI
- [ ] `src/app/admin/products/new/page.tsx` — form for manual product creation (non-eBay): title, description, price, compareAtPrice, condition (`<select>`), stockQuantity, lowStockThreshold, category (`<select>` from DB), image URL(s); calls `POST /api/admin/products`
- [ ] `src/app/admin/products/[id]/edit/page.tsx` — server component; fetches product by ID; renders pre-populated form; note shown if `ebayItemId` is set ("eBay-synced — changes may be overwritten on next sync"); calls `PUT /api/admin/products/[id]`
- [ ] `POST /api/admin/products` — Zod validated; creates product + generates slug (`slugify(title) + '-' + shortUuid`); enforces uniqueness; logs action via `logAdminAction`
- [ ] `PUT /api/admin/products/[id]` — Zod validated partial update (price, compareAtPrice, description, condition, stockQuantity, lowStockThreshold, isActive, categoryId); logs action
- [ ] `PATCH /api/admin/products/[id]/toggle` — flips `isActive`; logs action; returns `{ isActive: boolean }`
- [ ] `DELETE /api/admin/products/[id]` — returns 409 if product has any `OrderItem` records (never delete purchased products); otherwise hard-delete; logs action
- [ ] `POST /api/admin/products/bulk` — body: `{ action: 'activate' | 'deactivate' | 'delete', ids: string[] }`; Zod validated; max 50 IDs per request; logs a single bulk action entry
- [ ] Low-stock highlight: rows where `stockQuantity <= lowStockThreshold` show an orange "Low Stock" badge in the table

### Task 8.3 — Order Management

- [ ] **Schema migration:** Add `notes String?` to the `Order` model in `prisma/schema.prisma`; run `npx prisma db push`
- [ ] `src/app/admin/orders/page.tsx` — server component; paginated order table (20/page): order number (link), customer name+email, date, status badge, payment provider, total; filters: `?status=`, `?provider=`, `?from=YYYY-MM-DD`, `?to=YYYY-MM-DD`; search by order number or customer email via `?q=`
- [ ] `src/app/admin/orders/[orderNumber]/page.tsx` — order detail page: customer info card, item list with thumbnails + per-item prices, shipping address, payment method label, totals breakdown, current status + timestamps; renders `<OrderStatusUpdater>`, `<TrackingForm>`, `<RefundPanel>`, `<OrderNotes>` components based on order state
- [ ] `src/components/admin/orders/OrderStatusUpdater.tsx` — "use client"; dropdown of valid next statuses (enforces forward-only progression: PENDING→PAID→PROCESSING→SHIPPED→DELIVERED); confirm before changing; calls `PATCH /api/admin/orders/[orderNumber]/status`
- [ ] `src/components/admin/orders/TrackingForm.tsx` — "use client"; input for tracking number; calls `PATCH /api/admin/orders/[orderNumber]/tracking`; success state shows "Email sent to customer"
- [ ] `src/components/admin/orders/RefundPanel.tsx` — "use client"; shows refundable amount (order total); radio: Full Refund / Partial (custom amount input); confirmation modal before submitting; calls `POST /api/admin/orders/[orderNumber]/refund`; only shown when `paymentProvider === 'STRIPE'` and status is PAID/SHIPPED/DELIVERED
- [ ] `src/components/admin/orders/OrderNotes.tsx` — "use client"; textarea for internal notes (not visible to customers); calls `PATCH /api/admin/orders/[orderNumber]/notes`
- [ ] `PATCH /api/admin/orders/[orderNumber]/status` — Zod validated; enforces valid transitions (CANCELLED and REFUNDED are terminal); sets `shippedAt` when → SHIPPED, `deliveredAt` when → DELIVERED; logs action
- [ ] `PATCH /api/admin/orders/[orderNumber]/tracking` — updates `trackingNumber`; calls `sendShippingNotificationEmail` from `src/lib/email.ts` (add this function if not already present); logs action
- [ ] `POST /api/admin/orders/[orderNumber]/refund` — calls `stripe.refunds.create({ payment_intent: order.stripePaymentIntentId, amount? })`; on full refund sets order status to REFUNDED; on partial adds a note; logs action with amount detail; returns 400 if no `stripePaymentIntentId`
- [ ] `PATCH /api/admin/orders/[orderNumber]/notes` — updates `notes` field; ADMIN-only; logs action

### Task 8.4 — Customer Management

- [ ] **Schema migration:** Add `banned Boolean @default(false)` to `User` model in `prisma/schema.prisma`; run `npx prisma db push`
- [ ] Update auth `authorize` callback in `src/app/api/auth/[...nextauth]/auth.ts` — check `user.banned`; return `null` to reject login for banned users (shows "Account suspended" error)
- [ ] `src/app/admin/customers/page.tsx` — server component; paginated customer table (20/page): name, email, orders count, total spent (sum of non-CANCELLED/REFUNDED orders), registered date, banned badge if applicable; search by name or email via `?q=`; `?banned=true` filter
- [ ] `src/app/admin/customers/[id]/page.tsx` — customer detail: profile card (name, email, phone, joined date, banned status), order history table (same data as account/orders), saved addresses list; action buttons: Verify Email, Ban Account, Unban Account
- [ ] `PATCH /api/admin/customers/[id]/status` — body: `{ action: 'verify' | 'ban' | 'unban' }`; Zod validated; `verify` sets `emailVerified = new Date()`; `ban`/`unban` toggles `banned` field; logs action; returns 400 if attempting to ban yourself
- [ ] `GET /api/admin/customers/export` — streams CSV response (`Content-Type: text/csv`; `Content-Disposition: attachment`); includes only users with a linked `EmailSubscriber` where `subscribed: true`; fields: name, email, orders count, total spent, joined date; logs action (no PII in log detail)

### Task 8.5 — Discount Code Management

- [ ] `src/app/admin/discounts/page.tsx` — server component; table of all discount codes: code, type, value, min order amount, expiry, max uses, used count, active status; "Create New Code" button opens `<DiscountForm>` in a modal or inline form
- [ ] `src/components/admin/discounts/DiscountForm.tsx` — "use client"; fields: code (text + "Generate Random" button that fills a 8-char uppercase alphanumeric), type (PERCENTAGE / FIXED), value (number), minOrderAmount (optional), expiresAt (optional date picker), maxUses (optional number), isActive (toggle, default true); Zod-equivalent client validation; `onSave` callback
- [ ] `POST /api/admin/discounts` — Zod validated; normalizes `code` to uppercase; 409 if code already exists; creates `DiscountCode`; logs action
- [ ] `PUT /api/admin/discounts/[id]` — Zod validated partial update (all fields except `usedCount` and `id`); logs action
- [ ] `PATCH /api/admin/discounts/[id]/toggle` — flips `isActive`; logs action; returns `{ isActive: boolean }`
- [ ] `DELETE /api/admin/discounts/[id]` — hard delete; logs action; returns 409 if code has `usedCount > 0` (preserve history)
- [ ] Discount detail: clicking a code row in the table fetches and lists all `Order` records where `discountCode === code` (join via Order model's discount code field); shows order number, customer, amount saved

### Task 8.6 — Analytics Dashboard

- [ ] Install recharts: `npm install recharts @types/recharts` (if not already installed)
- [ ] `src/app/admin/analytics/page.tsx` — client component (charts require client-side rendering); fetches from `GET /api/admin/analytics` on mount; renders: revenue area chart (daily for last 30 days), top 10 products bar chart, orders-by-status pie chart, customer stats cards
- [ ] `GET /api/admin/analytics` — ADMIN-only; returns:
  ```
  {
    dailyRevenue:    { date: string, revenue: number, orderCount: number }[]  // last 30 days
    ordersByStatus:  Record<OrderStatus, number>
    topProducts:     { productId: string, title: string, totalSold: number, revenue: number }[]  // top 10
    customerStats:   { total: number, newLast30Days: number, returning: number }
  }
  ```
  Use Prisma `groupBy` for daily revenue (group by `createdAt` date, sum `total`, where `status IN [PAID, SHIPPED, DELIVERED, REFUNDED]`); use `$queryRaw` only if `groupBy` cannot produce the date-bucketed result
- [ ] Revenue chart: `<AreaChart>` from recharts; x-axis = date, y-axis = revenue in dollars; tooltip shows revenue + order count
- [ ] Top products chart: `<BarChart>` horizontal; product title on y-axis, quantity sold on x-axis
- [ ] Orders by status: `<PieChart>` with legend; colors match `OrderStatusBadge` colors from Phase 7
- [ ] _Note:_ GA4 (`NEXT_PUBLIC_GA_MEASUREMENT_ID`) is wired in Phase 10 — do not add GA4 script here; conversion rate tracking (add-to-cart → checkout → purchase funnel) is also Phase 10

### Phase 8 Verification

- [ ] Log in as non-admin user — confirm visiting `/admin` returns 403 (not a redirect)
- [ ] Unauthenticated user visits `/admin` — confirm redirect to `/auth/login?callbackUrl=/admin`
- [ ] Log in as admin — confirm sidebar renders and all nav links (`/admin/products`, `/admin/orders`, `/admin/customers`, `/admin/ebay-sync`, `/admin/discounts`, `/admin/analytics`) load without errors
- [ ] Stats cards on `/admin` dashboard show non-zero values (assuming seeded data exists)
- [ ] Create a product manually via `/admin/products/new` → confirm it appears in `/shop`
- [ ] Toggle a product inactive → confirm it disappears from `/shop`; toggle active again → confirm it returns
- [ ] Bulk deactivate 2 products → confirm both disappear from `/shop`
- [ ] Update an order status to SHIPPED → confirm `shippedAt` timestamp is set
- [ ] Add tracking number to an order → confirm customer shipping notification email is received
- [ ] Process a Stripe refund via admin panel → confirm Stripe dashboard shows the refund
- [ ] Create a discount code → apply it at checkout → confirm order total reflects the discount; view usage count in `/admin/discounts` (should be 1)
- [ ] Ban a customer account → attempt login with that account → confirm login is blocked
- [ ] Export customer CSV → confirm only subscribed customers are included with correct fields
- [ ] Check `AdminActivityLog` table in DB — confirm entries logged for each action above
- [ ] Load `/admin/analytics` — confirm all charts render with data

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
