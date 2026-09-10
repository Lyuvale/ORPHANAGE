import Link from "next/link";
import { serverFetch } from "@/lib/server-fetch";
import { createClient } from "@/lib/supabase/server";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { can } from "@/lib/auth/authorization.service";
import ApproveRejectButtons from "@/app/(dashboard)/_components/approve-reject-buttons";
import ReferralEditForm from "./_components/referral-edit-form";

async function getReferral(id: string) {
  const res = await serverFetch(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/referrals/${id}`,
    { cache: "no-store" },
  );

  if (!res.ok) {
    return null;
  }

  const result = await res.json();
  return result.data;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    submitted: "bg-yellow-100 text-yellow-800",
    under_review: "bg-blue-100 text-blue-800",
    admitted: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    withdrawn: "bg-gray-100 text-gray-800",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium ${colors[status] ?? "bg-gray-100 text-gray-800"}`}
    >
      {status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
    </span>
  );
}

export default async function ReferralDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const referral = await getReferral(id);

  if (!referral) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-500">Referral not found.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-500">
          Back to dashboard
        </Link>
      </div>
    );
  }

  let canEdit = false;
  let canReview = false;
  let canReject = false;
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as never, {
      allowInactiveSubscription: true,
    });
    canEdit = await can(supabase as never, ctx, "referrals.update");
    canReview = await can(supabase as never, ctx, "referrals.review");
    canReject = await can(supabase as never, ctx, "referrals.reject");
  } catch {
    canEdit = false;
    canReview = false;
    canReject = false;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
            &larr; Back to dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            {referral.child_first_name}
            {referral.child_middle_name ? ` ${referral.child_middle_name}` : ""}{" "}
            {referral.child_last_name}
          </h1>
          <p className="text-sm text-gray-500 font-mono">{referral.reference_number}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={referral.status} />
          {(referral.status === "submitted" || referral.status === "under_review") &&
            (canReview || canReject) && (
              <ApproveRejectButtons
                url={`/api/referrals/${referral.id}`}
                approveBody={{ new_status: "admitted" }}
                rejectBody={{ new_status: "rejected" }}
                showApprove={canReview}
                showReject={canReject}
                requireReasonOnReject
              />
            )}
        </div>
      </div>

      {canEdit && (referral.status === "submitted" || referral.status === "under_review") && (
        <div className="mb-6">
          <ReferralEditForm referral={referral} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Child Details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Date of Birth</dt>
              <dd className="text-gray-900">{referral.child_date_of_birth ? new Date(referral.child_date_of_birth).toLocaleDateString() : "-"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Gender</dt>
              <dd className="text-gray-900">{referral.child_gender ?? "-"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Nationality</dt>
              <dd className="text-gray-900">{referral.child_nationality ?? "-"}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Referral Info</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Source</dt>
              <dd className="text-gray-900">{referral.source.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Priority</dt>
              <dd className="text-gray-900">{referral.priority.charAt(0).toUpperCase() + referral.priority.slice(1)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Submitted</dt>
              <dd className="text-gray-900">{new Date(referral.submitted_at).toLocaleDateString()}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-gray-200 p-4 sm:col-span-2">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Reason</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{referral.reason}</p>
        </div>

        {referral.notes && (
          <div className="rounded-lg border border-gray-200 p-4 sm:col-span-2">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Notes</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{referral.notes}</p>
          </div>
        )}

        {(referral.referrer_name || referral.referrer_org) && (
          <div className="rounded-lg border border-gray-200 p-4 sm:col-span-2">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Referrer</h2>
            <dl className="space-y-2 text-sm">
              {referral.referrer_name && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Name</dt>
                  <dd className="text-gray-900">{referral.referrer_name}</dd>
                </div>
              )}
              {referral.referrer_org && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Organization</dt>
                  <dd className="text-gray-900">{referral.referrer_org}</dd>
                </div>
              )}
              {referral.referrer_contact && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Contact</dt>
                  <dd className="text-gray-900">{referral.referrer_contact}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
