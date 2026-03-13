"use client";

/**
 * Admin eBay Sync Dashboard — Task 4.5
 * Route: /admin/ebay-sync
 *
 * Shows:
 *  - Last sync summary (time, counts, status)
 *  - "Sync Now" button that triggers an immediate sync
 *  - History table of the last 10 syncs
 */

import { useState, useEffect, useCallback } from "react";

interface SyncLog {
  id: string;
  startedAt: string;
  completedAt: string | null;
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  itemsProcessed: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsDeactivated: number;
  errorLog: string | null;
}

interface SyncResult {
  ok: boolean;
  itemsProcessed: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsDeactivated: number;
  errorCount: number;
  errors?: string[];
  error?: string;
}

const STATUS_STYLES: Record<SyncLog["status"], string> = {
  SUCCESS: "bg-green-100 text-green-800",
  PARTIAL: "bg-yellow-100 text-yellow-800",
  FAILED: "bg-red-100 text-red-800",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const secs = Math.round(ms / 1000);
  return secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

export default function EbaySyncPage() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/admin/ebay-sync");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLogs(data.logs ?? []);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load logs.");
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  async function triggerSync() {
    setSyncing(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/admin/ebay-sync", { method: "POST" });
      const data: SyncResult = await res.json();
      setLastResult(data);
      // Refresh logs to show the new entry
      await fetchLogs();
    } catch (err) {
      setLastResult({
        ok: false,
        itemsProcessed: 0,
        itemsCreated: 0,
        itemsUpdated: 0,
        itemsDeactivated: 0,
        errorCount: 1,
        error: err instanceof Error ? err.message : "Network error.",
      });
    } finally {
      setSyncing(false);
    }
  }

  const latestLog = logs[0] ?? null;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">eBay Sync</h1>
            <p className="mt-1 text-sm text-gray-500">
              Inventory is auto-synced every 6 hours. Use the button below for an immediate sync.
            </p>
          </div>
          <a href="/admin" className="text-sm text-blue-600 hover:underline">
            ← Admin
          </a>
        </div>

        {/* Last sync summary card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Last Sync
          </h2>

          {loadingLogs ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : fetchError ? (
            <p className="text-sm text-red-600">{fetchError}</p>
          ) : latestLog ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Status">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[latestLog.status]}`}
                >
                  {latestLog.status}
                </span>
              </Stat>
              <Stat label="Started">{formatDate(latestLog.startedAt)}</Stat>
              <Stat label="Duration">
                {formatDuration(latestLog.startedAt, latestLog.completedAt)}
              </Stat>
              <Stat label="Processed">{latestLog.itemsProcessed}</Stat>
              <Stat label="Created">{latestLog.itemsCreated}</Stat>
              <Stat label="Updated">{latestLog.itemsUpdated}</Stat>
              <Stat label="Deactivated">{latestLog.itemsDeactivated}</Stat>
              {latestLog.errorLog && (
                <div className="col-span-2 sm:col-span-4">
                  <p className="text-xs font-medium text-red-600">Errors:</p>
                  <pre className="mt-1 max-h-24 overflow-y-auto rounded bg-red-50 p-2 text-xs text-red-800">
                    {latestLog.errorLog}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No syncs have run yet.</p>
          )}
        </div>

        {/* Sync Now */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Manual Sync
          </h2>

          <button
            onClick={triggerSync}
            disabled={syncing}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {syncing ? "Syncing…" : "Sync Now"}
          </button>

          {syncing && (
            <p className="mt-3 text-sm text-gray-500">
              Fetching listings from eBay. This may take a minute…
            </p>
          )}

          {lastResult && (
            <div className="mt-4">
              {lastResult.ok ? (
                <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800">
                  <p className="font-semibold">Sync complete</p>
                  <ul className="mt-1 list-disc pl-5 space-y-0.5">
                    <li>Processed: {lastResult.itemsProcessed}</li>
                    <li>Created: {lastResult.itemsCreated}</li>
                    <li>Updated: {lastResult.itemsUpdated}</li>
                    <li>Deactivated: {lastResult.itemsDeactivated}</li>
                    {lastResult.errorCount > 0 && (
                      <li className="text-yellow-700">
                        Errors: {lastResult.errorCount}
                        {lastResult.errors && lastResult.errors.length > 0 && (
                          <ul className="mt-1 list-none pl-2">
                            {lastResult.errors.map((e, i) => (
                              <li key={i} className="text-xs text-red-700">
                                {e}
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    )}
                  </ul>
                </div>
              ) : (
                <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
                  <p className="font-semibold">Sync failed</p>
                  <p className="mt-1">{lastResult.error ?? "Unknown error."}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sync history */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Sync History (last 10)
          </h2>

          {loadingLogs ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-gray-400">No sync history yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th className="pb-2 pr-4">Started</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Duration</th>
                    <th className="pb-2 pr-4">Processed</th>
                    <th className="pb-2 pr-4">Created</th>
                    <th className="pb-2 pr-4">Updated</th>
                    <th className="pb-2">Deactivated</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 text-gray-700">{formatDate(log.startedAt)}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[log.status]}`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-gray-600">
                        {formatDuration(log.startedAt, log.completedAt)}
                      </td>
                      <td className="py-2 pr-4 text-gray-600">{log.itemsProcessed}</td>
                      <td className="py-2 pr-4 text-green-700">{log.itemsCreated}</td>
                      <td className="py-2 pr-4 text-blue-700">{log.itemsUpdated}</td>
                      <td className="py-2 text-red-600">{log.itemsDeactivated}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-gray-800">{children}</p>
    </div>
  );
}
