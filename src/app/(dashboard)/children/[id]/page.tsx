import Link from "next/link";
import { notFound } from "next/navigation";
import { formatTsh, getBenefitTypeDisplay } from "@/types/resources";
import AuditHistory from "../../_components/audit-history";
import { serverFetch } from "@/lib/server-fetch";
import { createClient } from "@/lib/supabase/server";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { can, getUserRoleName } from "@/lib/auth/authorization.service";
import CaregiverAssignment from "./_components/caregiver-assignment";
import AddPlacementForm from "./_components/add-placement-form";
import LinkGuardianForm from "./_components/link-guardian-form";
import DeleteChildButton from "./_components/delete-child-button";
import ApproveRejectButtons from "@/app/(dashboard)/_components/approve-reject-buttons";

function HealthSummary({ health }: { health: Record<string, unknown> }) {
  const blood = health.blood_group as string | null;
  const allergies = (health.critical_allergies ?? []) as { name: string; severity?: string }[];
  const conditions = (health.important_conditions ?? []) as { name: string }[];
  const meds = (health.active_medications ?? []) as {
    medication_name: string;
    dosage: string | null;
    frequency: string | null;
  }[];

  return (
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <dt className="text-xs font-medium text-gray-500 uppercase">Blood group</dt>
        <dd className="mt-1 text-sm text-gray-900">{blood ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-xs font-medium text-gray-500 uppercase">Critical allergies</dt>
        <dd className="mt-1 text-sm text-gray-900">
          {allergies.length === 0
            ? "None recorded"
            : allergies.map((a) => `${a.name}${a.severity ? ` (${a.severity})` : ""}`).join(", ")}
        </dd>
      </div>
      <div>
        <dt className="text-xs font-medium text-gray-500 uppercase">Important conditions</dt>
        <dd className="mt-1 text-sm text-gray-900">
          {conditions.length === 0 ? "None recorded" : conditions.map((c) => c.name).join(", ")}
        </dd>
      </div>
      <div>
        <dt className="text-xs font-medium text-gray-500 uppercase">Active medications</dt>
        <dd className="mt-1 text-sm text-gray-900">
          {meds.length === 0
            ? "None"
            : meds.map((m) => `${m.medication_name}${m.dosage ? ` ${m.dosage}` : ""}`).join(", ")}
        </dd>
      </div>
    </dl>
  );
}

async function getChild(id: string) {
  const res = await serverFetch(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/children/${id}`,
    { cache: "no-store" },
  );

  if (!res.ok) return null;
  return res.json();
}

async function getChildBenefits(childId: string) {
  const res = await serverFetch(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/resources/children/${childId}/benefits`,
    { cache: "no-store" },
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

async function getChildGuardians(childId: string) {
  const res = await serverFetch(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/guardians/relationships?child_id=${childId}&is_active=true`,
    { cache: "no-store" },
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json.data ?? [];
}

async function getChildReferrals(childId: string) {
  const res = await serverFetch(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/referrals?child_id=${childId}&limit=20`,
    { cache: "no-store" },
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json.data ?? [];
}

async function getChildAdmissions(childId: string) {
  const res = await serverFetch(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/admissions?child_id=${childId}&limit=20`,
    { cache: "no-store" },
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json.data ?? [];
}

async function getChildPlacements(childId: string) {
  const res = await serverFetch(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/placements?child_id=${childId}&limit=20`,
    { cache: "no-store" },
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json.data ?? [];
}

async function getChildHealth(childId: string) {
  const res = await serverFetch(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/health/emergency?child_id=${childId}`,
    { cache: "no-store" },
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json.data ?? null;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    transferred: "bg-blue-100 text-blue-800",
    graduated: "bg-purple-100 text-purple-800",
    alumni: "bg-gray-100 text-gray-800",
    deactivated: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-800"}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default async function ChildProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getChild(id);

  if (!result?.data) {
    notFound();
  }

  const child = result.data;
  const history = child.status_history ?? [];
  const benefits = await getChildBenefits(id);
  const guardians = await getChildGuardians(id);
  const referrals = await getChildReferrals(id);
  const admissions = await getChildAdmissions(id);
  const placements = await getChildPlacements(id);
  const health = await getChildHealth(id);

  // Assignment management (manager assigning child -> caregiver) is visible
  // only to roles holding staff.assignments.manage. This also keeps the
  // centre staff list out of reach for caregivers.
  // Child editing is the Records Officer's duty (children.update).
  // Section visibility below additionally follows each view permission:
  // a null fetch result means "no access" and hides the section, while an
  // empty list renders an empty state.
  let canManageAssignments = false;
  let canEditChild = false;
  let canAddPlacement = false;
  let canLinkGuardian = false;
  let canViewHealthModule = false;
  let canReviewReferral = false;
  let canRejectReferral = false;
  let canReviewAdmission = false;
  let canArchiveChild = false;
  let isManager = false;
  try {
    const supabase = await createClient();
    const actx = await requireAppAccess(supabase as never, {
      allowInactiveSubscription: true,
    });
    canManageAssignments = await can(supabase as never, actx, "staff.assignments.manage");
    canEditChild = await can(supabase as never, actx, "children.update");
    canAddPlacement = await can(supabase as never, actx, "placements.create");
    canLinkGuardian = await can(supabase as never, actx, "guardians.relationship.manage");
    canViewHealthModule = await can(supabase as never, actx, "health.view");
    canReviewReferral = await can(supabase as never, actx, "referrals.review");
    canRejectReferral = await can(supabase as never, actx, "referrals.reject");
    canReviewAdmission = await can(supabase as never, actx, "admissions.review");
    canArchiveChild = await can(supabase as never, actx, "children.archive");
    isManager = (await getUserRoleName(supabase as never, actx)) === "CENTRE_MANAGER";
  } catch {
    canManageAssignments = false;
    canEditChild = false;
    canAddPlacement = false;
    canLinkGuardian = false;
    canViewHealthModule = false;
    canReviewReferral = false;
    canRejectReferral = false;
    canReviewAdmission = false;
    canArchiveChild = false;
    isManager = false;
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/children"
          className="text-sm font-semibold text-gray-900 hover:text-indigo-600"
        >
          &larr; Back to Children
        </Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {child.first_name}
            {child.middle_name ? ` ${child.middle_name}` : ""}{" "}
            {child.last_name}
          </h1>
          <p className="mt-1 text-sm text-gray-500 font-mono">
            {child.reference_number}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={child.status} />
          {canEditChild && (
            <Link
              href={`/children/${child.id}/edit`}
              className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Edit
            </Link>
          )}
          {canArchiveChild && (
            <DeleteChildButton
              childId={child.id}
              childName={`${child.first_name} ${child.last_name}`}
            />
          )}
        </div>
      </div>

      {/* Basic Information */}
      <div className="bg-white shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">
            Basic Information
          </h2>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Full Name</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2">
                {child.first_name}
                {child.middle_name ? ` ${child.middle_name}` : ""}{" "}
                {child.last_name}
                {child.preferred_name
                  ? ` (${child.preferred_name})`
                  : ""}
              </dd>
            </div>
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">
                Date of Birth
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2">
                {new Date(child.date_of_birth).toLocaleDateString()}
              </dd>
            </div>
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Gender</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2">
                {child.gender.charAt(0).toUpperCase() + child.gender.slice(1)}
              </dd>
            </div>
            {child.nationality && (
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  Nationality
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2">
                  {child.nationality}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Admission Information */}
      <div className="bg-white shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">
            Admission Information
          </h2>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">
                Admission Date
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2">
                {new Date(child.admission_date).toLocaleDateString()}
              </dd>
            </div>
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1 text-sm sm:col-span-2">
                <StatusBadge status={child.status} />
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Referral — linked intake record */}
      {referrals !== null && (
        <div className="bg-white shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg font-medium text-gray-900">Referral</h2>
          </div>
          {referrals.length === 0 ? (
            <p className="border-t border-gray-200 px-4 py-5 sm:px-6 text-sm text-gray-500">
              No referral linked to this child yet.
            </p>
          ) : (
          <ul className="border-t border-gray-200 divide-y divide-gray-200">
            {referrals.map(
              (r: {
                id: string;
                reference_number: string;
                source: string;
                status: string;
                reason: string | null;
              }) => (
                <li key={r.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/referrals/${r.id}`}
                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 font-mono"
                      >
                        {r.reference_number}
                      </Link>
                      <p className="mt-1 text-sm text-gray-500">
                        Source: {r.source.replace(/_/g, " ")}
                        {r.reason ? ` · ${r.reason.slice(0, 100)}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                        {r.status.replace(/_/g, " ")}
                      </span>
                      {(r.status === "submitted" || r.status === "under_review") &&
                        (canReviewReferral || canRejectReferral) && (
                          <ApproveRejectButtons
                            url={`/api/referrals/${r.id}`}
                            approveBody={{ new_status: "admitted" }}
                            rejectBody={{ new_status: "rejected" }}
                            showApprove={canReviewReferral}
                            showReject={canRejectReferral}
                          />
                        )}
                    </div>
                  </div>
                </li>
              ),
            )}
          </ul>
          )}
        </div>
      )}

      {/* Admission — linked intake record */}
      {admissions !== null && (
        <div className="bg-white shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg font-medium text-gray-900">Admission</h2>
          </div>
          {admissions.length === 0 ? (
            <p className="border-t border-gray-200 px-4 py-5 sm:px-6 text-sm text-gray-500">
              No admission linked to this child yet.
            </p>
          ) : (
          <ul className="border-t border-gray-200 divide-y divide-gray-200">
            {admissions.map(
              (a: {
                id: string;
                reference_number: string;
                status: string;
                decision: string | null;
                admitted_date: string | null;
              }) => (
                <li key={a.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/admissions/${a.id}`}
                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 font-mono"
                      >
                        {a.reference_number}
                      </Link>
                      <p className="mt-1 text-sm text-gray-500">
                        {a.decision ? `${a.decision.slice(0, 100)}` : "Awaiting review"}
                        {a.admitted_date
                          ? ` · Admitted ${new Date(a.admitted_date).toLocaleDateString()}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                        {a.status}
                      </span>
                      {a.status === "pending" && canReviewAdmission && (
                        <ApproveRejectButtons
                          url={`/api/admissions/${a.id}`}
                          approveBody={{ new_status: "approved" }}
                          rejectBody={{ new_status: "denied" }}
                        />
                      )}
                    </div>
                  </div>
                </li>
              ),
            )}
          </ul>
          )}
        </div>
      )}

      {/* Placement — linked intake record */}
      {placements !== null && (
        <div className="bg-white shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Placement</h2>
          </div>
          {placements.length === 0 ? (
            <p className="border-t border-gray-200 px-4 py-5 sm:px-6 text-sm text-gray-500">
              No placement recorded for this child yet.
            </p>
          ) : (
          <ul className="border-t border-gray-200 divide-y divide-gray-200">
            {placements.map(
              (p: {
                id: string;
                reference_number: string;
                status: string;
                placement_type: string;
                start_date: string;
              }) => (
                <li key={p.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-gray-900 font-mono">
                        {p.reference_number}
                      </span>
                      <p className="mt-1 text-sm text-gray-500">
                        {p.placement_type} · from {new Date(p.start_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                        {p.status}
                      </span>
                      {isManager && p.status === "active" && (
                        <ApproveRejectButtons
                          url={`/api/placements/${p.id}`}
                          approveBody={{ new_status: "discharged" }}
                          rejectBody={{}}
                          showApprove
                          showReject={false}
                          approveLabel="End"
                          confirmMessage="End (discharge) this placement?"
                        />
                      )}
                    </div>
                  </div>
                </li>
              ),
            )}
          </ul>
          )}
          {canAddPlacement && (
            <div className="border-t border-gray-200">
              <AddPlacementForm childId={child.id} />
            </div>
          )}
        </div>
      )}

      {/* Guardians / Family */}
      {guardians !== null && (
      <div className="bg-white shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">
            Guardians & Family
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            People linked to this child (relationship, primary contact, phone)
          </p>
        </div>
        <div className="border-t border-gray-200">
          {guardians.length === 0 ? (
            <p className="px-4 py-5 sm:px-6 text-sm text-gray-500">
              No guardians linked to this child yet.
            </p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {guardians.map(
                (rel: {
                  id: string;
                  guardian_id: string;
                  relationship_type: string;
                  is_primary: boolean;
                  is_active: boolean;
                  guardian?: {
                    first_name: string;
                    middle_name: string | null;
                    last_name: string;
                    phone: string | null;
                  } | null;
                }) => {
                  const g = rel.guardian;
                  const name = g
                    ? `${g.first_name}${g.middle_name ? ` ${g.middle_name}` : ""} ${g.last_name}`
                    : "Unknown guardian";
                  return (
                    <li key={rel.id} className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/guardians/${rel.guardian_id}`}
                            className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
                          >
                            {name}
                          </Link>
                          <div className="mt-1 text-sm text-gray-500">
                            {rel.relationship_type.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                            {g?.phone ? ` · ${g.phone}` : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {rel.is_primary && (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                              Primary
                            </span>
                          )}
                          {canLinkGuardian && rel.is_active !== false && (
                            <ApproveRejectButtons
                              url={`/api/guardians/relationships/${rel.id}`}
                              approveBody={{ is_active: false }}
                              rejectBody={{}}
                              showApprove
                              showReject={false}
                              approveLabel="End link"
                              confirmMessage="End this guardian link?"
                            />
                          )}
                        </div>
                      </div>
                    </li>
                  );
                },
              )}
            </ul>
          )}
          {canLinkGuardian && (
            <div className="border-t border-gray-200">
              <LinkGuardianForm childId={child.id} />
            </div>
          )}
        </div>
      </div>
      )}

      {/* Health — emergency info scoped to the role */}
      {health !== null && (
        <div className="bg-white shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Health</h2>
              <p className="mt-1 text-sm text-gray-500">
                Emergency information necessary for care
              </p>
            </div>
            {canViewHealthModule && (
              <Link
                href={`/health?child_id=${child.id}`}
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
              >
                Full health records
              </Link>
            )}
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <HealthSummary health={health} />
          </div>
        </div>
      )}

      {/* Status History */}
      {history.length > 0 && (
        <div className="bg-white shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg font-medium text-gray-900">
              Status History
            </h2>
          </div>
          <div className="border-t border-gray-200">
            <ul className="divide-y divide-gray-200">
              {history.map(
                (entry: {
                  id: string;
                  previous_status: string | null;
                  new_status: string;
                  changed_at: string;
                  reason: string | null;
                }) => (
                  <li key={entry.id} className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={entry.new_status} />
                      {entry.previous_status && (
                        <span className="text-sm text-gray-500">
                          from {entry.previous_status}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      {new Date(entry.changed_at).toLocaleString()}
                      {entry.reason && ` — ${entry.reason}`}
                    </div>
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Activity / Audit History */}
      <div className="bg-white shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">Activity History</h2>
          <p className="mt-1 text-sm text-gray-500">
            Audit trail of changes made to this child&apos;s record.
          </p>
        </div>
        <AuditHistory entityType="child" entityId={child.id} />
      </div>

      {/* Education & Development */}
      <div className="bg-white shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">
              Education & Development
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Profile, support needs, goals, progress and achievements
            </p>
          </div>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Link
              href={`/education/profile?child_id=${child.id}`}
              className="rounded-lg border p-4 text-center hover:border-indigo-300 hover:bg-indigo-50"
            >
              <div className="text-2xl">🎓</div>
              <div className="mt-1 text-sm font-medium text-gray-900">
                Education Profile
              </div>
            </Link>
            <Link
              href={`/education/support-needs?child_id=${child.id}`}
              className="rounded-lg border p-4 text-center hover:border-indigo-300 hover:bg-indigo-50"
            >
              <div className="text-2xl">📚</div>
              <div className="mt-1 text-sm font-medium text-gray-900">
                Support Needs
              </div>
            </Link>
            <Link
              href={`/education/goals?child_id=${child.id}`}
              className="rounded-lg border p-4 text-center hover:border-indigo-300 hover:bg-indigo-50"
            >
              <div className="text-2xl">🎯</div>
              <div className="mt-1 text-sm font-medium text-gray-900">
                Development Goals
              </div>
            </Link>
            <Link
              href={`/education/progress?child_id=${child.id}`}
              className="rounded-lg border p-4 text-center hover:border-indigo-300 hover:bg-indigo-50"
            >
              <div className="text-2xl">📈</div>
              <div className="mt-1 text-sm font-medium text-gray-900">
                Progress
              </div>
            </Link>
            <Link
              href={`/education/achievements?child_id=${child.id}`}
              className="rounded-lg border p-4 text-center hover:border-indigo-300 hover:bg-indigo-50"
            >
              <div className="text-2xl">🏆</div>
              <div className="mt-1 text-sm font-medium text-gray-900">
                Achievements
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Resources & Support */}
      <div className="bg-white shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">
              Resources & Support
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Source → Fund → Expense → Benefit received by this child
            </p>
          </div>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          {benefits === null ? (
            <p className="text-sm text-gray-500">
              You do not have permission to view resource support, or this
              module is unavailable.
            </p>
          ) : benefits.length === 0 ? (
            <p className="text-sm text-gray-500">
              No support/benefits recorded for this child yet.
            </p>
          ) : (
            <div className="space-y-3">
              {(
                benefits as {
                  id: string;
                  benefit_type: string;
                  description: string | null;
                  benefit_date: string | null;
                  expense?: {
                    id: string;
                    description: string | null;
                    amount: number;
                    fund?: {
                      id: string;
                      fund_name: string;
                      source?: { id: string; source_name: string } | null;
                    } | null;
                  } | null;
                }[]
              ).map((b) => (
                <Link
                  key={b.id}
                  href={`/resources/benefits/${b.id}`}
                  className="block rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">
                      {getBenefitTypeDisplay(b.benefit_type as never)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {b.benefit_date
                        ? new Date(b.benefit_date).toLocaleDateString()
                        : "No date"}
                    </span>
                  </div>
                  {b.description && (
                    <p className="mt-1 text-sm text-gray-500">{b.description}</p>
                  )}
                  <p className="mt-2 text-xs text-gray-400">
                    {b.expense?.fund?.source?.source_name ?? "No source"} →{" "}
                    {b.expense?.fund?.fund_name ?? "No fund"} →{" "}
                    {b.expense?.description ?? "No expense"}{" "}
                    {b.expense?.amount != null && `(${formatTsh(b.expense.amount)})`}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Caregiver Assignment (managers only) */}
      {canManageAssignments && <CaregiverAssignment childId={child.id} currentUserId={""} />}

      {/* Benefits */}
    </div>
  );
}
