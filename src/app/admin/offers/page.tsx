import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { OfferStatus } from "@prisma/client";
import OfferActions from "@/components/admin/offers/OfferActions";

const STATUS_STYLES: Record<OfferStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  ACCEPTED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-700",
  EXPIRED: "bg-gray-100 text-gray-500",
  PURCHASED: "bg-blue-100 text-blue-700",
};

type SearchParams = Promise<{ status?: string; page?: string }>;

export default async function AdminOffersPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const statusFilter = sp.status as OfferStatus | undefined;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const limit = 20;
  const skip = (page - 1) * limit;

  const validStatuses: OfferStatus[] = ["PENDING", "ACCEPTED", "DECLINED", "EXPIRED", "PURCHASED"];
  const where =
    statusFilter && validStatuses.includes(statusFilter) ? { status: statusFilter } : {};

  const [offers, total] = await Promise.all([
    prisma.offer.findMany({
      where,
      orderBy: [
        { status: "asc" }, // ACCEPTED, DECLINED, EXPIRED, PENDING, PURCHASED — PENDING sorts last alphabetically; use createdAt for PENDING-first
        { createdAt: "desc" },
      ],
      skip,
      take: limit,
      include: {
        product: {
          select: {
            id: true,
            title: true,
            slug: true,
            price: true,
            images: { where: { sortOrder: 0 }, take: 1 },
          },
        },
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.offer.count({ where }),
  ]);

  // Sort PENDING to top within the results
  offers.sort((a, b) => {
    if (a.status === "PENDING" && b.status !== "PENDING") return -1;
    if (a.status !== "PENDING" && b.status === "PENDING") return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const pages = Math.ceil(total / limit);

  const filterLinks: { label: string; value?: string }[] = [
    { label: "All" },
    { label: "Pending", value: "PENDING" },
    { label: "Accepted", value: "ACCEPTED" },
    { label: "Declined", value: "DECLINED" },
    { label: "Expired", value: "EXPIRED" },
    { label: "Purchased", value: "PURCHASED" },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Offers</h1>
      </div>

      {/* Status filter tabs */}
      <div className="mb-5 flex flex-wrap gap-2">
        {filterLinks.map((f) => {
          const active = (f.value ?? "") === (statusFilter ?? "");
          const href = f.value ? `/admin/offers?status=${f.value}` : "/admin/offers";
          return (
            <Link
              key={f.label}
              href={href}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                active ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {offers.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center">
          <p className="text-gray-400">No offers found.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Customer
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Offer
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Asking
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  %
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {offers.map((offer) => {
                const askingPrice = parseFloat(offer.product.price.toString());
                const offerPrice = parseFloat(offer.offerPrice.toString());
                const pct = ((offerPrice / askingPrice) * 100).toFixed(1);
                const isPending = offer.status === "PENDING";

                return (
                  <tr
                    key={offer.id}
                    className={
                      isPending ? "bg-yellow-50 hover:bg-yellow-100/60" : "hover:bg-gray-50"
                    }
                  >
                    {/* Product */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {offer.product.images[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={offer.product.images[0].url}
                            alt=""
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-gray-100" />
                        )}
                        <Link
                          href={`/product/${offer.product.slug}`}
                          className="max-w-[200px] truncate font-medium text-gray-900 hover:text-red-600"
                          target="_blank"
                        >
                          {offer.product.title}
                        </Link>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/customers/${offer.user.id}`}
                        className="text-gray-700 hover:text-red-600"
                      >
                        <span className="font-medium">{offer.user.name ?? "—"}</span>
                        <br />
                        <span className="text-xs text-gray-400">{offer.user.email}</span>
                      </Link>
                    </td>

                    {/* Offer price */}
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      ${offerPrice.toFixed(2)}
                    </td>

                    {/* Asking price */}
                    <td className="px-4 py-3 text-right text-gray-500">
                      ${askingPrice.toFixed(2)}
                    </td>

                    {/* Percentage */}
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`text-xs font-semibold ${
                          parseFloat(pct) >= 90
                            ? "text-green-600"
                            : parseFloat(pct) >= 75
                              ? "text-yellow-600"
                              : "text-red-600"
                        }`}
                      >
                        {pct}%
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(offer.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                          STATUS_STYLES[offer.status]
                        }`}
                      >
                        {offer.status.charAt(0) + offer.status.slice(1).toLowerCase()}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      {isPending ? (
                        <OfferActions offerId={offer.id} />
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>
            {total} offer{total !== 1 ? "s" : ""}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/offers?${statusFilter ? `status=${statusFilter}&` : ""}page=${page - 1}`}
                className="rounded-lg border border-gray-200 px-3 py-1.5 hover:bg-gray-50"
              >
                ← Prev
              </Link>
            )}
            {page < pages && (
              <Link
                href={`/admin/offers?${statusFilter ? `status=${statusFilter}&` : ""}page=${page + 1}`}
                className="rounded-lg border border-gray-200 px-3 py-1.5 hover:bg-gray-50"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
