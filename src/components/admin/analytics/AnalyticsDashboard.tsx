"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DailyRevenue {
  date: string;
  revenue: number;
  orderCount: number;
}

interface TopProduct {
  productId: string;
  title: string;
  totalSold: number;
  revenue: number;
}

interface CustomerStats {
  total: number;
  newLast30Days: number;
  returning: number;
}

interface AnalyticsData {
  dailyRevenue: DailyRevenue[];
  ordersByStatus: Record<string, number>;
  topProducts: TopProduct[];
  customerStats: CustomerStats;
}

// Match OrderStatusBadge colors
const STATUS_COLORS: Record<string, string> = {
  PENDING: "#fde68a",
  PAID: "#93c5fd",
  PROCESSING: "#d8b4fe",
  SHIPPED: "#a5b4fc",
  DELIVERED: "#86efac",
  CANCELLED: "#fca5a5",
  REFUNDED: "#d1d5db",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(`${r.status}: ${body?.error ?? "Failed to load analytics."}`);
        }
        return r.json() as Promise<AnalyticsData>;
      })
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-400">Loading analytics…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl bg-red-50 p-6 text-sm text-red-700">
        {error ?? "Failed to load analytics."}
      </div>
    );
  }

  const totalRevenue30 = data.dailyRevenue.reduce((s, d) => s + d.revenue, 0);
  const totalOrders30 = data.dailyRevenue.reduce((s, d) => s + d.orderCount, 0);

  const pieData = Object.entries(data.ordersByStatus)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: STATUS_LABELS[k] ?? k, value: v, key: k }));

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Revenue (30d)"
          value={`$${totalRevenue30.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
        />
        <StatCard label="Orders (30d)" value={totalOrders30} />
        <StatCard
          label="Total Customers"
          value={data.customerStats.total.toLocaleString()}
          sub={`+${data.customerStats.newLast30Days} new this month`}
        />
        <StatCard
          label="Returning Customers"
          value={data.customerStats.returning.toLocaleString()}
          sub="2+ orders"
        />
      </div>

      {/* Revenue area chart */}
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Revenue — Last 30 Days</h2>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data.dailyRevenue} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#dc2626" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tickFormatter={(v: string) => formatDate(v)}
              tick={{ fontSize: 11 }}
              interval={4}
            />
            <YAxis tickFormatter={(v: number) => `$${v}`} tick={{ fontSize: 11 }} width={60} />
            <Tooltip
              formatter={(value) => [`$${Number(value).toFixed(2)}`, "Revenue"]}
              labelFormatter={(label) => formatDate(String(label))}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#dc2626"
              strokeWidth={2}
              fill="url(#revenueGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top products bar chart (horizontal) */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            Top 10 Products by Units Sold
          </h2>
          {data.topProducts.length === 0 ? (
            <p className="text-sm text-gray-400">No order data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={data.topProducts}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  dataKey="title"
                  type="category"
                  width={140}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v: string) => (v.length > 22 ? v.slice(0, 22) + "…" : v)}
                />
                <Tooltip formatter={(value) => [Number(value), "Units Sold"]} />
                <Bar dataKey="totalSold" fill="#dc2626" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* Orders by status pie chart */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Orders by Status</h2>
          {pieData.length === 0 ? (
            <p className="text-sm text-gray-400">No order data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  outerRadius={100}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.key} fill={STATUS_COLORS[entry.key] ?? "#e5e7eb"} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [Number(value), "Orders"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </section>
      </div>
    </div>
  );
}
