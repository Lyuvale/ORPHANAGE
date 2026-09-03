"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type ApprovalItem = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

export type ApprovalCaps = {
  refReview: boolean;
  refReject: boolean;
  visitApprove: boolean;
  visitReject: boolean;
  admReview: boolean;
  expApprove: boolean;
};

async function callJson(url: string, method: string, payload: Record<string, unknown>) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Action failed.");
}

function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);

  async function run(id: string, fn: () => Promise<void>) {
    setError(null);
    setBusy(id);
    try {
      await fn();
      setDone((d) => [...d, id]);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  return { busy, error, done, run };
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-lg border overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      {children ?? <p className="px-4 py-5 text-sm text-gray-500">{empty}</p>}
    </section>
  );
}

export default function ApprovalsClient({
  caps,
  referrals,
  visits,
  admissions,
  expenses,
}: {
  caps: ApprovalCaps;
  referrals: ApprovalItem[];
  visits: ApprovalItem[];
  admissions: ApprovalItem[];
  expenses: ApprovalItem[];
}) {
  const { busy, error, done, run } = useAction();
  const visible = (items: ApprovalItem[]) => items.filter((i) => !done.includes(i.id));

  const showReferrals = caps.refReview || caps.refReject;
  const showVisits = caps.visitApprove || caps.visitReject;

  const btnApprove =
    "rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50";
  const btnReject =
    "rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50";

  function row(
    item: ApprovalItem,
    onApprove: (() => Promise<void>) | null,
    onReject: (() => Promise<void>) | null,
  ) {
    const loading = busy === item.id;
    return (
      <li key={item.id} className="px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Link href={item.href} className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">
            {item.title}
          </Link>
          <p className="text-xs text-gray-500 truncate">{item.subtitle}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {onApprove && (
            <button disabled={loading} onClick={() => run(item.id, onApprove)} className={btnApprove}>
              {loading ? "…" : "Approve"}
            </button>
          )}
          {onReject && (
            <button disabled={loading} onClick={() => run(item.id, onReject)} className={btnReject}>
              {loading ? "…" : "Reject"}
            </button>
          )}
        </div>
      </li>
    );
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900">Approvals</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">
        Everything awaiting your approve / reject decision in one place.
      </p>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {showReferrals && (
          <Section title={`Referrals (${visible(referrals).length})`} empty="No referrals awaiting review.">
            {visible(referrals).length === 0 ? null : (
              <ul className="divide-y divide-gray-200">
                {visible(referrals).map((r) =>
                  row(
                    r,
                    caps.refReview
                      ? () => callJson(`/api/referrals/${r.id}`, "PATCH", { new_status: "admitted" })
                      : null,
                    caps.refReject
                      ? () => callJson(`/api/referrals/${r.id}`, "PATCH", { new_status: "rejected" })
                      : null,
                  ),
                )}
              </ul>
            )}
          </Section>
        )}

        {showVisits && (
          <Section title={`Visits (${visible(visits).length})`} empty="No visits awaiting approval.">
            {visible(visits).length === 0 ? null : (
              <ul className="divide-y divide-gray-200">
                {visible(visits).map((v) =>
                  row(
                    v,
                    caps.visitApprove
                      ? () => callJson(`/api/visits/${v.id}/status`, "PATCH", { new_status: "approved" })
                      : null,
                    caps.visitReject
                      ? () => callJson(`/api/visits/${v.id}/status`, "PATCH", { new_status: "rejected" })
                      : null,
                  ),
                )}
              </ul>
            )}
          </Section>
        )}

        {caps.admReview && (
          <Section title={`Admissions (${visible(admissions).length})`} empty="No admissions awaiting review.">
            {visible(admissions).length === 0 ? null : (
              <ul className="divide-y divide-gray-200">
                {visible(admissions).map((a) =>
                  row(
                    a,
                    () => callJson(`/api/admissions/${a.id}`, "PATCH", { new_status: "approved" }),
                    () => callJson(`/api/admissions/${a.id}`, "PATCH", { new_status: "denied" }),
                  ),
                )}
              </ul>
            )}
          </Section>
        )}

        {caps.expApprove && (
          <Section title={`Expenses (${visible(expenses).length})`} empty="No expenses awaiting approval.">
            {visible(expenses).length === 0 ? null : (
              <ul className="divide-y divide-gray-200">
                {visible(expenses).map((e) =>
                  row(
                    e,
                    () => callJson(`/api/resources/expenses/${e.id}/approval`, "POST", { status: "APPROVED" }),
                    () => callJson(`/api/resources/expenses/${e.id}/approval`, "POST", { status: "REJECTED" }),
                  ),
                )}
              </ul>
            )}
          </Section>
        )}
      </div>
    </div>
  );
}
