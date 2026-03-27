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
- **Payments:** PayPal
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

_Goal: Secure, frictionless checkout with PayPal. No payment data ever touches our server._

**Prerequisites (must be done before starting):**

- Add `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, and `PAYPAL_WEBHOOK_ID` to `.env.local` (get from [developer.paypal.com](https://developer.paypal.com) → Apps & Credentials → Create App)
- Use Sandbox credentials locally; swap for Live credentials in Vercel for production

**Architecture notes:**

- Cart/Order/Address Prisma models already exist from Phase 2 — no schema changes needed
- `RESEND_API_KEY` and `EMAIL_FROM` are already configured — order confirmation emails are ready to wire up
- Real-time shipping rates (EasyPost) deferred to Phase 11 — using flat-rate options for MVP
- Sales tax (TaxJar) deferred to Phase 11

### Task 6.1 — Cart State & UI

- [x] Install packages: `npm install @paypal/react-paypal-js`
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
- [x] `POST /api/checkout/create-paypal-order` — Zod validated; re-fetches all product prices + stock from DB (never trusts client); calculates server-side subtotal, shipping, discount; generates order number `CC-YYYYMMDD-XXXX`; creates PayPal Order via REST API; persists Address + Order (PENDING) + OrderItems + discount usedCount increment in one DB transaction; returns `{ paypalOrderId, orderNumber, total }`
- [x] `POST /api/checkout/capture-paypal-order` — called after user approves in PayPal popup; captures the PayPal order; idempotency check (skip if PAID); stock decrement + status PAID in DB transaction; confirmation email via Resend (non-fatal if fails); returns `{ orderNumber }`
- [x] Step 3 Payment UI — `<PayPalScriptProvider>` wraps entire form; `<PayPalButtons>` renders PayPal/card buttons; `createOrder` callback calls `create-paypal-order`; `onApprove` callback calls `capture-paypal-order`; navigates to `/checkout/success?order=<orderNumber>` on success
- [x] `POST /api/webhooks/paypal` — verifies PayPal webhook signature; on `PAYMENT.CAPTURE.COMPLETED`: idempotency check, stock decrement + status PAID in DB transaction, confirmation email; on `PAYMENT.CAPTURE.DENIED/REVERSED`: marks PENDING order CANCELLED
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

- [x] Add PayPal Sandbox credentials to `.env.local`
- [x] Add item to cart → open drawer → confirm item, qty, subtotal correct
- [ ] Proceed through full checkout with PayPal Sandbox buyer account — confirm order reaches PAID status _(manual test pending with sandbox credentials)_
- [ ] Confirm webhook fires: order status → PAID, stock decremented, confirmation email received _(manual test pending)_
- [x] Price tamper protection verified via code review — `create-paypal-order` re-fetches all prices from DB, client values ignored
- [x] Out-of-stock protection verified via code review — two-layer check: `cart/validate` + `create-paypal-order` both re-check `stockQuantity`
- [x] Discount validation verified via code review — server re-validates code independently in `create-paypal-order`, never trusts client amount
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

- [x] **Schema migration:** Add `AdminActivityLog` model to `prisma/schema.prisma`:
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
- [x] `src/app/admin/layout.tsx` — server component; `getServerSession(authOptions)`; redirects unauthenticated users to `/auth/login?callbackUrl=/admin`; returns 403 page (not redirect) for authenticated non-ADMIN users; renders `<AdminSidebar />` + `{children}` in a two-column layout
- [x] `src/components/admin/AdminSidebar.tsx` — sidebar nav links: Dashboard (`/admin`), Products (`/admin/products`), Orders (`/admin/orders`), Customers (`/admin/customers`), eBay Sync (`/admin/ebay-sync`), Discounts (`/admin/discounts`), Analytics (`/admin/analytics`); active link highlighted red; "← Back to Store" link at bottom; mobile: collapsible top bar
- [x] Update `src/app/admin/ebay-sync/page.tsx` — remove the standalone `<main>` wrapper and "← Admin" back-link; the shared layout shell now provides both
- [x] Update `src/app/admin/page.tsx` — replace "Coming in Phase 8" placeholder with real dashboard: 4 stat cards (total revenue, total orders, active products, total customers); recent orders table (last 5, with status badge and order number link); quick-link cards to each admin section
- [x] `GET /api/admin/stats` — ADMIN-only; returns:
  ```
  {
    revenue: { today: number, thisMonth: number, allTime: number },
    orders:  { total: number, byStatus: Record<OrderStatus, number> },
    products: { total: number, active: number, lowStock: number },
    customers: { total: number, newThisMonth: number }
  }
  ```
  (Use Prisma `aggregate` and `groupBy` — no raw SQL)
- [x] `src/lib/adminLog.ts` — helper `logAdminAction(adminId, action, targetType?, targetId?, detail?)` — writes to `AdminActivityLog`; called from all mutating admin API routes; non-fatal (never throws — just console.error on failure)
- [x] Add `/admin/:path*` to the middleware matcher in `src/proxy.ts` — already covered by existing matcher

### Task 8.2 — Product Management

- [x] `src/app/admin/products/page.tsx` — server component; paginated product table (20/page): thumbnail, title, price, `stockQuantity`, condition badge, isActive status, last eBay sync date; `?q=` search (title contains); `?status=active|inactive` filter; pagination via `?page=N`
- [x] `src/components/admin/products/ProductRowActions.tsx` — "Edit" link + "Activate"/"Deactivate" toggle button per row; calls API routes below; uses `useTransition` + `router.refresh()` for optimistic UI
- [x] `src/app/admin/products/new/page.tsx` — form for manual product creation (non-eBay): title, description, price, compareAtPrice, condition (`<select>`), stockQuantity, lowStockThreshold, category (`<select>` from DB), image URL(s); calls `POST /api/admin/products`
- [x] `src/app/admin/products/[id]/edit/page.tsx` — server component; fetches product by ID; renders pre-populated form; note shown if `ebayItemId` is set ("eBay-synced — changes may be overwritten on next sync"); calls `PUT /api/admin/products/[id]`
- [x] `POST /api/admin/products` — Zod validated; creates product + generates slug (`slugify(title) + '-' + shortUuid`); enforces uniqueness; logs action via `logAdminAction`
- [x] `PUT /api/admin/products/[id]` — Zod validated partial update (price, compareAtPrice, description, condition, stockQuantity, lowStockThreshold, isActive, categoryId); logs action
- [x] `PATCH /api/admin/products/[id]/toggle` — flips `isActive`; logs action; returns `{ isActive: boolean }`
- [x] `DELETE /api/admin/products/[id]` — returns 409 if product has any `OrderItem` records (never delete purchased products); otherwise hard-delete; logs action
- [x] `POST /api/admin/products/bulk` — body: `{ action: 'activate' | 'deactivate' | 'delete', ids: string[] }`; Zod validated; max 50 IDs per request; logs a single bulk action entry
- [x] Low-stock highlight: rows where `stockQuantity <= lowStockThreshold` show an orange "Low Stock" badge in the table

### Task 8.3 — Order Management

- [x] **Schema migration:** Add `notes String?` to the `Order` model in `prisma/schema.prisma`; run `npx prisma db push` — field already existed, no migration needed
- [x] `src/app/admin/orders/page.tsx` — server component; paginated order table (20/page): order number (link), customer name+email, date, status badge, payment provider, total; filters: `?status=`, `?provider=`, `?from=YYYY-MM-DD`, `?to=YYYY-MM-DD`; search by order number or customer email via `?q=`
- [x] `src/app/admin/orders/[orderNumber]/page.tsx` — order detail page: customer info card, item list with thumbnails + per-item prices, shipping address, payment method label, totals breakdown, current status + timestamps; renders `<OrderStatusUpdater>`, `<TrackingForm>`, `<RefundPanel>`, `<OrderNotes>` components based on order state
- [x] `src/components/admin/orders/OrderStatusUpdater.tsx` — "use client"; dropdown of valid next statuses (enforces forward-only progression: PENDING→PAID→PROCESSING→SHIPPED→DELIVERED); confirm before changing; calls `PATCH /api/admin/orders/[orderNumber]/status`
- [x] `src/components/admin/orders/TrackingForm.tsx` — "use client"; input for tracking number; calls `PATCH /api/admin/orders/[orderNumber]/tracking`; success state shows "Email sent to customer"
- [x] `src/components/admin/orders/RefundPanel.tsx` — "use client"; shows refundable amount (order total); radio: Full Refund / Partial (custom amount input); confirmation modal before submitting; calls `POST /api/admin/orders/[orderNumber]/refund`; only shown when `paymentProvider === 'STRIPE'` and status is PAID/SHIPPED/DELIVERED
- [x] `src/components/admin/orders/OrderNotes.tsx` — "use client"; textarea for internal notes (not visible to customers); calls `PATCH /api/admin/orders/[orderNumber]/notes`
- [x] `PATCH /api/admin/orders/[orderNumber]/status` — Zod validated; enforces valid transitions (CANCELLED and REFUNDED are terminal); sets `shippedAt` when → SHIPPED, `deliveredAt` when → DELIVERED; logs action
- [x] `PATCH /api/admin/orders/[orderNumber]/tracking` — updates `trackingNumber`; calls `sendShippingNotificationEmail` from `src/lib/email.ts` (add this function if not already present); logs action
- [x] `POST /api/admin/orders/[orderNumber]/refund` — calls `stripe.refunds.create({ payment_intent: order.paymentIntentId, amount? })`; on full refund sets order status to REFUNDED; on partial adds a note; logs action with amount detail; returns 400 if no `paymentIntentId`
- [x] `PATCH /api/admin/orders/[orderNumber]/notes` — updates `notes` field; ADMIN-only; logs action

### Task 8.4 — Customer Management

- [x] **Schema migration:** Add `banned Boolean @default(false)` to `User` model in `prisma/schema.prisma`; run `npx prisma db push`
- [x] Update auth `authorize` callback in `src/lib/auth.ts` — check `user.banned`; throws `AccountSuspended` error to reject login for banned users
- [x] `src/app/admin/customers/page.tsx` — server component; paginated customer table (20/page): name, email, orders count, total spent (sum of non-CANCELLED/REFUNDED orders), registered date, banned badge if applicable; search by name or email via `?q=`; `?banned=true` filter
- [x] `src/app/admin/customers/[id]/page.tsx` — customer detail: profile card (name, email, phone, joined date, banned status), order history table, saved addresses list; `<CustomerActions>` client component with Verify Email, Ban Account, Unban Account buttons
- [x] `PATCH /api/admin/customers/[id]/status` — body: `{ action: 'verify' | 'ban' | 'unban' }`; Zod validated; `verify` sets `emailVerified = true`; `ban`/`unban` toggles `banned` field; logs action; returns 400 if attempting to ban yourself
- [x] `GET /api/admin/customers/export` — streams CSV response (`Content-Type: text/csv`; `Content-Disposition: attachment`); includes only users whose email matches an active `EmailSubscriber` (`isActive: true`); fields: name, email, orders count, total spent, joined date; logs action (no PII in log detail)

### Task 8.5 — Discount Code Management

- [x] `src/app/admin/discounts/page.tsx` — server component; table of all discount codes: code, type, value, min order amount, expiry, max uses, used count, active status; "Create New Code" button opens `<DiscountForm>` inline
- [x] `src/components/admin/discounts/DiscountForm.tsx` — "use client"; fields: code (text + "Generate Random" button that fills a 8-char uppercase alphanumeric), type (PERCENTAGE / FIXED), value (number), minOrderAmount (optional), expiresAt (optional date picker), maxUses (optional number), isActive (toggle, default true); client-side validation; `onSave` callback
- [x] `POST /api/admin/discounts` — Zod validated; normalizes `code` to uppercase; 409 if code already exists; creates `DiscountCode`; logs action
- [x] `PUT /api/admin/discounts/[id]` — Zod validated partial update (all fields except `usedCount` and `id`); logs action
- [x] `PATCH /api/admin/discounts/[id]/toggle` — flips `isActive`; logs action; returns `{ isActive: boolean }`
- [x] `DELETE /api/admin/discounts/[id]` — hard delete; logs action; returns 409 if code has `usedCount > 0` (preserve history)
- [x] Discount detail: clicking a code row expands inline; calls `GET /api/admin/discounts/[id]/orders`; shows order number, customer, date, status, amount saved — requires `discountCode String?` and `discountAmount Decimal?` fields added to `Order` model (schema migrated)

### Task 8.6 — Analytics Dashboard

- [x] Install recharts: `npm install recharts` (ships own types, no @types package needed)
- [x] `src/app/admin/analytics/page.tsx` — server wrapper that renders `<AnalyticsDashboard>` client component; fetches from `GET /api/admin/analytics` on mount; renders: revenue area chart, top 10 products bar chart, orders-by-status pie chart, customer stats cards
- [x] `GET /api/admin/analytics` — ADMIN-only; returns `dailyRevenue`, `ordersByStatus`, `topProducts`, `customerStats`; daily revenue uses `$queryRaw` (Prisma `groupBy` cannot date-bucket a DateTime column); missing days filled with 0
- [x] Revenue chart: `<AreaChart>` from recharts; x-axis = date, y-axis = revenue; tooltip shows formatted dollar amount
- [x] Top products chart: `<BarChart>` horizontal layout; product title on y-axis, units sold on x-axis
- [x] Orders by status: `<PieChart>` with legend; colors match `OrderStatusBadge` colors
- [x] _Note:_ GA4 (`NEXT_PUBLIC_GA_MEASUREMENT_ID`) is wired in Phase 11 — not added here

### Phase 8 Verification

- [x] Log in as non-admin user — confirm visiting `/admin` returns 403 (not a redirect) — **verified by code**: `admin/layout.tsx` renders 403 page (not `redirect()`) for authenticated non-ADMIN users
- [x] Unauthenticated user visits `/admin` — confirm redirect to `/auth/login?callbackUrl=/admin` — **verified by code**: `admin/layout.tsx` line 12 calls `redirect("/auth/login?callbackUrl=/admin")`
- [x] Log in as admin — confirm sidebar renders and all nav links (`/admin/products`, `/admin/orders`, `/admin/customers`, `/admin/ebay-sync`, `/admin/discounts`, `/admin/analytics`) load without errors — **verified by code + build**: all 7 nav links present in `AdminSidebar.tsx`; all routes confirmed compiled in build output
- [ ] Stats cards on `/admin` dashboard show non-zero values (assuming seeded data exists) — **manual test required** (needs running app + seeded data)
- [ ] Create a product manually via `/admin/products/new` → confirm it appears in `/shop` — **manual test required**
- [ ] Toggle a product inactive → confirm it disappears from `/shop`; toggle active again → confirm it returns — **manual test required**
- [ ] Bulk deactivate 2 products → confirm both disappear from `/shop` — **manual test required**
- [x] Update an order status to SHIPPED → confirm `shippedAt` timestamp is set — **verified by code**: `orders/[orderNumber]/status/route.ts` line 67 sets `shippedAt: now` on SHIPPED transition
- [ ] Add tracking number to an order → confirm customer shipping notification email is received — **code verified** (tracking route calls `sendShippingNotificationEmail`); email receipt requires **manual test**
- [ ] Process a Stripe refund via admin panel → confirm Stripe dashboard shows the refund — **manual test required** (needs live Stripe test mode)
- [x] Create a discount code → apply it at checkout → confirm order total reflects the discount; view usage count in `/admin/discounts` (should be 1) — **verified by code**: checkout `create-intent` validates code, applies discount, increments `usedCount`, and now saves `discountCode`/`discountAmount` to Order (bug fixed during verification — those fields were not being written)
- [x] Ban a customer account → attempt login with that account → confirm login is blocked — **verified by code**: `auth.ts` throws `AccountSuspended` error when `user.banned === true`
- [x] Export customer CSV → confirm only subscribed customers are included with correct fields — **verified by code**: export route queries `EmailSubscriber` with `isActive: true`, matches users by email, outputs name/email/orders/total_spent/joined
- [ ] Check `AdminActivityLog` table in DB — confirm entries logged for each action above — **manual test required** (DB inspection)
- [ ] Load `/admin/analytics` — confirm all charts render with data — **manual test required** (needs running app with order data)

---

## Phase 9.00 — Make-an-Offer System

_Goal: Let customers submit price offers on individual cards, with a hard server-side floor of 70% of the buy-now price. Accepted offers generate a time-limited one-time purchase token that locks the offer price into the existing Stripe checkout flow._

**Architecture notes:**

- Offers are validated server-side: `offerPrice >= product.price * 0.70` — the 70% floor cannot be bypassed by the client
- Accepted offers issue a `purchaseToken` (crypto-random, unique) with a 48-hour expiry — no separate payment path needed; the token is passed to the existing `/checkout` flow which substitutes the offer price for that one line item
- `POST /api/checkout/create-intent` re-validates the token server-side before creating the Stripe PaymentIntent — client can never forge the price
- Daily Vercel Cron auto-expires stale offers
- Offer system requires authentication — guests must log in or register to make an offer

### Schema Migration

Add the following to `prisma/schema.prisma`:

```
enum OfferStatus {
  PENDING
  ACCEPTED
  DECLINED
  EXPIRED
  PURCHASED
}

model Offer {
  id              String      @id @default(uuid())
  productId       String
  product         Product     @relation(fields: [productId], references: [id])
  userId          String
  user            User        @relation(fields: [userId], references: [id])
  offerPrice      Decimal     @db.Decimal(10, 2)
  status          OfferStatus @default(PENDING)
  purchaseToken   String?     @unique
  tokenExpiresAt  DateTime?
  adminNote       String?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([productId, status])
  @@index([userId])
}
```

Run `npx prisma db push`. Add `offers` relation to `User` and `Product` models.

- [x] `OfferStatus` enum added; `Offer` model added; `offerToken String?` added to `Order`; `offers` relation added to `User` and `Product`; `npx prisma db push` applied

### Task 9.01.1 — Product Detail UI

- [x] Add "Make an Offer" button below `<AddToCartButton>` on `/product/[slug]` — only shown when product is `isActive`, in stock, and has a price
- [x] If not logged in: clicking redirects to `/auth/login?callbackUrl=/product/[slug]`
- [x] If logged in: opens `<OfferModal>` client component; button label changes to "Offer Pending" (disabled) if user already has a PENDING offer on this product (check via `GET /api/offers/[productId]/status`)
- [x] `src/components/products/OfferModal.tsx` — client modal:
  - Current buy-now price displayed
  - "Minimum offer: $X.XX" hint — 70% of price, calculated client-side for UX feedback only (server re-validates independently)
  - Price input (`type="number"`, `step="0.01"`, `min` set to 70% of price)
  - Submit button with loading state
  - Success state: "Offer submitted! We'll email you when the seller responds."
  - Error state (server 400): "Offer must be at least $X.XX (70% of asking price)"
  - Error state (server 409): "You already have a pending offer on this item."

### Task 9.01.2 — Offer API Routes

- [x] `POST /api/offers` — body: `{ productId, offerPrice }`:
  - Session required — 401 if unauthenticated
  - Zod validated: `offerPrice` must be a positive number with max 2 decimal places
  - Fetch product from DB; 404 if not found or `isActive: false`; 400 if `stockQuantity <= 0`
  - **Server-side floor check:** `offerPrice < product.price * 0.70` → 400 `{ error: "Offer too low", minimum: product.price * 0.70 }`
  - Check for existing PENDING offer from same user on same product → 409 `{ error: "You already have a pending offer on this item" }`
  - Create `Offer` with status `PENDING`
  - Send admin notification email via Resend to `EMAIL_FROM`: product title + link, offered price, asking price, % of asking, customer name + email
  - Send customer confirmation email: "Your offer of $X.XX on [Product] was received — we'll respond within 48 hours"
  - Rate limit: 5 offers per user per hour (via existing rate limiter)
- [x] `GET /api/offers` — session required; returns paginated list of all offers for the logged-in user (for account dashboard); includes product title, slug, images, asking price
- [x] `GET /api/offers/[productId]/status` — session required; returns `{ hasOffer: boolean, status?: OfferStatus, purchaseToken?: string }` for the logged-in user on that product; returns `{ hasOffer: false }` if unauthenticated (no error)
- [x] Add `offers` to `API_PATTERN` regex and matcher in `src/proxy.ts`

### Task 9.01.3 — Admin Offer Management

- [x] Add "Offers" link to `src/components/admin/AdminSidebar.tsx` nav (between Discounts and Analytics)
- [x] `src/app/admin/offers/page.tsx` — server component; paginated table (20/page):
  - Columns: product thumbnail + title, customer name + email, offered price, asking price, % of asking, submitted date, status badge
  - Filter by status: `?status=PENDING|ACCEPTED|DECLINED|EXPIRED|PURCHASED` (default shows PENDING first)
  - PENDING rows highlighted with a yellow-50 background
- [x] `src/components/admin/offers/OfferActions.tsx` — "use client"; renders per PENDING row:
  - **Accept** button (green) — calls `PATCH /api/admin/offers/[id]/accept`
  - **Decline** button (red) — expands an inline textarea for an optional note; "Confirm Decline" submits `PATCH /api/admin/offers/[id]/decline`
  - `useTransition` + `router.refresh()` for optimistic UI; buttons disabled while pending
- [x] `PATCH /api/admin/offers/[id]/accept` — ADMIN only:
  - Verify offer exists and is PENDING; 404 otherwise
  - Generate `purchaseToken = crypto.randomBytes(32).toString('hex')`
  - Set `tokenExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)`; set status `ACCEPTED`
  - Send customer email: "Your offer of $X.XX was accepted! Use the link below to complete your purchase within 48 hours." — link to `/checkout?offerToken=[purchaseToken]`
  - Log action via `logAdminAction`; return `{ ok: true }`
- [x] `PATCH /api/admin/offers/[id]/decline` — ADMIN only:
  - Verify offer exists and is PENDING; 404 otherwise
  - Body: `{ adminNote?: string }` (Zod validated; max 500 chars)
  - Set status `DECLINED`; save `adminNote`
  - Send customer email: "Your offer on [Product] was not accepted." + optional note if provided; "Browse our shop for other great cards: [/shop link]"
  - Log action; return `{ ok: true }`

### Task 9.01.4 — Accepted Offer Checkout Flow

- [x] `GET /api/offers/token/[token]` — public route:
  - Find offer by `purchaseToken`; 404 if not found
  - Validate: status is `ACCEPTED`, `tokenExpiresAt > now()`, product is `isActive` and `stockQuantity > 0`; 400 with descriptive error otherwise
  - Returns `{ product: { id, title, slug, price, images }, offerPrice }`
- [x] Update `src/app/checkout/CheckoutForm.tsx` — on mount, if `offerToken` query param present:
  - Call `GET /api/offers/token/[token]`; if valid, override cart with `[{ productId, quantity: 1, priceAtAdd: offerPrice }]` and show "Offer Price Applied: $X.XX" banner (green); disable cart editing in this mode
  - If token invalid/expired: show error banner "This offer link has expired or already been used" and fall back to normal cart
- [x] Update `POST /api/checkout/create-intent` — if `offerToken` present in request body:
  - Re-validate token server-side (same checks as `GET /api/offers/token/[token]`) — never trust client price
  - Use `offerPrice` from DB for that product's line item; all other items use DB prices as usual
  - Do NOT mark offer as PURCHASED here — wait for capture/webhook confirmation
- [x] Update `POST /api/checkout/capture-paypal-order` + `POST /api/webhooks/paypal` — on successful capture: if `offerToken` was stored on the Order, find the Offer and set status `PURCHASED`
- [x] Add `offerToken String?` field to `Order` model in Prisma schema; run `npx prisma db push`
- [x] `GET /api/cron/expire-offers` — protected by `Authorization: Bearer CRON_SECRET`:
  - Sets status `EXPIRED` for: PENDING offers where `createdAt < now() - 72h`; ACCEPTED offers where `tokenExpiresAt < now()`
  - Returns `{ expired: number }`
- [x] Add to `vercel.json` cron: `{ "path": "/api/cron/expire-offers", "schedule": "0 0 * * *" }` (midnight UTC daily)

### Task 9.01.5 — Customer Account: My Offers

- [x] `src/app/account/offers/page.tsx` — server component; table of all offers for the session user:
  - Columns: product thumbnail + title, offered price, asking price, status badge, submitted date
  - ACCEPTED rows show a "Purchase Now →" link to `/checkout?offerToken=[token]` with a 48-hour countdown (`tokenExpiresAt` displayed)
  - Empty state: "No offers yet — browse our shop and make an offer on any listing!"
- [x] Add "Offers" link to `src/components/account/AccountSidebar.tsx` (between Orders and Addresses)

### Phase 9.01 Verification

- [x] Submit offer below 70% → confirm 400 response with correct minimum amount shown in UI — **verified by code**: `POST /api/offers` computes `minimum = ceil(price * 0.70 * 100) / 100`, returns 400 `{ error: "Offer too low", minimum }`; `OfferModal` catches the 400 and renders the minimum in the error message
- [ ] Submit valid offer (≥ 70%) → confirm admin notification email received + customer confirmation email received; check `Offer` row in DB with status PENDING — **code verified** (Offer created with status PENDING, both emails sent via Resend); **email receipt requires manual test**
- [x] Try to submit a second offer on the same product while one is PENDING → confirm 409 and "Offer Pending" disabled button in UI — **verified by code**: `POST /api/offers` queries for existing PENDING offer and returns 409; `MakeOfferButton` fetches status on mount and sets `hasPendingOffer = true` which disables button and changes label to "Offer Pending"
- [ ] Admin accepts offer → confirm customer acceptance email with working checkout link; offer status = ACCEPTED in DB — **code verified** (`PATCH /api/admin/offers/[id]/accept` sets status ACCEPTED, generates 32-byte hex token, sets 48h expiry, sends acceptance email with `/checkout?offerToken=[token]` link); **email receipt + link requires manual test**
- [ ] Admin declines offer with a note → confirm customer decline email includes the note; offer status = DECLINED in DB — **code verified** (`PATCH /api/admin/offers/[id]/decline` sets DECLINED, saves adminNote, includes note in email body); **email receipt requires manual test**
- [ ] Navigate to accepted offer checkout link → confirm "Offer Price Applied" banner; complete purchase with Stripe test card → confirm Offer status = PURCHASED in DB — **code verified** (CheckoutForm validates token on mount, renders green banner; create-intent re-validates server-side and uses offer price; webhook sets PURCHASED inside fulfillment transaction); **end-to-end requires manual test**
- [x] Attempt to use the same offer checkout link a second time → confirm 400 / expired error — **verified by code**: `GET /api/offers/token/[token]` checks `status !== "ACCEPTED"` and returns 400 `"This offer has already been purchased"` when status is PURCHASED; CheckoutForm shows the error banner
- [x] Manually set `tokenExpiresAt` to the past in DB → confirm checkout shows "expired" error — **verified by code**: both token route and create-intent check `tokenExpiresAt < new Date()` and return 400 `"This offer link has expired"`; CheckoutForm renders the error page
- [x] Run `GET /api/cron/expire-offers` with correct `Authorization` header → confirm PENDING/ACCEPTED offers past their thresholds flip to EXPIRED; confirm 401 without header — **verified by code**: route checks `auth !== \`Bearer ${cronSecret}\``and returns 401;`updateMany` correctly targets PENDING (createdAt < 72h ago) and ACCEPTED (tokenExpiresAt < now); **actual DB flip requires manual test with live data**

---

## Phase 9.02 — Customer Messaging System

_Goal: Allow customers (logged-in or guest) to send messages to the admin. Messages are stored in the database for inbox history and trigger an instant email notification to the admin. Admin replies directly from their email client — no in-app reply system needed._

**Architecture notes (and why this approach):**

- **Hybrid DB + email** is the right fit for a single-admin small business:
  - DB storage → full inbox history in the admin dashboard; status tracking (Unread/Read/Resolved)
  - Email notification → instant alert without having to check the dashboard
  - Admin replies via regular email (Reply-To header set to customer's email) — zero extra UI needed
  - Customer gets an auto-confirmation email so they know their message was received
- If in-app replies are ever needed later, the `CustomerMessage` model can be extended with a `MessageReply` relation without changing the core structure
- Guests can message without an account (name + email collected in form); logged-in users have name/email pre-filled

### Schema Migration

Add the following to `prisma/schema.prisma`:

```
enum MessageStatus {
  UNREAD
  READ
  RESOLVED
}

model CustomerMessage {
  id        String        @id @default(uuid())
  userId    String?
  user      User?         @relation(fields: [userId], references: [id])
  name      String
  email     String
  subject   String
  body      String        @db.Text
  productId String?
  product   Product?      @relation(fields: [productId], references: [id])
  status    MessageStatus @default(UNREAD)
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt

  @@index([status])
  @@index([userId])
}
```

~~Run `npx prisma db push`. Add `messages` relation to `User` and `Product` models.~~ ✅ Done

### Task 9.02.1 — Contact Page & Form

- [x] `src/app/contact/page.tsx` — server component; `getServerSession(authOptions)` to pass `user` (name + email) to `<ContactForm>` for pre-fill; renders page title + `<ContactForm>`
- [x] `src/components/contact/ContactForm.tsx` — "use client"; fields:
  - **Name** — required, max 100 chars; pre-filled + readonly if logged in
  - **Email** — required, valid email; pre-filled + readonly if logged in
  - **Subject** — `<select>`: General Question | Order Issue | Product Inquiry | Other
  - **Message** — textarea; required; min 10 chars, max 2000 chars; character counter shown
  - **Honeypot** — hidden input `name="website"` (must be empty; bots fill it); checked server-side
  - **Cloudflare Turnstile** for guest users (use `NEXT_PUBLIC_TURNSTILE_SITE_KEY` env var); not shown if logged in
  - Submit button with loading state
  - Success state: "Message sent! We'll reply to [email] within 1–2 business days."
  - Error states: field-level inline errors; generic "Something went wrong" for 500s
- [x] Add `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` to `.env.local.example` (already present)
- [x] Add "Contact" link in `src/components/layout/Footer.tsx` (currently a placeholder)
- [x] Add `contact` to `API_PATTERN` regex and `src/proxy.ts` matcher (already present)

### Task 9.02.2 — Product-Specific "Ask a Question"

- [x] On `src/app/product/[slug]/page.tsx`: add an "Ask a Question" text link below the Make-an-Offer and Add-to-Cart buttons
- [x] Link to `/contact?productId=[product.id]&productName=[encodeURIComponent(product.title)]`
- [x] In `ContactForm`: read `productId` and `productName` query params on mount; if present, show a read-only "About: [Product Name]" chip above the form and pre-select "Product Inquiry" in the Subject dropdown; pass `productId` in the API body

### Task 9.02.3 — Contact API Route

- [x] `POST /api/contact` — Zod schema:
  - `name` (1–100 chars), `email` (valid email), `subject` (one of the 4 allowed values), `body` (10–2000 chars), `productId` (optional UUID), `turnstileToken` (optional string — required for guests)
  - **Honeypot check:** if `website` field is non-empty → silently return `{ ok: true }` (don't create message; don't alert bot)
  - **Turnstile validation** for guests: POST to `https://challenges.cloudflare.com/turnstile/v0/siteverify` with `TURNSTILE_SECRET_KEY`; reject if invalid
  - **Rate limit:** 3 submissions per IP per hour; 10 per email per day
  - If `productId` provided: verify product exists in DB (`isActive: true`); 400 if not found
  - Create `CustomerMessage` in DB (status `UNREAD`; set `userId` from session if logged in; `productId` if valid)
  - Send admin notification email via Resend to `EMAIL_FROM`:
    - Subject: `[New Message] [subject] — from [name]`
    - Body: sender name, email, subject, message body, product link (if any)
    - **`Reply-To` header set to customer's email** — admin hits Reply in Gmail and it goes straight to the customer
  - Send customer auto-reply email: "Thanks [name]! We received your message and will respond within 1–2 business days. Your message: [body excerpt]"
  - Returns `{ ok: true }`

### Task 9.02.4 — Admin Messages Inbox

- [x] Add "Messages" link to `src/components/admin/AdminSidebar.tsx` with an unread count badge (red circle, number); placed after Analytics
- [x] `src/app/admin/messages/page.tsx` — server component; paginated table (20/page):
  - Columns: sender name + email, subject, product link (if any), received date, status badge (UNREAD=red, READ=gray, RESOLVED=green)
  - Filter: `?status=UNREAD|READ|RESOLVED` — default shows UNREAD first
  - UNREAD rows shown in bold
  - Clicking a row navigates to message detail
- [x] `src/app/admin/messages/[id]/page.tsx` — server component:
  - Fetches message by ID; 404 if not found; ADMIN check
  - **Auto-marks as READ** if status was UNREAD (Prisma update on page load)
  - Displays: sender name, email, subject, date, product link (if any), full message body
  - **"Reply via email" button**: `<a href="mailto:[email]?subject=Re: [subject]">` — opens admin's mail client with recipient + subject pre-filled; no JS needed
  - **Status buttons**: "Mark as Resolved" (if READ) / "Reopen" (if RESOLVED) — client component `<MessageStatusButton>` calling `PATCH /api/admin/messages/[id]/status`
  - **Delete button**: calls `DELETE /api/admin/messages/[id]`; redirects to `/admin/messages` on success; `window.confirm` prompt before submitting
- [x] `src/components/admin/messages/MessageStatusButton.tsx` — "use client"; `useTransition` + `router.refresh()`
- [x] `PATCH /api/admin/messages/[id]/status` — ADMIN only; body: `{ status: 'READ' | 'RESOLVED' | 'UNREAD' }`; Zod validated; updates status; logs action; returns `{ status }`
- [x] `GET /api/admin/messages/unread-count` — ADMIN only; returns `{ count: number }` (count of UNREAD messages); used for sidebar badge
- [x] `AdminSidebar.tsx`: add `useEffect` + `setInterval` (60s) to poll `GET /api/admin/messages/unread-count` and update the badge count in state; initial fetch on mount
- [x] `DELETE /api/admin/messages/[id]` — ADMIN only; hard delete; logs action; returns 204

### Phase 9.02 Verification

- [ ] Submit contact form as a **guest** → confirm admin notification email received with correct Reply-To header (reply to it and confirm it goes to the customer's address); confirm customer auto-reply received; check DB row with status UNREAD
- [ ] Submit contact form as a **logged-in user** → confirm name + email were pre-filled and readonly; confirm `userId` is set on the DB row
- [ ] Click "Ask a Question" on a product page → confirm contact form pre-fills product name + selects "Product Inquiry"; confirm `productId` is linked on the DB row
- [ ] Submit form with message body < 10 chars → confirm 400 validation error shown inline
- [ ] Submit 4 messages within an hour from same IP → confirm 4th returns 429 rate-limit error
- [ ] Honeypot: submit form with `website` field filled → confirm silently returns `{ ok: true }` but NO message is created in DB and NO email sent
- [ ] Admin opens message detail → confirm status auto-changes to READ; confirm READ badge in table
- [ ] Admin clicks "Mark as Resolved" → confirm status = RESOLVED in DB and badge updates
- [ ] Unread count badge in sidebar: submit a new message → confirm count increments; open message → confirm count drops; mark all as resolved → confirm count = 0
- [ ] "Reply via email" button → confirm `mailto:` link has correct `to` and `subject` pre-filled
- [ ] Admin deletes a message → confirm row removed from table; confirm 204 returned

---

## Phase 9.03 — eBay Reviews Integration & Storefront Quick Access

_Goal: Pull Casa Cards & Collectibles' real eBay buyer feedback into the website to build buyer trust, and give visitors a fast, prominent path back to the eBay store for customers who prefer shopping there. This should take the place of the shop by sport section on the home page below the featured section._

**Architecture notes:**

- eBay exposes seller feedback via the **Feedback API** (`GET /sell/feedback/v1/feedback_summary`) and the **Trading API** (`GetFeedback` call) — use whichever endpoint is accessible with the existing OAuth token; map results to a lightweight `EbayReview` DB model so the site never makes a live eBay call on page load
- Reviews are read-only (we never write back to eBay); the sync is one-way: eBay → DB
- A scheduled Vercel Cron syncs reviews daily (new feedback only); admin can also trigger a manual sync from the eBay Sync admin page
- eBay seller stats (positive percentage, total feedback count) are stored as a small JSON blob in a `EbaySellerStats` singleton row — refreshed on every review sync
- The eBay store quick-access section lives on the homepage and in the footer; it is a static Next.js server component — no client JS needed

### Schema Migration

Add the following to `prisma/schema.prisma`:

```
model EbayReview {
  id           String   @id @default(uuid())
  ebayFeedbackId String @unique          -- eBay's native feedback ID (prevents duplicates)
  rating       Int                       -- 1 (negative) | 0 (neutral) | 1 (positive); stored as -1/0/1
  comment      String?  @db.Text
  reviewerName String?                   -- buyer username (eBay username, not PII)
  itemTitle    String?                   -- title of the purchased eBay listing
  itemId       String?                   -- eBay itemId (for cross-linking to product page if synced)
  transactionDate DateTime?
  createdAt    DateTime @default(now())

  @@index([rating])
  @@index([transactionDate])
}

model EbaySellerStats {
  id                String   @id @default("singleton")
  positiveFeedbackPercent Decimal @db.Decimal(5, 2)
  totalFeedbackCount Int
  positiveFeedbackCount Int
  negativeFeedbackCount Int
  neutralFeedbackCount  Int
  updatedAt         DateTime @updatedAt
}
```

Run `npx prisma db push`.

### Task 9.03.1 — eBay Review Sync Service ✅

- [x] `src/lib/ebay/reviews.ts` — review sync module:
  - `fetchEbayFeedback()` — calls the eBay Trading API (AuthnAuth) with XML; paginates through all feedback pages (200 per page); maps each record to the `EbayReview` schema fields
  - `syncEbayReviews()` — upserts reviews by `ebayFeedbackId` (idempotent; existing reviews are never overwritten); computes and upserts the `EbaySellerStats` singleton; returns `{ created, skipped, total }` summary
  - All errors are caught per-item; a single bad record does not abort the full sync

- [x] `GET /api/cron/ebay-reviews` — protected by `Authorization: Bearer CRON_SECRET`; calls `syncEbayReviews()`; added to `vercel.json` cron: `{ "path": "/api/cron/ebay-reviews", "schedule": "0 6 * * *" }` (6 AM UTC daily)

- [x] Add "Sync eBay Reviews" button to `src/app/admin/ebay-sync/page.tsx`:
  - `POST /api/admin/ebay-reviews/sync` — ADMIN only; calls `syncEbayReviews()`; returns `{ created, skipped, total }`; logs action via `logAdminAction`
  - Button shows live counts on success with created/skipped/total breakdown

### Task 9.03.2 — Reviews Display Components ✅

- [x] `src/components/reviews/EbayReviewCard.tsx` — displays a single eBay review:
  - Star row: 5 filled stars (positive), 3 filled (neutral), 1 filled (negative)
  - Reviewer username masked to first 3 chars + `***` (e.g. `cas***`)
  - Comment body truncated to 200 chars with "Read more" expand toggle
  - Item title (if present) shown as a 1-line clipped subtitle
  - Transaction date formatted as "Month YYYY"

- [x] `src/components/reviews/EbayReviewsCarousel.tsx` — "use client" carousel:
  - Accepts `reviews` and `sellerStats` as props (data fetched server-side in page.tsx)
  - Shows **3 cards per page** in a responsive grid (1 col mobile → 2 col sm → 3 col lg)
  - Auto-advances every 6 seconds; pauses on hover
  - Left/right arrow controls; dot indicators (one per page of 3)
  - Seller stats bar above: ⭐ X% positive feedback · Y eBay ratings
  - "View all N reviews on eBay ↗" link below dots → `https://www.ebay.com/usr/casa_cards_and_collectibles?_tab=feedback`

- [x] `src/components/reviews/EbaySellerBadge.tsx` — compact trust badge server component:
  - Reads `EbaySellerStats` singleton from DB; derives positive % from counts if stored value is 0
  - Renders eBay colour logo, positive feedback %, total count
  - Links to `https://www.ebay.com/usr/casa_cards_and_collectibles`

- [x] `GET /api/reviews/ebay` — public, no auth required:
  - Query params: `limit` (1–50, default 20), `rating` (integer 1/0/-1), `page` (offset-based)
  - Returns paginated `EbayReview` records + `sellerStats` with derived `positivePct`

### Task 9.03.3 — Homepage eBay Reviews Section ✅

- [x] Updated `src/app/page.tsx` — **replaced the "Shop by Sport" section** with the eBay reviews section (removed `getSports()`, sport icons, and sport grid):

  **Section A — "What Our Customers Say"**
  - `<EbayReviewsCarousel />` with server-fetched data passed as props
  - Fetches up to 30 quality reviews: filters out eBay's auto-generated "Order delivered on time with no issues" text (DB-level `NOT contains` insensitive) and drops comments under 20 chars
  - `positivePct` derived from stored counts when the DB value is 0
  - Only rendered when reviews exist (graceful no-op before first sync)

  **Section B — "Also Find Us on eBay" banner**
  - Inline eBay colour logo + "Shop on eBay ↗" button
  - Links to `https://www.ebay.com/usr/casa_cards_and_collectibles`
  - "View all N reviews on eBay" link inside carousel pointing to the feedback tab

### Task 9.03.4 — Product Page eBay Cross-Link Enhancement ✅

- [x] `src/app/product/[slug]/page.tsx` — replaced bare text link with a styled pill badge:
  - Inline eBay colour logo + "Also available on eBay" label + external link icon
  - Rounded pill with border, subtle shadow, hover lift effect
  - Only rendered when `product.ebayItemId` is set (logic unchanged)
  - No tooltip — intentionally omitted to keep purchase focus on the website

### Task 9.03.5 — Header & Footer eBay Quick Access ✅

- [x] `src/components/layout/Header.tsx` — added eBay store pill link on desktop (hidden on mobile); eBay colour logo + "↗"; sits between existing nav icons and the contact icon

- [x] `src/components/layout/Footer.tsx`:
  - "Visit eBay Store ↗" link with eBay colour logo and external icon added to brand column
  - "Customer Reviews" internal link added to Shop links column (points to `/reviews`)
  - Note: `<EbaySellerBadge />` omitted from footer — Footer is a client component; live stats are surfaced on the `/reviews` page instead

### Task 9.03.6 — Dedicated Reviews Page ✅

- [x] `src/app/reviews/page.tsx` — server component with full pagination (`?page=N`) and rating filter (`?rating=1/0/-1`):
  - Page header: "Customer Reviews" with eBay store subtitle
  - Stats summary card: large positive % score, 5-star row, total rating count, horizontal breakdown bars (Positive / Neutral / Negative)
  - Filter tabs: All / Positive / Neutral / Negative — link-based (no JS required)
  - 3-column responsive grid of `<EbayReviewCard>` components (20 per page)
  - Pagination: Previous / Page X of Y / Next links
  - CTA banner: "Bought from us? Leave Feedback on eBay" → `https://www.ebay.com/usr/casa_cards_and_collectibles?_tab=feedback`
  - `generateMetadata` — dynamic title + description with live positive % and total count from DB
- [x] "Customer Reviews" link added to Footer Shop column (Task 9.03.5)

### Phase 9.03 Verification

- [x] Run `POST /api/admin/ebay-reviews/sync` → 215 reviews imported; `EbaySellerStats` singleton created ✅
- [x] Homepage carousel renders with real reviews; "Also Find Us on eBay" section visible with correct store URL ✅
- [x] 3-cards-per-page layout confirmed; auto-advance, arrows, dots all working ✅
- [x] Generic "Order delivered on time with no issues" reviews filtered out ✅
- [x] Positive feedback % displays correctly (derived from counts — 100%) ✅
- [x] "View all N reviews on eBay ↗" links to correct feedback tab URL ✅
- [x] Load a product page where `ebayItemId` is set → styled pill renders with eBay colour logo and external link ✅
- [x] Load a product page where `ebayItemId` is null → eBay pill not rendered ✅
- [ ] Navigate to `/reviews` → confirm full review grid, rating breakdown, pagination (Task 9.03.6)
- [ ] Confirm `GET /api/reviews/ebay?limit=5` returns 5 reviews; `limit=999` capped at 50
- [ ] Confirm cron `GET /api/cron/ebay-reviews` returns 401 without correct `Authorization: Bearer CRON_SECRET`
- [x] Header: eBay pill link visible on desktop, hidden on mobile ✅
- [x] Footer: "Visit eBay Store" link in brand column; "Customer Reviews" in Shop column ✅
- [x] `/reviews` page renders review grid, rating breakdown bars, pagination, and CTA banner ✅

---

## Phase 9.0 — Email System & Marketing

_Goal: Automated transactional emails and opt-in marketing._

### Task 9.1 — Transactional Emails (ALL REQUIRED)

- [x] Order Confirmation — sent immediately after successful payment capture (`src/app/api/checkout/capture-paypal-order/route.ts` + `src/app/api/webhooks/paypal/route.ts` as backup)
- [x] Shipping Notification — sent when admin adds tracking number (`src/app/api/admin/orders/[orderNumber]/tracking/route.ts`)
- [x] Delivery Confirmation — skipped (no carrier webhooks available)
- [x] Password Reset — one-time link via `/api/auth/reset-password` (`sendPasswordResetEmail`)
- [x] Email Verification — sent on registration (`sendVerificationEmail`)
- [x] Review Request — cron at 10:00 UTC daily (`/api/cron/review-request`); targets DELIVERED orders 7+ days old with no prior request; stamps `reviewRequestSentAt`; links to eBay feedback page
- [x] Abandoned Cart Recovery — email captured on blur of checkout email field → `POST /api/cart/abandon`; cron runs hourly (`/api/cron/abandoned-cart`); opt-in only (checks `EmailSubscriber` table); skips if order placed since abandonment

### Task 9.2 — Email Design

> ⚠️ **Missing before this task can be fully complete:** Physical business mailing address for CAN-SPAM compliance footer. Add to `BUSINESS_ADDRESS` env var before deploying email redesign to production.

- [x] Create branded HTML email templates — black header, red accent bar, white body, gray footer; all customer-facing emails use shared `emailHtml()` wrapper
- [ ] Test on Gmail, Outlook, Apple Mail (manual — use Litmus or send test emails)
- [x] All emails include: physical address footer (pulled from `BUSINESS_ADDRESS` env var — add before launch), unsubscribe link on marketing emails (`/api/unsubscribe` route + `/unsubscribe` confirmation page)
- [x] Plain-text fallback (`text` field) on every email

### Task 9.3 — Newsletter & Marketing Emails

- [x] Newsletter signup form in footer (`Footer.tsx`) and homepage popup (`NewsletterPopup.tsx`)
- [x] Pop-up (`NewsletterPopup.tsx`) — appears after 10s delay; dismissible; stores state in localStorage so it only shows once per visitor
- [x] Double opt-in — subscribe route sends a confirmation email; subscriber only marked `isActive` after clicking `/api/newsletter/confirm?token=...`; confirmation page at `/newsletter/confirmed`
- [x] Unsubscribe flow — `/api/unsubscribe` + `/unsubscribe` page (built in Task 9.2); link included in all marketing emails
- [x] Admin newsletter compose/send page (`/admin/newsletter`) — subject, optional image (URL or file upload via Cloudinary), plain-text body, subscriber count, "Send test to me" button, two-step confirm for "Send to All Subscribers"
- [x] Newsletter send API (`/api/admin/newsletter/send`) — test mode, image block support, batched sending (50/batch), `noSubscribers` warning when no confirmed subs
- [ ] Integrate with Resend Audiences or Mailchimp (optional — current DB approach is sufficient at this scale)

### Phase 9.0 Verification

- [ ] Complete test purchase — confirm order confirmation email received within 2 minutes
- [ ] Test password reset email — confirm link works and expires after 60 minutes
- [ ] Subscribe to newsletter with a new email — confirm double opt-in email received
- [ ] Unsubscribe → confirm removed from list

---

## Phase 10 — SEO, Performance & Compliance

_Goal: Maximize discoverability, ensure fast load times, and meet all legal requirements._

**Prerequisites:**

- Phase 5 (storefront) complete — slugs, `generateMetadata`, Open Graph, and JSON-LD are already in place on product/category pages ✅
- Phase 9.0 email system complete ✅
- Stripe account and domain must be production-ready before Task 10.6

**Architecture notes:**

- Use Next.js App Router conventions: `app/sitemap.ts` and `app/robots.ts` for auto-generated sitemap and robots.txt (no extra packages needed)
- GA4 was intentionally deferred from Phase 8 — wire it here with consent gating (Task 10.5)
- Cloudinary for eBay image proxying is an optional optimization — eBay CDN (`i.ebayimg.com`) is already allowed in `next.config.ts`; skip unless Lighthouse flags image performance as a bottleneck
- Legal pages should be created as static Next.js server components at `app/privacy/page.tsx`, `app/terms/page.tsx`, `app/returns/page.tsx`, `app/shipping/page.tsx` — no DB needed; update content manually when policies change

### Task 10.1 — SEO Foundations

- [x] Clean, keyword-rich URLs via slugs — done (Phase 5)
- [x] Open Graph tags on product pages — done (Phase 5.3 `generateMetadata`)
- [x] JSON-LD structured data on product pages (Product, BreadcrumbList) — done (Phase 5.3)
- [x] `generateMetadata` on product pages (`/product/[slug]`) and category pages (`/category/[slug]`) — done (Phase 5.3, 5.5)
- [x] Add `generateMetadata` to remaining pages:
  - [x] `src/app/page.tsx` (homepage) — keyword-rich title + OG tags added
  - [x] `src/app/shop/page.tsx` — title: "Shop Sports Cards & Collectibles" + full description
  - [x] `src/app/search/page.tsx` — converted to dynamic `generateMetadata`; includes query in title; `noindex` (search results pages should not be indexed)
  - [x] `src/app/reviews/page.tsx` — already had excellent dynamic `generateMetadata` with live positive % and total count (Phase 9.03.6)
  - [x] `src/app/contact/page.tsx` — title already existed; added missing `description`
  - [x] All auth pages (login, register, forgot-password, reset-password, error) — `src/app/auth/layout.tsx` created with `robots: { index: false, follow: false }` covering all 5 auth pages
  - [x] `src/app/account/layout.tsx` — `robots: { index: false, follow: false }` added; covers all account sub-pages
- [x] `app/sitemap.ts` — Next.js built-in sitemap; queries all `isActive: true` products and all categories; static pages (home, shop, reviews, contact) included; excludes admin/api/account/auth routes; build-verified at `/sitemap.xml`
- [x] `app/robots.ts` — Next.js built-in robots.txt; `Allow: /`; `Disallow: /admin /api /account /auth`; sitemap URL included; build-verified at `/robots.txt`
- [ ] Submit sitemap to Google Search Console (manual step — go to [search.google.com/search-console](https://search.google.com/search-console)); add `https://<yourdomain>/sitemap.xml`; also submit to Bing Webmaster Tools
- [ ] `hreflang` — defer until multilingual support is needed (not applicable now)

### Task 10.2 — Performance

- [x] `next/image` used throughout — verified in all key components (ProductCard, ImageGallery, CartDrawer, Header, admin ProductsTable); all have correct `sizes` props and `priority` where appropriate
- [x] Vercel Edge Network CDN for static assets — automatic, no action needed
- [x] ISR on homepage (`src/app/page.tsx`) — `export const revalidate = 3600` added; build confirms `○ / 1h 1y` (statically generated, revalidates hourly); works because homepage has no dynamic functions (no cookies/session). _Note:_ Product pages intentionally stay dynamic — `getServerSession()` reads cookies which opts the route into per-request rendering; adding `revalidate` there would have no effect on Prisma queries and could cause stale wishlist/offer state per user. Comment added to product page explaining the decision.
- [x] Plain `<img>` tag in `src/app/account/offers/page.tsx` replaced with `next/image` (`fill`, `sizes="64px"`, proper `alt` text)
- [ ] Run Lighthouse on homepage and a product page — target 90+ in all 4 categories; fix any specific issues flagged; do this on the production/staging URL (not localhost) for accurate results
- [ ] Core Web Vitals targets: LCP < 2.5s, CLS < 0.1, INP < 200ms — verify via Lighthouse or PageSpeed Insights after deploy
- [ ] _Optional (skip unless Lighthouse flags it):_ Proxy eBay images through Cloudinary — eBay CDN is already fast; only needed if LCP is image-driven on product pages

### Task 10.3 — Mobile-First Design

- [x] Mobile navigation: hamburger + slide-out drawer — confirmed (`MobileNav.tsx`, Phase 5.0)
- [x] Responsive layout on `/shop`, `/search`, `/product/[slug]`, `/category/[slug]` — confirmed in Phase 5
- [x] Code audit of all remaining pages (375px viewport analysis):
  - [x] `/checkout` — `grid grid-cols-1 lg:grid-cols-3`; form full-width on mobile, sidebar stacks below; all inputs `w-full`; step labels `hidden sm:block`; all buttons `py-3` (44px+) ✓
  - [x] `/account/*` — sidebar is horizontal scrollable tab bar on mobile (`overflow-x-auto lg:hidden`); layout `lg:flex` stacks correctly; **Fixed:** `account/page.tsx` and `account/orders/page.tsx` table wrappers changed from `overflow-hidden` → `overflow-x-auto` (were clipping `min-w-full` multi-column tables on narrow viewports)
  - [x] `/admin/*` — sidebar collapses to horizontal scrollable top bar (`lg:hidden`); all admin data tables confirmed `overflow-x-auto`; messages and offers tables use `w-full` + `hidden sm:table-cell` column hiding ✓; **Fixed:** `AdminSidebar.tsx` mobile nav tap targets increased from `py-1.5` (~28px) → `py-2.5` (meets WCAG 44px minimum)
  - [x] `/contact` — all fields `w-full`, submit `w-full py-3`, `max-w-2xl px-4` container ✓
  - [x] `/reviews` — `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` confirmed; stats `flex-col sm:flex-row` ✓
- [x] Interactive tap targets ≥ 44×44px — audited across all pages; form buttons use `py-3` (44px+); admin mobile nav fixed (above); cart qty controls are compact but functional
- [ ] Test on a real iPhone (iOS Safari) and Android Chrome — checkout, cart drawer, account pages (manual, requires deployed device)

### Task 10.4 — Legal Pages (REQUIRED before launch)

- [x] `src/app/privacy/page.tsx` — Privacy Policy: all data collected, 7 third-party services with links (Stripe, Resend, Supabase, Vercel, eBay API, GA4, Cloudflare Turnstile), cookies section, data retention (7yr orders / until deletion for accounts), GDPR rights (access, rectification, erasure, portability, restriction), CCPA rights (know, delete, no-sale), data security, children's privacy; `generateMetadata` with description; build-verified `○ /privacy`
- [x] `src/app/terms/page.tsx` — Terms & Conditions: 15 sections covering acceptance, lawful use, account responsibility, product condition grading, pricing, all-sales-final policy with SNAD exception (7-day window), payment via Stripe, shipping, Make-an-Offer binding terms, IP, disclaimer of warranties, limitation of liability (capped at order amount), governing law (Pennsylvania / Allegheny County), changes; build-verified `○ /terms`
- [x] `src/app/returns/page.tsx` — Return & Refund Policy: all sales final; exception for items significantly not as described or damaged in transit (7-day window, photos required, refund at discretion); 5–10 business day refund timeline; eBay purchases covered by eBay Money Back Guarantee; build-verified `○ /returns`
- [x] `src/app/shipping/page.tsx` — Shipping Policy: US only; 1–2 business day processing; USPS First Class $4.99 (5–7 days) / Priority $9.99 (2–3 days) / Free over $75 (Priority); packaging detail (penny sleeve + top loader); tracking info; lost package process; address accuracy responsibility; build-verified `○ /shipping`
- [x] Footer already links to all 4 pages (confirmed from codebase — `/privacy`, `/terms`, `/returns`, `/shipping` were already in footer nav columns)
- [x] **Fixed domain inconsistencies:** `product/[slug]/page.tsx` fallback changed from `casacards.com` → `casa-cards.com`; `checkout/success/page.tsx` hardcoded `support@casacards.com` → `orders@casa-cards.com`
- [x] "By creating an account you agree to our Terms & Conditions and Privacy Policy" consent line added below the submit button on `/auth/register`

### Task 10.5 — GDPR / CCPA Compliance & GA4

> Data deletion for logged-in users was implemented in Phase 7 (`DELETE /api/account`). This task covers cookie consent, GA4 wiring, and the remaining compliance items.

- [x] **Cookie consent banner** — built custom component (no external package):
  - Show on first visit to all users; persist decision in `localStorage` (key: `cc_cookie_consent`)
  - Two actions: "Accept All" and "Essential Only"
  - Strictly Necessary cookies: always on (session, auth) — no opt-in needed
  - Analytics cookies: only set/load GA4 after user accepts
  - Do NOT show the banner again after the user has made a choice
  - Links to Privacy Policy in the banner
  - Component: `src/components/CookieConsent.tsx` — "use client"; rendered inside `src/app/layout.tsx`
  - Footer "Cookie Preferences" button clears consent and re-opens banner via `cc_show_banner` DOM event

- [x] **GA4 setup** (deferred from Phase 8):
  - Add `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX` to `.env.local` and Vercel production env vars
  - Created `src/components/GoogleAnalytics.tsx` — only loads GA4 script when consent === "all"; uses `next/script` with `strategy="afterInteractive"`; `anonymize_ip: true`
  - Added `<GoogleAnalytics />` to `src/app/layout.tsx`
  - Added Google domains to `script-src` and `connect-src` in `next.config.ts` CSP

- [x] **Consent-gated analytics** — GA4 does NOT fire when user chose "Essential Only"; component listens for `cc_consent_update` DOM event to react to live consent changes without page reload

- [x] **Data deletion for guests** — Privacy Policy section instructs guests to email `orders@casa-cards.com` to request order data deletion

- [x] **Data retention** — Privacy Policy documents 7-year retention for order records (tax purposes), account data until deletion requested

- [x] **Cookie Policy** — folded into Privacy Policy "Cookies" section; lists strictly necessary vs. analytics cookies; explains opt-out via footer "Cookie Preferences" link

### Task 10.6 — Sales Tax

- [ ] Determine nexus states (states where you are required to collect sales tax)
- [ ] Sign up for **TaxJar** (taxjar.com) — recommended for automated sales tax calculation
- [ ] Add `TAXJAR_API_KEY` to Vercel environment variables
- [ ] Integrate TaxJar into `POST /api/checkout/create-paypal-order` — call TaxJar API with order address + line items to get tax amount; include it in the PayPal order `amount.breakdown.tax_total`
- [ ] Update `Order` model: confirm `taxAmount` field exists (it does from Phase 2 schema); store the calculated tax on the Order record
- [ ] Update order confirmation email and admin order detail page to show tax line item
- [ ] _Note:_ Sales tax nexus rules vary by state. Consult a tax professional to determine your obligations before enabling.

### ✅ Phase 10 Verification

**Code-verified (confirmed in source):**

- [x] `/robots.txt` — `Disallow: /admin`, `/api`, `/account`, `/auth` all present; `Sitemap:` URL correct (`robots.ts`)
- [x] `/sitemap.xml` — queries active products + categories from DB; static pages (home, shop, reviews, contact, privacy, terms, returns, shipping) all included; no admin/api URLs (legal pages added during verification pass)
- [x] `generateMetadata` — unique title + description on: homepage, /shop, /search (dynamic with query), /contact, /reviews (dynamic with live feedback stats), /product/[slug] (dynamic), /category/[slug] (dynamic), all 4 legal pages
- [x] Auth pages noindex — `src/app/auth/layout.tsx` applies `robots: { index: false, follow: false }` to all auth routes; `/auth/error` has its own explicit noindex
- [x] Account pages noindex — `src/app/account/layout.tsx` applies `robots: { index: false, follow: false }` to all account routes
- [x] Checkout pages noindex — `/checkout` and `/checkout/success` marked `robots: { index: false }` (added during verification pass)
- [x] Search page noindex — `robots: { index: false, follow: false }` in `generateMetadata`
- [x] All 4 legal pages exist as static `○` routes (`/privacy`, `/terms`, `/returns`, `/shipping`) and are linked in footer
- [x] Cookie consent banner — custom `CookieConsent.tsx`; localStorage key `cc_cookie_consent`; two-button (Accept All / Essential Only); re-openable via footer "Cookie Preferences" link; correct event wiring (`cc_consent_update`, `cc_show_banner`)
- [x] GA4 consent-gating — `GoogleAnalytics.tsx` only loads scripts when consent === "all"; listens to `cc_consent_update` for live changes; `anonymize_ip: true`
- [x] CSP updated — Google domains added to `script-src` and `connect-src` in `next.config.ts`
- [x] Homepage ISR — `export const revalidate = 3600` on `app/page.tsx` (no dynamic functions on this route)
- [x] Admin sidebar tap targets — mobile nav `py-1.5` → `py-2.5` (≥44px height)
- [x] Account/orders table — `overflow-hidden` → `overflow-x-auto` on both account tables
- [x] `next/image` — all `<img>` tags replaced; `offers/page.tsx` uses `fill` + `sizes="64px"`

**Requires browser / production environment:**

- [x] Run Lighthouse on homepage (`/`) and a product page — all 4 scores ≥ 90; screenshot and save results
- [ ] Run Lighthouse on `/shop` — no significant regressions
- [x] Cookie consent banner: on first visit confirm banner appears; "Essential Only" → GA4 script NOT in DOM; "Accept All" → GA4 loads; revisit → banner does NOT reappear
- [ ] GA4 Realtime report: accept cookies → navigate pages → confirm active user appears in GA4 dashboard (requires `NEXT_PUBLIC_GA_MEASUREMENT_ID` set in production)
- [ ] Tax test (Stripe test mode): on hold — Task 10.6 deferred
- [ ] Test on real iPhone (iOS Safari) and Android Chrome: homepage, /shop, /product/[slug], /checkout — no layout breakage, tap targets usable
- [ ] Sitemap submitted to Google Search Console (manual)

---

## Phase 11 — Social, Cross-Platform Integration & Launch Polish

_Goal: Expand reach through social selling and marketplace connectors; complete remaining pre-launch polish items._

### Task 11.0 — Favicon & Web App Icons ✅

- [x] Generated full favicon set from `public/image.png` using `sharp`:
  - `public/favicon-16x16.png` and `public/favicon-32x32.png`
  - `public/apple-touch-icon.png` — 180×180 PNG
  - `public/android-chrome-192x192.png` and `public/android-chrome-512x512.png`
  - `src/app/icon.png` — 32×32; auto-detected by Next.js App Router (generates `<link rel="icon">`)
  - `src/app/apple-icon.png` — 180×180; auto-detected (generates `<link rel="apple-touch-icon">`)
- [x] Created `public/site.webmanifest` with name, short_name, icons (192+512), theme_color, background_color, display
- [x] Updated `src/app/layout.tsx` metadata — added `manifest: "/site.webmanifest"` and `theme-color: "#000000"`
- [x] Build confirmed: `○ /icon.png` appears in build output — Next.js serving icon correctly
- [ ] Verify in browser: tab shows Casa Cards logo; iOS "Add to Home Screen" shows branded icon; no generic grey globe

### Task 11.1 — Social Share Buttons on Product Pages ✅

- [x] Created `src/components/products/ShareButtons.tsx` — "use client" component; accepts `title`, `url`, `imageUrl` props
- [x] Pinterest — pre-fills image + description; opens in new tab; `rel="noopener noreferrer"`
- [x] Facebook — share link; opens in new tab
- [x] X / Twitter — pre-fills title + URL; opens in new tab
- [x] Native Share — `navigator.share()` inside `try/catch`; button only rendered when `"share" in navigator` (mobile); silent on cancel
- [x] All icons inline SVG — no external library; zero tracking pixels
- [x] Wired into `src/app/product/[slug]/page.tsx` — renders at bottom of product info column, above related products
- [x] Build confirmed clean

### Task 11.2 — 404 & 500 Branded Error Pages ✅

- [x] `src/app/not-found.tsx` — branded 404: logo, large ghost "404", "Page Not Found" h1, friendly message, "Browse All Products" (red) + "Go Home" (outline) CTAs; `robots: noindex`
- [x] `src/app/error.tsx` — `"use client"` runtime error boundary: same logo + layout, "Something Went Wrong" h1, "Try Again" button (`reset()`), "Return to Shop" link; no error details exposed to user
- [x] `src/app/global-error.tsx` — root-level error boundary: own `<html>/<body>` shell with inline styles (no layout dependency); "Try Again" + "Return to Shop" in red/outline buttons
- [x] Build confirmed clean
- [ ] Verify in browser: `/nonexistent-page` → branded 404 renders correctly

### Task 11.3 — Google Shopping Feed ✅

- [x] `src/app/feeds/google.xml/route.ts` — public `GET` handler; no auth; queries all `isActive: true` products with a primary image
- [x] All required Google Merchant Center fields: `g:id`, `g:title`, `g:description` (HTML stripped, 5000 char max), `g:link`, `g:image_link`, `g:price` (USD), `g:availability`, `g:condition` (NEW→new / LIKE_NEW→used / USED→used / REFURBISHED→refurbished), `g:brand`, `g:identifier_exists: no`
- [x] Products without an image are skipped (Google requires `image_link`)
- [x] `Content-Type: application/xml; charset=utf-8` + `Cache-Control: public, max-age=3600, stale-while-revalidate=600`
- [x] All text fields XML-escaped (`&`, `<`, `>`, `"`, `'`)
- [x] `/feeds/google.xml` is already crawler-accessible — `robots.ts` uses `allow: "/"` broadly; not blocked by any disallow rule
- [x] Build confirmed: `ƒ /feeds/google.xml` in build output
- [ ] _Manual step:_ Submit `https://casa-cards.com/feeds/google.xml` to Google Merchant Center after the site is live

### Task 11.4 — Facebook & Instagram Shopping Feed (Optional) [THIS WILL BE DONE AFTER PRODCUTION AS ONE OF THE FINAL STEPS]

> _Requires an active Facebook Business Manager account and catalog approval from Meta. Only pursue once the site is live._

- [ ] `src/app/feeds/facebook.xml/route.ts` — `GET` handler, same structure as Google feed:
  - Meta Product Catalog required fields: `id`, `title`, `description`, `availability`, `condition`, `price`, `link`, `image_link`, `brand`
  - `availability`: `in stock` / `out of stock`
  - `condition`: `new` / `used` (same mapping as Google feed)
- [ ] _Manual step:_ Submit feed URL in Facebook Business Manager → Catalogs → Add items → Use data feed

### Task 11.5 — eBay Cross-Promotion ✅ (Completed in Phase 9.03)

> _This task was fully completed as part of Phase 9.03:_
>
> - Product page "Also available on eBay" styled pill badge — Task 9.03.4 ✅
> - Header desktop eBay pill link — Task 9.03.5 ✅
> - Footer "Visit eBay Store ↗" link with eBay colour logo — Task 9.03.5 ✅
>
> _No further action needed._

### ✅ Phase 11 Verification

**Code-verified (confirmed in source):**

- [x] `src/app/icon.png` + `src/app/apple-icon.png` — auto-detected by Next.js; `○ /icon.png` in build output
- [x] `public/site.webmanifest` — wired via `manifest: "/site.webmanifest"` in `layout.tsx` metadata
- [x] `src/app/not-found.tsx` — branded 404; noindex; "Browse All Products" (red) + "Go Home" CTAs
- [x] `src/app/error.tsx` — `"use client"` runtime error boundary; `reset()` wired; no error detail exposed
- [x] `src/app/global-error.tsx` — own `<html>/<body>` shell with inline styles; safe even if root layout crashes
- [x] `src/components/products/ShareButtons.tsx` — Pinterest / Facebook / X links + hydration-safe native share button (`useEffect` + state); inline SVGs; no third-party scripts
- [x] `src/app/feeds/google.xml/route.ts` — all required Merchant Center fields; XML-escaped; products without images skipped; `Cache-Control: public, max-age=3600`
- [x] Build clean across all tasks

**Requires browser / deployed environment:**

- [ ] **Favicon:** browser tab shows Casa Cards logo; `site.webmanifest` loads at `/site.webmanifest` with correct JSON
- [ ] **404:** navigate to `/this-page-does-not-exist` → branded page renders with CTAs
- [ ] **500:** trigger a runtime error in dev → branded error page with "Try Again" renders
- [ ] **Share buttons:** on a product page, click Pinterest → new tab opens pre-filled with product image + title; X opens with title + URL
- [ ] **Google Shopping feed:** load `/feeds/google.xml` → valid XML; validate at [Merchant Center feed validator](https://merchants.google.com) after site is live
- [ ] **Open Graph:** paste a product URL into [opengraph.xyz](https://opengraph.xyz) → title, description, image all populate

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
- **Monthly:** Rotate API keys and secrets (eBay, PayPal client secret)
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

# PayPal — get Live credentials from developer.paypal.com → Apps & Credentials
NEXT_PUBLIC_PAYPAL_CLIENT_ID=<PayPal Live Client ID>
PAYPAL_CLIENT_SECRET=<PayPal Live Client Secret>
PAYPAL_WEBHOOK_ID=<from PayPal dashboard → Webhooks → your Live webhook ID>

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

# Tax (TaxJar — optional)
TAXJAR_API_KEY=<...>
```

---

## 🚀 What's Left To Do (as of 2026-03-24)

### 🔴 Must-Do Before Going Live (Blockers)

**Payments**

- [x] Create a PayPal Business account (or confirm existing one) at paypal.com/business
- [x] Create a Live app at developer.paypal.com → Apps & Credentials → Create App (select Live)
- [x] Add `NEXT_PUBLIC_PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` (Live) to Vercel environment variables
- [x] Register the Live PayPal webhook at developer.paypal.com → your Live app → Webhooks: URL `https://casa-cards.com/api/webhooks/paypal`, events: `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.REVERSED`
- [x] Copy the Webhook ID into Vercel as `PAYPAL_WEBHOOK_ID`
- [ ] Complete PayPal identity verification and connect a bank account for payouts (in PayPal Business settings)

**Hosting & Environment** ✅

- [x] Point domain DNS to Vercel (`A` / `CNAME` records); confirm SSL certificate is active
- [x] Set every production env var in Vercel dashboard:
  - [x]`NEXTAUTH_URL=https://casa-cards.com`
  - [x]`NEXT_PUBLIC_SITE_URL=https://casa-cards.com`
  - [x]`NEXTAUTH_SECRET` (64-char random string)
  - [x]`DATABASE_URL` (Supabase production connection string)
  - [x]`EBAY_CLIENT_ID` + `EBAY_CLIENT_SECRET` + `EBAY_SYNC_SECRET`
  - [ ]`NEXT_PUBLIC_PAYPAL_CLIENT_ID` (live) + `PAYPAL_CLIENT_SECRET` (live) + `PAYPAL_WEBHOOK_ID` (live)
  - [x]`RESEND_API_KEY` + `EMAIL_FROM=orders@casa-cards.com` + `BUSINESS_ADDRESS` (physical address for CAN-SPAM)
  - [x]`CRON_SECRET` (all 4 cron jobs return 401 and never run without this)
  - [x]`NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX` (activates GA4)
  - [x]`NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` (contact form bot protection)

**Email**

- [ ] Verify sending domain in Resend — add SPF, DKIM, DMARC DNS records for `casa-cards.com`
- [ ] Add physical business mailing address to `BUSINESS_ADDRESS` env var (CAN-SPAM requirement)
- [ ] Send a test email from production to confirm deliverability and branding

**Admin & Security**

- [x] Create the production admin account: register with real email → set `role = 'ADMIN'` directly in Supabase
- [ ] Disable or secure the bootstrap admin endpoint (`/api/admin/bootstrap`) — confirm it requires `ADMIN_BOOTSTRAP_SECRET`
- [ ] Run `npm audit` — resolve any high/critical vulnerabilities before launch

**eBay**

- [x] Add `EBAY_CLIENT_ID` + `EBAY_CLIENT_SECRET` to production env vars; run a full eBay sync from `/admin/ebay-sync` and verify products appear
- [x] Confirm eBay RuName callback URL is set to `https://casa-cards.com/api/ebay/callback` in the eBay developer portal

**Legal**

- [x] Privacy Policy — `/privacy` ✅
- [x] Terms & Conditions — `/terms` ✅
- [x] Return & Refund Policy — `/returns` ✅
- [x] Shipping Policy — `/shipping` ✅

### 🟡 Do Soon After Launch (High Priority)

**SEO & Discovery**

- [ ] Verify Google Search Console property (DNS TXT record or file upload)
- [ ] Submit `https://casa-cards.com/sitemap.xml` to Google Search Console and Bing Webmaster Tools
- [ ] Submit Google Shopping feed `https://casa-cards.com/feeds/google.xml` to Google Merchant Center

**Lighthouse Fixes**

- [ ] Re-run Lighthouse on homepage — fix accessibility score (currently 89; likely contrast or carousel label issue)
- [ ] Re-run Lighthouse on a product page — fix SEO score (currently 92; likely meta description uniqueness)

**Manual Verification**

- [ ] Verify browser tab shows Casa Cards favicon (not grey globe)
- [ ] Test 404: navigate to `/this-page-does-not-exist` — branded page renders
- [ ] Test share buttons on a product page: Pinterest pre-fills image + title; X pre-fills title + URL
- [ ] Complete a real end-to-end test order in production — confirm PayPal charge, webhook, order confirmation email, and admin dashboard all work

### 🟢 Optional / Post-Launch

- [ ] **Facebook & Instagram Shopping feed** (Task 11.4) — build `src/app/feeds/facebook.xml/route.ts` once Meta Business Manager account is active
- [ ] **GA4 live verification** — once `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set, confirm real user appears in GA4 Realtime report
- [ ] **Core Web Vitals** — verify CLS, LCP, INP pass green in Google Search Console after indexing
- [ ] **Sales Tax** — integrate TaxJar (Task 10.6) if sales tax collection is required in your nexus states
- [ ] **Guest checkout** — manual test: complete order without logging in → look up at `/orders/lookup`
- [ ] **Real device testing** — iPhone (iOS Safari) + Android Chrome: checkout, cart drawer, account pages
- [ ] **Cross-browser testing** — Chrome, Firefox, Safari, Edge (latest)

---

_Document prepared for: Claude Code_
_Project: Casa Cards & Collectibles E-Commerce Website_
_Last updated: 2026-03-24 — Phases 1–11 complete. Phase 12 (QA/Launch) is next._
_Security Level: Maximum — verify every phase before proceeding to the next._
