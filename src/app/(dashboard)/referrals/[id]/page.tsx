import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { can } from "@/lib/auth/authorization.service";
import ApproveRejectButtons from "@/app/(dashboard)/_components/approve-reject-buttons";
import ReferralEditForm from "./_components/referral-edit-form";
import { getReferralById } from "@/lib/referrals/referral.service";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    submitted: "bg-yellow-100 text-yellow-800",
    under_review: "bg-blue-100 text-blue-800",
    admitted: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    withdrawn: "bg-zinc-100 text-gray-800",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium ${colors[status] ?? "bg-zinc-100 text-gray-800"}`}
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

  let referral: Awaited<ReturnType<typeof getReferralById>> = null;
  let canEdit = false;
  let canReview = false;
  let canReject = false;
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as never, {
      allowInactiveSubscription: true,
    });
    const admin = createAdminClient();
    if (await can(supabase as never, ctx, "referrals.view")) {
      const [row, edit, review, reject] = await Promise.all([
        getReferralById(admin, id),
        can(supabase as never, ctx, "referrals.update"),
        can(supabase as never, ctx, "referrals.review"),
        can(supabase as never, ctx, "referrals.reject"),
      ]);
      referral = row && row.centre_id === ctx.centre.id ? row : null;
      canEdit = edit;
      canReview = review;
      canReject = reject;
    }
  } catch {
    referral = null;
  }

  if (!referral) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-zinc-500">Referral not found.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-500">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-700">
            &larr; Back to dashboard
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900 mt-2">
            {referral.child_first_name}
            {referral.child_middle_name ? ` ${referral.child_middle_name}` : ""}{" "}
            {referral.child_last_name}
          </h1>
          <p className="text-sm text-zinc-500 font-mono">{referral.reference_number}</p>
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
        <div className="rounded-lg border border-zinc-200 p-4">
          <h2 className="text-sm font-semibold text-zinc-900 mb-3">Child Details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Date of Birth</dt>
              <dd className="text-zinc-900">{referral.child_date_of_birth ? new Date(referral.child_date_of_birth).toLocaleDateString() : "-"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Gender</dt>
              <dd className="text-zinc-900">{referral.child_gender ?? "-"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Nationality</dt>
              <dd className="text-zinc-900">{referral.child_nationality ?? "-"}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-zinc-200 p-4">
          <h2 className="text-sm font-semibold text-zinc-900 mb-3">Referral Info</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Source</dt>
              <dd className="text-zinc-900">{referral.source.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Priority</dt>
              <dd className="text-zinc-900">{referral.priority.charAt(0).toUpperCase() + referral.priority.slice(1)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Submitted</dt>
              <dd className="text-zinc-900">{new Date(referral.submitted_at).toLocaleDateString()}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-zinc-200 p-4 sm:col-span-2">
          <h2 className="text-sm font-semibold text-zinc-900 mb-3">Reason</h2>
          <p className="text-sm text-zinc-700 whitespace-pre-wrap">{referral.reason}</p>
        </div>

        {referral.notes && (
          <div className="rounded-lg border border-zinc-200 p-4 sm:col-span-2">
            <h2 className="text-sm font-semibold text-zinc-900 mb-3">Notes</h2>
            <p className="text-sm text-zinc-700 whitespace-pre-wrap">{referral.notes}</p>
          </div>
        )}

        {(referral.referrer_name || referral.referrer_org) && (
          <div className="rounded-lg border border-zinc-200 p-4 sm:col-span-2">
            <h2 className="text-sm font-semibold text-zinc-900 mb-3">Referrer</h2>
            <dl className="space-y-2 text-sm">
              {referral.referrer_name && (
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Name</dt>
                  <dd className="text-zinc-900">{referral.referrer_name}</dd>
                </div>
              )}
              {referral.referrer_org && (
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Organization</dt>
                  <dd className="text-zinc-900">{referral.referrer_org}</dd>
                </div>
              )}
              {referral.referrer_contact && (
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Contact</dt>
                  <dd className="text-zinc-900">{referral.referrer_contact}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
