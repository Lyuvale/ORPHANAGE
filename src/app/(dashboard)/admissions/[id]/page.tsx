import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { can } from "@/lib/auth/authorization.service";
import {
  getAdmissionById,
  getAdmissionHistory,
} from "@/lib/admissions/admission.service";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    denied: "bg-red-100 text-red-800",
    cancelled: "bg-zinc-100 text-gray-800",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium ${colors[status] ?? "bg-zinc-100 text-gray-800"}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default async function AdmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let admission:
    | (NonNullable<Awaited<ReturnType<typeof getAdmissionById>>> & {
        status_history?: Awaited<ReturnType<typeof getAdmissionHistory>>;
      })
    | null = null;
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as never, {
      allowInactiveSubscription: true,
    });
    if (await can(supabase as never, ctx, "admissions.view")) {
      const admin = createAdminClient();
      const row = await getAdmissionById(admin, id);
      if (row && row.centre_id === ctx.centre.id) {
        const statusHistory = await getAdmissionHistory(admin, id);
        admission = { ...row, status_history: statusHistory };
      }
    }
  } catch {
    admission = null;
  }

  if (!admission) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-zinc-500">Admission not found.</p>
        <Link href="/admissions" className="mt-4 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-500">
          Back to admissions
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admissions" className="text-sm text-zinc-500 hover:text-zinc-700">
            &larr; Back to admissions
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900 mt-2">Admission</h1>
          <p className="text-sm text-zinc-500 font-mono">{admission.reference_number}</p>
        </div>
        <StatusBadge status={admission.status} />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 p-4">
          <h2 className="text-sm font-semibold text-zinc-900 mb-3">Details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Referral ID</dt>
              <dd className="text-zinc-900 font-mono">{admission.referral_id.slice(0, 8)}...</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Created</dt>
              <dd className="text-zinc-900">{new Date(admission.created_at).toLocaleDateString()}</dd>
            </div>
            {admission.admitted_date && (
              <div className="flex justify-between">
                <dt className="text-zinc-500">Admitted Date</dt>
                <dd className="text-zinc-900">{new Date(admission.admitted_date).toLocaleDateString()}</dd>
              </div>
            )}
          </dl>
        </div>

        {admission.decision && (
          <div className="rounded-lg border border-zinc-200 p-4 sm:col-span-2">
            <h2 className="text-sm font-semibold text-zinc-900 mb-3">Decision</h2>
            <p className="text-sm text-zinc-700 whitespace-pre-wrap">{admission.decision}</p>
          </div>
        )}

        {admission.conditions && (
          <div className="rounded-lg border border-zinc-200 p-4 sm:col-span-2">
            <h2 className="text-sm font-semibold text-zinc-900 mb-3">Conditions</h2>
            <p className="text-sm text-zinc-700 whitespace-pre-wrap">{admission.conditions}</p>
          </div>
        )}

        {admission.denied_reason && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 sm:col-span-2">
            <h2 className="text-sm font-semibold text-red-900 mb-3">Denied Reason</h2>
            <p className="text-sm text-red-700 whitespace-pre-wrap">{admission.denied_reason}</p>
          </div>
        )}

        {admission.status_history && admission.status_history.length > 0 && (
          <div className="rounded-lg border border-zinc-200 p-4 sm:col-span-2">
            <h2 className="text-sm font-semibold text-zinc-900 mb-3">Status History</h2>
            <div className="space-y-2">
              {admission.status_history.map(
                (entry: { id: string; previous_status: string | null; new_status: string; changed_at: string; reason: string | null }) => (
                  <div key={entry.id} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">
                      {entry.previous_status ? `${entry.previous_status} → ` : ""}
                      <span className="font-medium text-zinc-900">{entry.new_status}</span>
                    </span>
                    <span className="text-zinc-400">{new Date(entry.changed_at).toLocaleDateString()}</span>
                  </div>
                ),
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
