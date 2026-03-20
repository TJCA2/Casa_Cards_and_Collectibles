import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OrderStatusBadge from "@/components/account/OrderStatusBadge";
import CustomerActions from "@/components/admin/customers/CustomerActions";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params) {
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id }, select: { name: true, email: true } });
  return { title: `${user?.name ?? user?.email ?? "Customer"} — Admin` };
}

export default async function AdminCustomerDetailPage({ params }: Params) {
  const { id } = await params;

  const [customer, session] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
            _count: { select: { items: true } },
          },
        },
        addresses: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            line1: true,
            line2: true,
            city: true,
            state: true,
            zip: true,
            isDefault: true,
          },
        },
      },
    }),
    getServerSession(authOptions),
  ]);

  if (!customer) notFound();

  const totalSpent = customer.orders
    .filter((o) => !["CANCELLED", "REFUNDED"].includes(o.status))
    .reduce((sum, o) => sum + Number(o.totalAmount), 0);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link href="/admin/customers" className="text-sm text-gray-400 hover:text-gray-600">
          ← Customers
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="max-w-md truncate text-2xl font-bold text-gray-900">
          {customer.name ?? customer.email}
        </h1>
        {customer.banned && (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
            Banned
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: orders + addresses */}
        <div className="space-y-6 lg:col-span-2">
          {/* Order History */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              Orders ({customer.orders.length})
            </h2>
            {customer.orders.length === 0 ? (
              <p className="text-sm text-gray-400">No orders yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead>
                    <tr>
                      <th className="pb-2 text-left font-semibold text-gray-600">Order</th>
                      <th className="pb-2 text-left font-semibold text-gray-600">Date</th>
                      <th className="pb-2 text-left font-semibold text-gray-600">Status</th>
                      <th className="pb-2 text-right font-semibold text-gray-600">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {customer.orders.map((order) => (
                      <tr key={order.id}>
                        <td className="py-2">
                          <Link
                            href={`/admin/orders/${order.orderNumber}`}
                            className="font-medium text-red-600 hover:text-red-700"
                          >
                            {order.orderNumber}
                          </Link>
                          <div className="text-xs text-gray-400">
                            {order._count.items} item{order._count.items !== 1 ? "s" : ""}
                          </div>
                        </td>
                        <td className="py-2 text-gray-500 whitespace-nowrap">
                          {order.createdAt.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-2">
                          <OrderStatusBadge status={order.status} />
                        </td>
                        <td className="py-2 text-right font-medium text-gray-900">
                          ${Number(order.totalAmount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="pt-3 text-sm font-semibold text-gray-700">
                        Total spent (excl. cancelled/refunded)
                      </td>
                      <td className="pt-3 text-right font-bold text-gray-900">
                        ${totalSpent.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>

          {/* Saved Addresses */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              Saved Addresses ({customer.addresses.length})
            </h2>
            {customer.addresses.length === 0 ? (
              <p className="text-sm text-gray-400">No saved addresses.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {customer.addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="rounded-lg border border-gray-200 p-3 text-sm text-gray-700"
                  >
                    {addr.isDefault && (
                      <span className="mb-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        Default
                      </span>
                    )}
                    <p className="font-medium">{addr.name}</p>
                    <p>{addr.line1}</p>
                    {addr.line2 && <p>{addr.line2}</p>}
                    <p>
                      {addr.city}, {addr.state} {addr.zip}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right: profile card + actions */}
        <div className="space-y-6">
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">Profile</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-500">Name</dt>
                <dd className="font-medium text-gray-900">{customer.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Email</dt>
                <dd className="font-medium text-gray-900">{customer.email}</dd>
              </div>
              {customer.phone && (
                <div>
                  <dt className="text-gray-500">Phone</dt>
                  <dd className="font-medium text-gray-900">{customer.phone}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500">Joined</dt>
                <dd className="font-medium text-gray-900">
                  {customer.createdAt.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Email verified</dt>
                <dd className="font-medium">
                  {customer.emailVerified ? (
                    <span className="text-green-600">Yes</span>
                  ) : (
                    <span className="text-yellow-600">No</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Account status</dt>
                <dd className="font-medium">
                  {customer.banned ? (
                    <span className="text-red-600">Banned</span>
                  ) : (
                    <span className="text-green-600">Active</span>
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">Actions</h2>
            <CustomerActions
              customerId={customer.id}
              currentAdminId={session?.user?.id ?? ""}
              emailVerified={customer.emailVerified}
              banned={customer.banned}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
