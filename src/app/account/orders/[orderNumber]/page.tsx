import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTrackingUrl } from "@/lib/tracking";
import OrderStatusBadge from "@/components/account/OrderStatusBadge";
import ReorderButton from "@/components/account/ReorderButton";
import { OrderStatus } from "@prisma/client";

type Params = Promise<{ orderNumber: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { orderNumber } = await params;
  return { title: `Order ${orderNumber}` };
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

// Timeline steps for normal order flow (CANCELLED / REFUNDED break out separately)
const TIMELINE_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "PENDING", label: "Order Placed" },
  { status: "PAID", label: "Payment Confirmed" },
  { status: "PROCESSING", label: "Processing" },
  { status: "SHIPPED", label: "Shipped" },
  { status: "DELIVERED", label: "Delivered" },
];

const STATUS_ORDER: Record<OrderStatus, number> = {
  PENDING: 0,
  PAID: 1,
  PROCESSING: 2,
  SHIPPED: 3,
  DELIVERED: 4,
  CANCELLED: -1,
  REFUNDED: -1,
};

export default async function OrderDetailPage({ params }: { params: Params }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login?callbackUrl=/account/orders");

  const { orderNumber } = await params;

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              slug: true,
              title: true,
              condition: true,
              stockQuantity: true,
              price: true,
              images: { select: { url: true }, orderBy: { sortOrder: "asc" }, take: 1 },
            },
          },
        },
      },
      shippingAddress: true,
    },
  });

  // 404 if not found or doesn't belong to this user
  if (!order || order.userId !== session.user.id) notFound();

  const currentStep = STATUS_ORDER[order.status];
  const isTerminal = order.status === "CANCELLED" || order.status === "REFUNDED";

  const reorderItems = order.items
    .filter((item) => item.product != null)
    .map((item) => ({
      productId: item.product!.id,
      slug: item.product!.slug ?? "",
      title: item.product!.title,
      price: Number(item.product!.price),
      imageUrl: item.product!.images[0]?.url ?? null,
      condition: item.product!.condition,
      stockQuantity: item.product!.stockQuantity,
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/account/orders"
            className="mb-1 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Order History
          </Link>
          <h2 className="text-xl font-bold text-gray-900">{order.orderNumber}</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Placed{" "}
            {new Date(order.createdAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <OrderStatusBadge status={order.status} />
          <ReorderButton items={reorderItems} />
        </div>
      </div>

      {/* Status timeline */}
      {!isTerminal ? (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-5">
          <div className="relative flex items-start justify-between">
            {/* Connector line behind the dots */}
            <div className="absolute left-0 right-0 top-3.5 h-0.5 bg-gray-200" aria-hidden="true" />
            {TIMELINE_STEPS.map((step, idx) => {
              const done = STATUS_ORDER[step.status] <= currentStep;
              const active = STATUS_ORDER[step.status] === currentStep;
              return (
                <div key={step.status} className="relative flex flex-1 flex-col items-center gap-2">
                  {/* Progress fill left of this dot */}
                  {idx > 0 && done && (
                    <div
                      className="absolute right-1/2 top-3.5 h-0.5 w-full bg-red-500"
                      aria-hidden="true"
                    />
                  )}
                  <div
                    className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors ${
                      done ? "border-red-500 bg-red-500" : "border-gray-300 bg-white"
                    } ${active ? "ring-2 ring-red-200" : ""}`}
                  >
                    {done && (
                      <svg
                        className="h-3.5 w-3.5 text-white"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={3}
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <p
                    className={`text-center text-xs font-medium ${done ? "text-gray-900" : "text-gray-400"}`}
                  >
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-red-100 bg-red-50 px-5 py-4">
          <p className="font-semibold text-red-800">
            This order was {order.status === "CANCELLED" ? "cancelled" : "refunded"}.
          </p>
        </div>
      )}

      {/* Tracking number */}
      {order.trackingNumber && (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
          <h3 className="mb-1 text-sm font-semibold text-gray-900">Tracking</h3>
          <a
            href={getTrackingUrl(order.trackingNumber)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700"
          >
            {order.trackingNumber}
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
      )}

      {/* Items */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="font-semibold text-gray-900">Items</h3>
        </div>
        <ul className="divide-y divide-gray-100">
          {order.items.map((item) => {
            const product = item.product;
            return (
              <li key={item.id} className="flex items-center gap-4 px-5 py-4">
                {product?.images[0]?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.images[0].url}
                    alt={product.title}
                    className="h-14 w-14 flex-shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-14 w-14 flex-shrink-0 rounded-lg bg-gray-100" />
                )}
                <div className="min-w-0 flex-1">
                  {product?.slug ? (
                    <Link
                      href={`/product/${product.slug}`}
                      className="truncate text-sm font-medium text-gray-900 hover:text-red-600"
                    >
                      {product.title}
                    </Link>
                  ) : (
                    <p className="truncate text-sm font-medium text-gray-900">
                      {product?.title ?? item.productTitle}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {fmt(Number(item.totalPrice))}
                  </p>
                  <p className="text-xs text-gray-400">{fmt(Number(item.unitPrice))} each</p>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Totals */}
        <div className="space-y-2 border-t border-gray-100 px-5 py-4 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>{fmt(Number(order.subtotal))}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Shipping</span>
            <span>
              {Number(order.shippingCost) === 0 ? "Free" : fmt(Number(order.shippingCost))}
            </span>
          </div>
          {Number(order.taxAmount) > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Tax</span>
              <span>{fmt(Number(order.taxAmount))}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-100 pt-2 font-semibold text-gray-900">
            <span>Total</span>
            <span>{fmt(Number(order.totalAmount))}</span>
          </div>
        </div>
      </div>

      {/* Shipping address + payment method */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-900">Shipping To</h3>
          <address className="not-italic text-sm leading-relaxed text-gray-600">
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

        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-900">Payment</h3>
          <p className="text-sm text-gray-600">
            {order.paymentProvider === "STRIPE" ? "Credit / Debit Card (Stripe)" : "PayPal"}
          </p>
          {order.shippedAt && (
            <p className="mt-2 text-sm text-gray-500">
              Shipped:{" "}
              {new Date(order.shippedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
          {order.deliveredAt && (
            <p className="text-sm text-gray-500">
              Delivered:{" "}
              {new Date(order.deliveredAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
