import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { can } from "@/lib/auth/authorization.service";
import { serverFetch } from "@/lib/server-fetch";
import ApprovalsClient, { type ApprovalItem, type ApprovalCaps } from "./ApprovalsClient";

function baseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

async function fetchList(path: string): Promise<Record<string, unknown>[]> {
  try {
    const res = await serverFetch(`${baseUrl()}${path}`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : [];
  } catch {
    return [];
  }
}

// Unified approvals inbox: everything awaiting this user's approve/reject
// decision in one place. Each section is shown only when the matching
// approval permission is held (role-based visibility); each action route
// enforces the same permission again.
export default async function ApprovalsPage() {
  const supabase = await createClient();
  const ctx = await requireAppAccess(supabase as never);

  const [refReview, refReject, visitApprove, visitReject, admReview, expApprove] =
    await Promise.all([
      can(supabase as never, ctx, "referrals.review"),
      can(supabase as never, ctx, "referrals.reject"),
      can(supabase as never, ctx, "visits.approve"),
      can(supabase as never, ctx, "visits.reject"),
      can(supabase as never, ctx, "admissions.review"),
      can(supabase as never, ctx, "resources.approve"),
    ]);

  const caps: ApprovalCaps = {
    refReview,
    refReject,
    visitApprove,
    visitReject,
    admReview,
    expApprove,
  };

  if (!refReview && !refReject && !visitApprove && !visitReject && !admReview && !expApprove) {
    redirect("/children");
  }

  const [refSubmitted, refUnderReview, visitsRequested, visitsPending, admissionsPending, expensesPending] =
    await Promise.all([
      refReview || refReject ? fetchList("/api/referrals?status=submitted&limit=50") : [],
      refReview || refReject ? fetchList("/api/referrals?status=under_review&limit=50") : [],
      visitApprove || visitReject ? fetchList("/api/visits?status=requested&limit=50") : [],
      visitApprove || visitReject ? fetchList("/api/visits?status=pending_approval&limit=50") : [],
      admReview ? fetchList("/api/admissions?status=pending&limit=50") : [],
      expApprove ? fetchList("/api/resources/expenses?status=PENDING&limit=50") : [],
    ]);

  const referrals: ApprovalItem[] = [...refSubmitted, ...refUnderReview].map((r) => ({
    id: String(r.id),
    title: `${(r.child_first_name as string ?? "")} ${(r.child_last_name as string ?? "")}`.trim() || "Unnamed referral",
    subtitle: `${String(r.source ?? "").replace(/_/g, " ")} · ${String(r.status ?? "")} · ${String((r.reason as string) ?? "").slice(0, 80)}`,
    href: `/referrals/${String(r.id)}`,
  }));

  const visits: ApprovalItem[] = [...visitsRequested, ...visitsPending].map((v) => ({
    id: String(v.id),
    title: String(v.purpose ?? "Visit"),
    subtitle: `${String(v.status ?? "")} · ${v.scheduled_date ? new Date(String(v.scheduled_date)).toLocaleDateString() : ""}`,
    href: `/visits/${String(v.id)}`,
  }));

  const admissions: ApprovalItem[] = admissionsPending.map((a) => ({
    id: String(a.id),
    title: String(a.reference_number ?? "Admission"),
    subtitle: `${String(a.status ?? "")} · ${String((a.decision as string) ?? "").slice(0, 80) || "awaiting review"}`,
    href: `/admissions/${String(a.id)}`,
  }));

  const expenses: ApprovalItem[] = expensesPending.map((e) => ({
    id: String(e.id),
    title: String(e.description ?? "Expense"),
    subtitle: `TZS ${Number(e.amount ?? 0).toLocaleString()}`,
    href: `/resources/expenses/${String(e.id)}`,
  }));

  return (
    <ApprovalsClient
      caps={caps}
      referrals={referrals}
      visits={visits}
      admissions={admissions}
      expenses={expenses}
    />
  );
}
