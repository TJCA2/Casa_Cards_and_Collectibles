import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import type { Address } from "@prisma/client";
import OrderStatusBadge from "@/components/account/OrderStatusBadge";
import OrderStatusUpdater from "@/components/admin/orders/OrderStatusUpdater";
import TrackingForm from "@/components/admin/orders/TrackingForm";
import RefundPanel from "@/components/admin/orders/RefundPanel";
import OrderNotes from "@/components/admin/orders/OrderNotes";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ orderNumber: string }> };

export async function generateMetadata({ params }: Params) {
  const { orderNumber } = await params;
  return { title: `Order ${orderNumber} — Admin` };
}

export default async function AdminOrderDetailPage({ params }: Params) {
  const { orderNumber } = await params;

  const order = await prisma.order.findUnique({
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
      billingAddress: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  if (!order) notFound();

  const customerName = order.user?.name ?? "Guest";
  const customerEmail = order.user?.email ?? order.customerEmail ?? "—";
  const totalAmount = Number(order.totalAmount);
  const isStripe = order.paymentProvider === "STRIPE";
  const refundableStatuses = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"];
  const canRefund = isStripe && refundableStatuses.includes(order.status);

  function formatAddr(a: Address) {
    return [a.name, a.line1, a.line2, `${a.city}, ${a.state} ${a.zip}`, a.country]
      .filter(Boolean)
      .join(", ");
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link href="/admin/orders" className="text-sm text-gray-400 hover:text-gray-600">
          ← Orders
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">{orderNumber}</h1>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: items + totals */}
        <div className="space-y-6 lg:col-span-2">
          {/* Order Items */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              Items ({order.items.length})
            </h2>
            <div className="divide-y divide-gray-100">
              {order.items.map((item) => {
                const imageUrl = item.product.images[0]?.url ?? null;
                return (
                  <div key={item.id} className="flex items-center gap-4 py-3">
                    <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={item.product.title}
                          width={56}
                          height={56}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <svg
                            className="h-6 w-6 text-gray-300"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-900">{item.product.title}</p>
                      <p className="text-sm text-gray-500">
                        ${Number(item.unitPrice).toFixed(2)} × {item.quantity}
                      </p>
                    </div>
                    <p className="font-medium text-gray-900">
                      ${Number(item.totalPrice).toFixed(2)}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div className="mt-4 border-t border-gray-100 pt-4 space-y-1 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>${Number(order.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>
                  {Number(order.shippingCost) === 0
                    ? "Free"
                    : `$${Number(order.shippingCost).toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>${Number(order.taxAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold text-gray-900">
                <span>Total</span>
                <span>${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </section>

          {/* Status & Timeline */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">Status Management</h2>
            <div className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <p className="text-gray-500">Ordered</p>
                <p className="font-medium">
                  {order.createdAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Shipped</p>
                <p className="font-medium">
                  {order.shippedAt
                    ? order.shippedAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Delivered</p>
                <p className="font-medium">
                  {order.deliveredAt
                    ? order.deliveredAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Provider</p>
                <p className="font-medium">
                  {order.paymentProvider === "STRIPE" ? "Stripe" : "PayPal"}
                </p>
              </div>
            </div>
            <OrderStatusUpdater orderNumber={orderNumber} currentStatus={order.status} />
          </section>

          {/* Tracking */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">Tracking Number</h2>
            <TrackingForm
              orderNumber={orderNumber}
              initialTracking={order.trackingNumber ?? null}
            />
          </section>

          {/* Refund — only shown for Stripe + refundable status */}
          {canRefund && (
            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-1 text-base font-semibold text-gray-900">Issue Refund</h2>
              <p className="mb-4 text-sm text-gray-500">Refund will be processed via Stripe.</p>
              <RefundPanel orderNumber={orderNumber} totalAmount={totalAmount} />
            </section>
          )}

          {/* Internal Notes */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-base font-semibold text-gray-900">Internal Notes</h2>
            <p className="mb-4 text-sm text-gray-500">Not visible to customers.</p>
            <OrderNotes orderNumber={orderNumber} initialNotes={order.notes ?? null} />
          </section>
        </div>

        {/* Right column: customer + addresses */}
        <div className="space-y-6">
          {/* Customer */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">Customer</h2>
            <div className="space-y-1 text-sm">
              <p className="font-medium text-gray-900">{customerName}</p>
              <p className="text-gray-500">{customerEmail}</p>
              {order.user && (
                <Link
                  href={`/admin/customers/${order.user.id}`}
                  className="inline-block mt-1 text-xs text-red-600 hover:text-red-700"
                >
                  View customer →
                </Link>
              )}
            </div>
          </section>

          {/* Shipping Address */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-gray-900">Shipping Address</h2>
            <p className="text-sm text-gray-600 whitespace-pre-line">
              {[
                order.shippingAddress.name,
                order.shippingAddress.line1,
                order.shippingAddress.line2,
                `${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zip}`,
              ]
                .filter(Boolean)
                .join("\n")}
            </p>
          </section>

          {/* Billing Address */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-gray-900">Billing Address</h2>
            <p className="text-sm text-gray-600 whitespace-pre-line">
              {[
                order.billingAddress.name,
                order.billingAddress.line1,
                order.billingAddress.line2,
                `${order.billingAddress.city}, ${order.billingAddress.state} ${order.billingAddress.zip}`,
              ]
                .filter(Boolean)
                .join("\n")}
            </p>
            {formatAddr(order.shippingAddress) === formatAddr(order.billingAddress) && (
              <p className="mt-1 text-xs text-gray-400">Same as shipping</p>
            )}
          </section>

          {/* Payment */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-gray-900">Payment</h2>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Method</span>
                <span className="font-medium">
                  {order.paymentProvider === "STRIPE" ? "Stripe" : "PayPal"}
                </span>
              </div>
              {order.paymentIntentId && (
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500 flex-shrink-0">Intent ID</span>
                  <span className="font-mono text-xs text-gray-700 truncate">
                    {order.paymentIntentId}
                  </span>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
