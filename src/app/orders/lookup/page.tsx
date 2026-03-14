"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";

interface OrderItem {
  title: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface OrderDetails {
  orderNumber: string;
  status: string;
  createdAt: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  shippingAddress: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
  };
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  PAID: { label: "Paid", color: "bg-blue-100 text-blue-800" },
  PROCESSING: { label: "Processing", color: "bg-blue-100 text-blue-800" },
  SHIPPED: { label: "Shipped", color: "bg-purple-100 text-purple-800" },
  DELIVERED: { label: "Delivered", color: "bg-green-100 text-green-800" },
  CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-800" },
};

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default function OrderLookupPage() {
  const [email, setEmail] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDetails | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOrder(null);

    const trimmedEmail = email.trim();
    const trimmedOrder = orderNumber.trim().toUpperCase();

    if (!trimmedEmail || !trimmedOrder) {
      setError("Please enter both your email and order number.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/orders/${encodeURIComponent(trimmedOrder)}?email=${encodeURIComponent(trimmedEmail)}`,
      );
      if (res.status === 404) {
        setError("No order found with that order number.");
        return;
      }
      if (res.status === 403) {
        setError("The email address doesn't match that order. Please check and try again.");
        return;
      }
      if (!res.ok) {
        setError("Something went wrong. Please try again.");
        return;
      }
      const data: OrderDetails = await res.json();
      setOrder(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const statusInfo = order
    ? (STATUS_LABELS[order.status] ?? { label: order.status, color: "bg-gray-100 text-gray-800" })
    : null;

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Look Up Your Order</h1>
      <p className="mb-8 text-sm text-gray-600">
        Enter the email address you used at checkout and your order number to see your order status.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>

        <div>
          <label htmlFor="orderNumber" className="mb-1 block text-sm font-medium text-gray-700">
            Order Number
          </label>
          <input
            id="orderNumber"
            type="text"
            required
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="CC-20260314-XXXX"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {loading ? "Looking up…" : "Find Order"}
        </button>
      </form>

      {order && statusInfo && (
        <div className="mt-10 space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4">
            <div>
              <p className="text-xs text-gray-500">Order Number</p>
              <p className="font-mono font-semibold text-gray-900">{order.orderNumber}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>

          {/* Items */}
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="font-semibold text-gray-900">Items</h2>
            </div>
            <ul className="divide-y divide-gray-100">
              {order.items.map((item, i) => (
                <li key={i} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span className="text-gray-800">
                    {item.title}
                    {item.quantity > 1 && (
                      <span className="ml-1 text-gray-500">× {item.quantity}</span>
                    )}
                  </span>
                  <span className="font-medium text-gray-900">{fmt(item.totalPrice)}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-gray-100 px-5 py-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{fmt(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>{order.shippingCost === 0 ? "Free" : fmt(order.shippingCost)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2 font-semibold text-gray-900">
                <span>Total</span>
                <span>{fmt(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Shipping address */}
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
            <h2 className="mb-2 font-semibold text-gray-900">Shipping To</h2>
            <address className="not-italic text-sm text-gray-600 leading-relaxed">
              <p className="font-medium text-gray-800">{order.shippingAddress.name}</p>
              <p>{order.shippingAddress.line1}</p>
              {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                {order.shippingAddress.zip}
              </p>
            </address>
          </div>

          {/* Create account prompt */}
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-4">
            <p className="text-sm font-semibold text-blue-900">
              Never lose track of an order again
            </p>
            <p className="mt-1 text-sm text-blue-700">
              Create a free account to view all your orders in one place.
            </p>
            <Link
              href="/register"
              className="mt-3 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Create Account
            </Link>
          </div>
        </div>
      )}

      <p className="mt-8 text-center text-sm text-gray-500">
        Have an account?{" "}
        <Link href="/login" className="text-red-600 hover:underline">
          Sign in
        </Link>{" "}
        to see your full order history.
      </p>
    </div>
  );
}
