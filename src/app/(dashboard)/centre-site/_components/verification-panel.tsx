"use client";

import { useCallback, useEffect, useState } from "react";
import type { CentreNeedContributionWithNeed } from "@/types/centre-need";
import { EmptyState } from "@/components/ui/empty-state";

const numberFormat = new Intl.NumberFormat("en-TZ", {
  maximumFractionDigits: 2,
});

function formatTzs(value: number): string {
  return `TZS ${numberFormat.format(Number(value) || 0)}`;
}

export default function VerificationPanel() {
  const [items, setItems] = useState<CentreNeedContributionWithNeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/centre-site/needs/verify", {
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.details || json.error || "Failed to load contributions");
      }
      setItems(
        Array.isArray(json.data)
          ? (json.data as CentreNeedContributionWithNeed[])
          : [],
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load contributions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const review = useCallback(
    async (id: string, action: "verify" | "reject") => {
      setError(null);
      setBusyId(id);
      try {
        const res = await fetch("/api/centre-site/needs/verify", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contributionId: id, action }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json.details || json.error || "Failed to review contribution");
        }
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to review contribution");
      } finally {
        setBusyId(null);
      }
    },
    [load],
  );

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">
            Pending contributions
          </h2>
          <p className="text-sm text-zinc-500">
            Verify a transfer before it counts towards a need&apos;s progress.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {loading && items.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-400">Loading contributions…</p>
      ) : items.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="Nothing to verify"
            description="New transfer submissions from the public site will appear here."
          />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-zinc-50/60 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-3">Need</th>
                <th className="px-5 py-3">Jina la Mchangiaji</th>
                <th className="px-5 py-3">Simu</th>
                <th className="px-5 py-3">Jina la Muamala</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-50/60">
                  <td className="px-5 py-3 font-medium text-zinc-900">
                    {item.need_title ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-zinc-600">
                    {item.contributor_name || "—"}
                  </td>
                  <td className="px-5 py-3 text-zinc-600">
                    {item.contributor_phone || "—"}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-zinc-600">
                    {item.transaction_reference || "—"}
                  </td>
                  <td className="px-5 py-3 font-medium text-zinc-900">
                    {formatTzs(Number(item.amount))}
                  </td>
                  <td className="px-5 py-3 text-xs text-zinc-500">
                    {new Date(item.created_at).toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => void review(item.id, "verify")}
                        className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Verify
                      </button>
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => void review(item.id, "reject")}
                        className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
