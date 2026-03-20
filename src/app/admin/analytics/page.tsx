import AnalyticsDashboard from "@/components/admin/analytics/AnalyticsDashboard";

export const metadata = { title: "Analytics — Admin" };

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-0.5 text-sm text-gray-500">Last 30 days of store performance</p>
      </div>
      <AnalyticsDashboard />
    </div>
  );
}
