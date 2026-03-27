"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useCart } from "@/context/CartContext";

// ── Constants ──────────────────────────────────────────────────────────────────

const STEPS = ["Shipping", "Delivery", "Payment", "Confirmation"] as const;

const FREE_THRESHOLD = parseFloat(process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD ?? "75");

const SHIPPING_OPTIONS = [
  {
    id: "first_class" as const,
    label: "USPS First Class",
    description: "5–7 business days",
    price: 4.99,
  },
  {
    id: "priority" as const,
    label: "USPS Priority Mail",
    description: "1–3 business days",
    price: 9.99,
  },
];

const US_STATES = [
  ["AL", "Alabama"],
  ["AK", "Alaska"],
  ["AZ", "Arizona"],
  ["AR", "Arkansas"],
  ["CA", "California"],
  ["CO", "Colorado"],
  ["CT", "Connecticut"],
  ["DE", "Delaware"],
  ["DC", "District of Columbia"],
  ["FL", "Florida"],
  ["GA", "Georgia"],
  ["HI", "Hawaii"],
  ["ID", "Idaho"],
  ["IL", "Illinois"],
  ["IN", "Indiana"],
  ["IA", "Iowa"],
  ["KS", "Kansas"],
  ["KY", "Kentucky"],
  ["LA", "Louisiana"],
  ["ME", "Maine"],
  ["MD", "Maryland"],
  ["MA", "Massachusetts"],
  ["MI", "Michigan"],
  ["MN", "Minnesota"],
  ["MS", "Mississippi"],
  ["MO", "Missouri"],
  ["MT", "Montana"],
  ["NE", "Nebraska"],
  ["NV", "Nevada"],
  ["NH", "New Hampshire"],
  ["NJ", "New Jersey"],
  ["NM", "New Mexico"],
  ["NY", "New York"],
  ["NC", "North Carolina"],
  ["ND", "North Dakota"],
  ["OH", "Ohio"],
  ["OK", "Oklahoma"],
  ["OR", "Oregon"],
  ["PA", "Pennsylvania"],
  ["RI", "Rhode Island"],
  ["SC", "South Carolina"],
  ["SD", "South Dakota"],
  ["TN", "Tennessee"],
  ["TX", "Texas"],
  ["UT", "Utah"],
  ["VT", "Vermont"],
  ["VA", "Virginia"],
  ["WA", "Washington"],
  ["WV", "West Virginia"],
  ["WI", "Wisconsin"],
  ["WY", "Wyoming"],
] as const;

// ── Types ──────────────────────────────────────────────────────────────────────

export type ShippingMethodId = "first_class" | "priority";

export interface ShippingInfo {
  email: string;
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  saveAddress: boolean;
}

export interface AppliedDiscount {
  code: string;
  type: "PERCENTAGE" | "FIXED";
  amount: number; // dollar amount off
}

const INITIAL_SHIPPING: ShippingInfo = {
  email: "",
  name: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  zip: "",
  country: "US",
  saveAddress: false,
};

interface DefaultAddress {
  name: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  zip: string;
}

interface OfferProductData {
  id: string;
  title: string;
  slug: string | null;
  price: number;
  imageUrl: string | null;
}

interface Props {
  userEmail: string | null;
  isLoggedIn: boolean;
  defaultAddress?: DefaultAddress | null;
  offerToken?: string | null;
}

// ── Step indicator ─────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="mb-8 flex items-center gap-0">
      {STEPS.map((label, i) => {
        const stepNum = i + 1;
        const done = stepNum < current;
        const active = stepNum === current;
        return (
          <li key={label} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition ${
                  done
                    ? "bg-red-600 text-white"
                    : active
                      ? "bg-red-600 text-white ring-4 ring-red-100"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {done ? (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  stepNum
                )}
              </div>
              <span
                className={`hidden text-xs font-medium sm:block ${
                  active ? "text-red-600" : done ? "text-gray-600" : "text-gray-400"
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`mx-2 h-px flex-1 ${done ? "bg-red-600" : "bg-gray-200"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function CheckoutForm({ userEmail, isLoggedIn, defaultAddress, offerToken }: Props) {
  const { cart, itemCount, subtotal: cartSubtotal, clearCart } = useCart();
  const router = useRouter();

  // ── Offer token mode ─────────────────────────────────────────────────────────
  const [offerProduct, setOfferProduct] = useState<OfferProductData | null>(null);
  const [offerPrice, setOfferPrice] = useState<number | null>(null);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [offerLoading, setOfferLoading] = useState(!!offerToken);

  useEffect(() => {
    if (!offerToken) return;
    fetch(`/api/offers/token/${offerToken}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setOfferError(data.error);
        } else {
          setOfferProduct(data.product);
          setOfferPrice(data.offerPrice);
        }
      })
      .catch(() => setOfferError("Could not validate offer link. Please try again."))
      .finally(() => setOfferLoading(false));
  }, [offerToken]);

  const isOfferMode = !!offerToken && !!offerProduct && offerPrice !== null;
  const subtotal = isOfferMode ? offerPrice! : cartSubtotal;
  const effectiveItemCount = isOfferMode ? 1 : itemCount;

  // Step state
  const [step, setStep] = useState(1);

  // Step 1 — shipping address
  const [shipping, setShipping] = useState<ShippingInfo>({
    ...INITIAL_SHIPPING,
    email: userEmail ?? "",
    ...(defaultAddress
      ? {
          name: defaultAddress.name,
          line1: defaultAddress.line1,
          line2: defaultAddress.line2 ?? "",
          city: defaultAddress.city,
          state: defaultAddress.state,
          zip: defaultAddress.zip,
        }
      : {}),
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ShippingInfo, string>>>({});

  // Step 2 — delivery method & discount
  const [shippingMethod, setShippingMethod] = useState<ShippingMethodId | null>(null);
  const [deliveryError, setDeliveryError] = useState("");
  const [discountInput, setDiscountInput] = useState("");
  const [discount, setDiscount] = useState<AppliedDiscount | null>(null);
  const [discountError, setDiscountError] = useState("");
  const [applyingDiscount, setApplyingDiscount] = useState(false);

  // Step 3 — PayPal
  const [paypalError, setPaypalError] = useState("");

  // ── Derived totals ───────────────────────────────────────────────────────────
  const freeShipping = subtotal >= FREE_THRESHOLD;
  const shippingCost = freeShipping
    ? 0
    : shippingMethod === "priority"
      ? 9.99
      : shippingMethod === "first_class"
        ? 4.99
        : 0;
  const discountAmt = discount?.amount ?? 0;
  const TAX_RATE = 0.08;
  const taxAmount = parseFloat((subtotal * TAX_RATE).toFixed(2));
  const orderTotal = Math.max(0, subtotal + shippingCost + taxAmount - discountAmt);

  // ── Offer token loading / error states ──────────────────────────────────────
  if (offerToken && offerLoading) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
        <p className="text-sm text-gray-500">Validating your offer link…</p>
      </div>
    );
  }

  if (offerToken && offerError) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-5 px-4 py-24 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
          <svg
            className="h-7 w-7 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <p className="text-xl font-bold text-gray-900">Offer Link Invalid</p>
        <p className="text-sm text-gray-500">{offerError}</p>
        <Link
          href="/shop"
          className="rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  // ── Empty cart ───────────────────────────────────────────────────────────────
  if (effectiveItemCount === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-5 px-4 py-24 text-center">
        <svg
          className="h-16 w-16 text-gray-200"
          fill="none"
          stroke="currentColor"
          strokeWidth={1}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.6 8H19M7 13L5.4 5M10 21a1 1 0 1 0 2 0m7 0a1 1 0 1 0 2 0"
          />
        </svg>
        <p className="text-xl font-bold text-gray-900">Your cart is empty</p>
        <p className="text-sm text-gray-500">Add some items before checking out.</p>
        <Link
          href="/shop"
          className="rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  // ── Step 1 validation ────────────────────────────────────────────────────────
  function validateShipping(): boolean {
    const errs: Partial<Record<keyof ShippingInfo, string>> = {};
    if (!shipping.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shipping.email)) errs.email = "Enter a valid email";
    if (!shipping.name.trim()) errs.name = "Full name is required";
    if (!shipping.line1.trim()) errs.line1 = "Address is required";
    if (!shipping.city.trim()) errs.city = "City is required";
    if (!shipping.state) errs.state = "State is required";
    if (!shipping.zip.trim()) errs.zip = "ZIP code is required";
    else if (!/^\d{5}$/.test(shipping.zip)) errs.zip = "ZIP must be 5 digits";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function field(key: keyof ShippingInfo) {
    return {
      value: shipping[key] as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setShipping((s) => ({ ...s, [key]: e.target.value })),
    };
  }

  // ── Discount code ────────────────────────────────────────────────────────────
  async function applyDiscount() {
    const code = discountInput.trim().toUpperCase();
    if (!code) return;
    setApplyingDiscount(true);
    setDiscountError("");
    try {
      const res = await fetch("/api/checkout/validate-discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal }),
      });
      const data = (await res.json()) as { error?: string; type?: string; amount?: number };
      if (!res.ok || data.error) {
        setDiscountError(data.error ?? "Invalid discount code");
        setDiscount(null);
      } else {
        setDiscount({
          code,
          type: data.type as "PERCENTAGE" | "FIXED",
          amount: data.amount!,
        });
        setDiscountError("");
      }
    } catch {
      setDiscountError("Could not apply code. Please try again.");
    } finally {
      setApplyingDiscount(false);
    }
  }

  // ── Advance to payment step ──────────────────────────────────────────────────
  function advanceToPayment() {
    if (!shippingMethod) {
      setDeliveryError("Please select a delivery method");
      return;
    }
    setDeliveryError("");
    setPaypalError("");
    setStep(3);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  }

  // ── Layout ───────────────────────────────────────────────────────────────────
  return (
    <PayPalScriptProvider
      options={{
        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
        currency: "USD",
        intent: "capture",
      }}
    >
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Checkout</h1>

        {/* Offer price banner */}
        {isOfferMode && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
            <svg
              className="h-5 w-5 flex-shrink-0 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm font-medium text-green-800">
              Offer Price Applied: <span className="font-bold">${offerPrice!.toFixed(2)}</span> for{" "}
              <span className="font-bold">{offerProduct!.title}</span>
            </p>
          </div>
        )}

        <StepIndicator current={step} />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* ── Left: step content ─────────────────────────────────────────────── */}
          <div className="lg:col-span-2">
            {/* Step 1 — Shipping address */}
            {step === 1 && (
              <div className="rounded-2xl border border-gray-100 p-6">
                <h2 className="mb-5 text-base font-semibold text-gray-900">
                  Contact & Shipping Address
                </h2>
                <div className="space-y-4">
                  {/* Email */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Email address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      autoComplete="email"
                      readOnly={isLoggedIn}
                      placeholder="you@example.com"
                      className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:border-red-400 focus:outline-none ${
                        isLoggedIn ? "bg-gray-50 text-gray-500" : "border-gray-200"
                      } ${errors.email ? "border-red-400" : ""}`}
                      {...field("email")}
                      onBlur={(e) => {
                        const email = e.target.value.trim();
                        if (
                          !email ||
                          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
                          cart.items.length === 0
                        )
                          return;
                        fetch("/api/cart/abandon", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            email,
                            items: cart.items.map((i) => ({
                              productId: i.productId,
                              title: i.title,
                              quantity: i.quantity,
                              price: i.price,
                              imageUrl: i.imageUrl,
                            })),
                            subtotal: cartSubtotal,
                          }),
                        }).catch(() => {});
                      }}
                    />
                    {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                  </div>

                  {/* Full name */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Full name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      autoComplete="name"
                      placeholder="Jane Smith"
                      className={`w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-red-400 focus:outline-none ${errors.name ? "border-red-400" : ""}`}
                      {...field("name")}
                    />
                    {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                  </div>

                  {/* Address line 1 */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      autoComplete="address-line1"
                      placeholder="123 Main St"
                      className={`w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-red-400 focus:outline-none ${errors.line1 ? "border-red-400" : ""}`}
                      {...field("line1")}
                    />
                    {errors.line1 && <p className="mt-1 text-xs text-red-600">{errors.line1}</p>}
                  </div>

                  {/* Address line 2 */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Apartment, suite, etc.{" "}
                      <span className="font-normal text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="text"
                      autoComplete="address-line2"
                      placeholder="Apt 4B"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-red-400 focus:outline-none"
                      {...field("line2")}
                    />
                  </div>

                  {/* City / State / ZIP */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        autoComplete="address-level2"
                        placeholder="New York"
                        className={`w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-red-400 focus:outline-none ${errors.city ? "border-red-400" : ""}`}
                        {...field("city")}
                      />
                      {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city}</p>}
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        State <span className="text-red-500">*</span>
                      </label>
                      <select
                        autoComplete="address-level1"
                        className={`w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-red-400 focus:outline-none ${errors.state ? "border-red-400" : ""}`}
                        value={shipping.state}
                        onChange={(e) => setShipping((s) => ({ ...s, state: e.target.value }))}
                      >
                        <option value="">—</option>
                        {US_STATES.map(([code, name]) => (
                          <option key={code} value={code}>
                            {code} — {name}
                          </option>
                        ))}
                      </select>
                      {errors.state && <p className="mt-1 text-xs text-red-600">{errors.state}</p>}
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        ZIP <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        autoComplete="postal-code"
                        placeholder="10001"
                        maxLength={5}
                        className={`w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-red-400 focus:outline-none ${errors.zip ? "border-red-400" : ""}`}
                        {...field("zip")}
                      />
                      {errors.zip && <p className="mt-1 text-xs text-red-600">{errors.zip}</p>}
                    </div>
                  </div>

                  {/* Country */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Country</label>
                    <input
                      readOnly
                      value="United States"
                      className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm text-gray-500"
                    />
                  </div>

                  {/* Save address */}
                  {isLoggedIn && (
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={shipping.saveAddress}
                        onChange={(e) =>
                          setShipping((s) => ({ ...s, saveAddress: e.target.checked }))
                        }
                        className="h-4 w-4 rounded border-gray-300 accent-red-600"
                      />
                      <span className="text-sm text-gray-700">Save this address to my account</span>
                    </label>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (validateShipping()) setStep(2);
                  }}
                  className="mt-6 w-full rounded-lg bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Continue to Delivery →
                </button>
              </div>
            )}

            {/* Step 2 — Delivery method & discount */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-gray-100 p-6">
                  <h2 className="mb-5 text-base font-semibold text-gray-900">Delivery Method</h2>

                  {freeShipping && (
                    <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                      🎉 Your order qualifies for free shipping!
                    </div>
                  )}

                  <div className="space-y-3">
                    {SHIPPING_OPTIONS.map((opt) => {
                      const effectivePrice = freeShipping ? 0 : opt.price;
                      return (
                        <label
                          key={opt.id}
                          className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition ${
                            shippingMethod === opt.id
                              ? "border-red-600 bg-red-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="shippingMethod"
                              value={opt.id}
                              checked={shippingMethod === opt.id}
                              onChange={() => setShippingMethod(opt.id)}
                              className="accent-red-600"
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                              <p className="text-xs text-gray-500">{opt.description}</p>
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-gray-900">
                            {effectivePrice === 0 ? (
                              <span className="text-green-600">Free</span>
                            ) : (
                              `$${effectivePrice.toFixed(2)}`
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  {deliveryError && <p className="mt-2 text-xs text-red-600">{deliveryError}</p>}
                </div>

                {/* Discount code */}
                <div className="rounded-2xl border border-gray-100 p-6">
                  <h2 className="mb-4 text-base font-semibold text-gray-900">Discount Code</h2>
                  {discount ? (
                    <div className="flex items-center justify-between rounded-lg bg-green-50 px-4 py-3">
                      <span className="text-sm font-medium text-green-700">
                        <span className="font-bold">{discount.code}</span> — −$
                        {discount.amount.toFixed(2)} off
                      </span>
                      <button
                        onClick={() => {
                          setDiscount(null);
                          setDiscountInput("");
                        }}
                        className="text-xs text-gray-400 hover:text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={discountInput}
                        onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") applyDiscount();
                        }}
                        placeholder="Enter code"
                        maxLength={50}
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm uppercase tracking-wide focus:border-red-400 focus:outline-none"
                      />
                      <button
                        onClick={applyDiscount}
                        disabled={applyingDiscount || !discountInput.trim()}
                        className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
                      >
                        {applyingDiscount ? "…" : "Apply"}
                      </button>
                    </div>
                  )}
                  {discountError && <p className="mt-2 text-xs text-red-600">{discountError}</p>}
                </div>

                {/* Navigation */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="rounded-lg border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 hover:border-gray-300"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={advanceToPayment}
                    className="flex-1 rounded-lg bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    Continue to Payment →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3 — PayPal payment */}
            {step === 3 && (
              <div className="scroll-mt-20 space-y-5">
                <div className="rounded-2xl border border-gray-100 p-6">
                  <h2 className="mb-2 text-base font-semibold text-gray-900">Payment</h2>
                  <p className="mb-5 text-sm text-gray-500">
                    Complete your purchase securely via PayPal. You can pay with your PayPal
                    balance, bank account, or any major credit or debit card.
                  </p>

                  <PayPalButtons
                    style={{ layout: "vertical", color: "gold", shape: "rect", label: "pay" }}
                    createOrder={async () => {
                      setPaypalError("");
                      const items = isOfferMode
                        ? [{ productId: offerProduct!.id, quantity: 1 }]
                        : cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity }));

                      const res = await fetch("/api/checkout/create-paypal-order", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          items,
                          shippingInfo: shipping,
                          shippingMethod,
                          ...(discount ? { discountCode: discount.code } : {}),
                          ...(isOfferMode ? { offerToken } : {}),
                        }),
                      });
                      const data = (await res.json()) as {
                        paypalOrderId?: string;
                        error?: string;
                      };
                      if (!res.ok || !data.paypalOrderId) {
                        throw new Error(data.error ?? "Could not create order. Please try again.");
                      }
                      return data.paypalOrderId;
                    }}
                    onApprove={async (data) => {
                      setPaypalError("");
                      const res = await fetch("/api/checkout/capture-paypal-order", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ paypalOrderId: data.orderID }),
                      });
                      const result = (await res.json()) as {
                        orderNumber?: string;
                        error?: string;
                      };
                      if (!res.ok || !result.orderNumber) {
                        setPaypalError(result.error ?? "Payment capture failed. Please try again.");
                        return;
                      }
                      clearCart();
                      router.push(`/checkout/success?order=${result.orderNumber}`);
                    }}
                    onError={(err) => {
                      console.error("[PayPal]", err);
                      setPaypalError("PayPal encountered an error. Please try again.");
                    }}
                    onCancel={() => {
                      setPaypalError("Payment was cancelled. You can try again when ready.");
                    }}
                  />

                  {paypalError && <p className="mt-3 text-sm text-red-600">{paypalError}</p>}
                </div>

                <button
                  onClick={() => {
                    setStep(2);
                    setPaypalError("");
                  }}
                  className="rounded-lg border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 hover:border-gray-300"
                >
                  ← Back
                </button>
              </div>
            )}

            {/* Step 4 stub */}
            {step === 4 && (
              <div className="rounded-2xl border border-gray-100 p-6">
                <p className="text-sm text-gray-400">Confirmation — coming in Task 6.5</p>
              </div>
            )}
          </div>

          {/* ── Right: order summary ───────────────────────────────────────────── */}
          <aside className="rounded-2xl border border-gray-100 p-5 h-fit">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Order Summary
            </h2>
            <ul className="space-y-3">
              {isOfferMode ? (
                <li className="flex items-start justify-between gap-3 text-sm">
                  <span className="line-clamp-2 text-gray-700">
                    {offerProduct!.title} <span className="text-gray-400">× 1</span>
                  </span>
                  <span className="flex-shrink-0 font-medium text-green-700">
                    ${offerPrice!.toFixed(2)}
                  </span>
                </li>
              ) : (
                cart.items.map((item) => (
                  <li
                    key={item.productId}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <span className="line-clamp-2 text-gray-700">
                      {item.title} <span className="text-gray-400">× {item.quantity}</span>
                    </span>
                    <span className="flex-shrink-0 font-medium text-gray-900">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </li>
                ))
              )}
            </ul>

            <div className="mt-4 space-y-1.5 border-t border-gray-100 pt-4 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span className="font-medium text-gray-900">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Shipping</span>
                <span className="font-medium text-gray-900">
                  {shippingMethod ? (
                    freeShipping ? (
                      <span className="text-green-600">Free</span>
                    ) : (
                      `$${shippingCost.toFixed(2)}`
                    )
                  ) : (
                    <span className="text-gray-400 text-xs">Select method</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Tax (8%)</span>
                <span className="font-medium text-gray-900">${taxAmount.toFixed(2)}</span>
              </div>
              {discount && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({discount.code})</span>
                  <span>−${discountAmt.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold text-gray-900">
                <span>Total</span>
                <span>{shippingMethod ? `$${orderTotal.toFixed(2)}` : "—"}</span>
              </div>
            </div>

            {subtotal < FREE_THRESHOLD && (
              <p className="mt-3 text-xs text-gray-400">
                Add ${(FREE_THRESHOLD - subtotal).toFixed(2)} more for free shipping.
              </p>
            )}
          </aside>
        </div>
      </div>
    </PayPalScriptProvider>
  );
}
