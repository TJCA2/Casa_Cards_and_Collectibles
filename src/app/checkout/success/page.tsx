import Link from "next/link";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Order Confirmed" };

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default async function SuccessPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const orderNumber = Array.isArray(params.order) ? params.order[0] : (params.order ?? null);

  const session = await getServerSession(authOptions);

  // Fetch full order details if we have an order number
  const order = orderNumber
    ? await prisma.order.findUnique({
        where: { orderNumber },
        include: {
          items: {
            include: {
              product: {
                select: {
                  title: true,
                  slug: true,
                  images: { select: { url: true }, orderBy: { sortOrder: "asc" }, take: 1 },
                },
              },
            },
          },
          shippingAddress: true,
        },
      })
    : null;

  // Security: only show details to the order owner or the guest who placed it
  // (we don't have the guest email here, so we show details if userId matches OR no userId — guest order)
  const canShowDetails = order && (order.userId === null || order.userId === session?.user?.id);

  const isGuest = !session;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      {/* Header */}
      <div className="mb-10 flex flex-col items-center text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-10 w-10 text-green-600"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Order Confirmed!</h1>
        {orderNumber && (
          <p className="mt-1 text-sm text-gray-500">
            Order <span className="font-bold text-gray-900">{orderNumber}</span>
          </p>
        )}
        <p className="mt-3 text-sm text-gray-600">
          A confirmation email has been sent to you. We&apos;ll notify you once your order ships.
        </p>
      </div>

      {canShowDetails && (
        <div className="space-y-6">
          {/* Items */}
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="font-semibold text-gray-900">Items Ordered</h2>
            </div>
            <ul className="divide-y divide-gray-100">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-4 px-5 py-4">
                  {item.product.images[0]?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.product.images[0].url}
                      alt={item.product.title}
                      className="h-14 w-14 flex-shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-14 w-14 flex-shrink-0 rounded-lg bg-gray-100" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {item.product.title}
                    </p>
                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {fmt(parseFloat(item.totalPrice.toString()))}
                  </p>
                </li>
              ))}
            </ul>

            {/* Totals */}
            <div className="border-t border-gray-100 px-5 py-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{fmt(parseFloat(order.subtotal.toString()))}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>
                  {parseFloat(order.shippingCost.toString()) === 0
                    ? "Free"
                    : fmt(parseFloat(order.shippingCost.toString()))}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2 font-semibold text-gray-900">
                <span>Total</span>
                <span>{fmt(parseFloat(order.totalAmount.toString()))}</span>
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
              <p>US</p>
            </address>
          </div>

          {/* Guest account prompt */}
          {isGuest && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-4">
              <h2 className="font-semibold text-blue-900">Track your order faster</h2>
              <p className="mt-1 text-sm text-blue-700">
                Create a free account to view your order history and track shipments in one place.
              </p>
              <div className="mt-3 flex gap-3">
                <Link
                  href="/register"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Create Account
                </Link>
                <Link
                  href="/orders/lookup"
                  className="rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:border-blue-300"
                >
                  Look Up Order
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/shop"
          className="rounded-lg bg-red-600 px-6 py-3 text-center text-sm font-semibold text-white hover:bg-red-700"
        >
          Continue Shopping
        </Link>
        <Link
          href="/"
          className="rounded-lg border border-gray-200 px-6 py-3 text-center text-sm font-semibold text-gray-700 hover:border-gray-300"
        >
          Back to Home
        </Link>
      </div>

      <p className="mt-6 text-xs text-gray-400">
        Questions about your order?{" "}
        <a href="mailto:support@casacards.com" className="underline">
          Contact us
        </a>
        .
      </p>
    </div>
  );
}
