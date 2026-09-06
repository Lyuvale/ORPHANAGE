import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { getUserRoleName, can } from "@/lib/auth/authorization.service";
import { listCaregiverChildren } from "@/lib/caregivers/caregiver.service";
import ApproveRejectButtons from "@/app/(dashboard)/_components/approve-reject-buttons";
import { serverFetch } from "@/lib/server-fetch";

function baseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

async function fetchCount(path: string): Promise<number | null> {
  try {
    const res = await serverFetch(`${baseUrl()}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    if (typeof json.count === "number") return json.count;
    if (Array.isArray(json.data)) return json.data.length;
    return null;
  } catch {
    return null;
  }
}

async function fetchSubscriptionStatus(): Promise<string | null> {
  try {
    const res = await serverFetch(`${baseUrl()}/api/subscriptions/mine`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    const sub = json.data?.subscription;
    return (sub?.status as string | undefined) ?? (json.data ? "unknown" : null);
  } catch {
    return null;
  }
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

export type PendingItem = {
  id: string;
  kind: string;
  title: string;
  subtitle: string;
  href: string;
  url: string;
  approveBody: Record<string, unknown>;
  rejectBody: Record<string, unknown>;
  showApprove: boolean;
  showReject: boolean;
};

function PendingReviews({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: PendingItem[];
}) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden md:col-span-2">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">
          {title} ({items.length})
        </h3>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-5 text-sm text-gray-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {items.map((item) => (
            <li key={`${item.kind}-${item.id}`} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                    {item.kind}
                  </span>
                  <Link href={item.href} className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 truncate">
                    {item.title}
                  </Link>
                </div>
                <p className="text-xs text-gray-500 truncate">{item.subtitle}</p>
              </div>
              <div className="shrink-0">
                <ApproveRejectButtons
                  url={item.url}
                  approveBody={item.approveBody}
                  rejectBody={item.rejectBody}
                  showApprove={item.showApprove}
                  showReject={item.showReject}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Card({
  title,
  value,
  href,
  linkText,
}: {
  title: string;
  value: string;
  href: string;
  linkText: string;
}) {
  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
        {title}
      </h3>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
      <Link
        href={href}
        className="mt-3 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-500"
      >
        {linkText} →
      </Link>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const ctx = await requireAppAccess(supabase as never, {
    allowInactiveSubscription: true,
  });
  const roleName = await getUserRoleName(supabase as never, ctx);

  const restricted = !ctx.isSubscriptionValid;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="text-sm text-gray-500 mt-1">
        {ctx.centre?.name ?? ""} — {roleName?.replace(/_/g, " ") ?? "Staff"}
      </p>

      {restricted && (
        <div className="mt-6 rounded-md bg-amber-50 border border-amber-200 p-4">
          <p className="text-sm text-amber-800">
            Your centre&apos;s subscription is currently inactive, so normal
            services are restricted.
          </p>
          <Link
            href="/subscriptions"
            className="mt-2 inline-block text-sm font-semibold text-amber-900 underline"
          >
            Go to Subscriptions to pay and reactivate
          </Link>
        </div>
      )}

      {roleName === "CENTRE_MANAGER" && (
        <ManagerSection restricted={restricted} />
      )}

      {roleName === "SOCIAL_WORKER" && (
        <SocialWorkerSection restricted={restricted} />
      )}

      {roleName === "CAREGIVER" && <CaregiverSection />}

      {roleName === "RECORDS_OFFICER" && (
        <RecordsSection restricted={restricted} />
      )}

      {roleName === "ACCOUNTANT_BURSAR" && (
        <AccountantSection restricted={restricted} />
      )}
    </div>
  );
}

async function SocialWorkerSection({ restricted }: { restricted: boolean }) {
  const supabase = await createClient();
  const ctx = await requireAppAccess(supabase as never, {
    allowInactiveSubscription: true,
  });
  const [refSubmitted, refUnderReview, openCases, openSafeguarding, upcomingVisits, swCanReview, swCanReject] =
    await Promise.all([
      fetchList("/api/referrals?status=submitted&limit=20"),
      fetchList("/api/referrals?status=under_review&limit=20"),
      fetchCount("/api/cases?status=open&limit=1"),
      fetchCount("/api/safeguarding?status=open&limit=1"),
      fetchCount("/api/visits?status=scheduled&limit=1"),
      can(supabase as never, ctx, "referrals.review").catch(() => false),
      can(supabase as never, ctx, "referrals.reject").catch(() => false),
    ]);

  void restricted;

  const pendingReferrals: PendingItem[] = [...refSubmitted, ...refUnderReview].map((r) => ({
    id: String(r.id),
    kind: "Referral",
    title: `${String(r.child_first_name ?? "")} ${String(r.child_last_name ?? "")}`.trim() || "Unnamed referral",
    subtitle: `${String(r.source ?? "").replace(/_/g, " ")} · ${String(r.status ?? "")}`,
    href: `/referrals/${String(r.id)}`,
    url: `/api/referrals/${String(r.id)}`,
    approveBody: { new_status: "admitted" },
    rejectBody: { new_status: "rejected" },
    showApprove: swCanReview,
    showReject: swCanReject,
  }));

  return (
    <div className="mt-6 grid gap-6 md:grid-cols-2 max-w-4xl">
      <PendingReviews
        title="Referrals awaiting review"
        empty="No referrals awaiting review."
        items={pendingReferrals}
      />
      <Card
        title="Open cases"
        value={openCases === null ? "—" : String(openCases)}
        href="/cases"
        linkText="Open Cases"
      />
      <Card
        title="Open safeguarding"
        value={openSafeguarding === null ? "—" : String(openSafeguarding)}
        href="/safeguarding"
        linkText="Open Safeguarding"
      />
      <Card
        title="Upcoming visits"
        value={upcomingVisits === null ? "—" : String(upcomingVisits)}
        href="/visits"
        linkText="Open Visits"
      />
      <div className="bg-white rounded-lg border p-6 md:col-span-2">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
          Quick links
        </h3>
        <div className="mt-3 flex flex-wrap gap-3">
          {[
            ["/register", "New Registration"],
            ["/children", "Children"],
            ["/health", "Health"],
            ["/education", "Education"],
          ].map(([href, text]) => (
            <Link
              key={href}
              href={href}
              className="rounded-md bg-white border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {text}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

async function ManagerSection({ restricted }: { restricted: boolean }) {
  const [childrenCount, staffCount, subStatus, refSubmitted, refUnderReview, admPending] =
    await Promise.all([
      fetchCount("/api/children?limit=1"),
      fetchCount("/api/staff?limit=1"),
      fetchSubscriptionStatus(),
      fetchList("/api/referrals?status=submitted&limit=20"),
      fetchList("/api/referrals?status=under_review&limit=20"),
      fetchList("/api/admissions?status=pending&limit=20"),
    ]);

  const pendingReferrals: PendingItem[] = [...refSubmitted, ...refUnderReview].map((r) => ({
    id: String(r.id),
    kind: "Referral",
    title: `${String(r.child_first_name ?? "")} ${String(r.child_last_name ?? "")}`.trim() || "Unnamed referral",
    subtitle: `${String(r.source ?? "").replace(/_/g, " ")} · ${String(r.status ?? "")}`,
    href: `/referrals/${String(r.id)}`,
    url: `/api/referrals/${String(r.id)}`,
    approveBody: { new_status: "admitted" },
    rejectBody: { new_status: "rejected" },
    showApprove: true,
    showReject: true,
  }));
  const pendingAdmissions: PendingItem[] = admPending.map((a) => ({
    id: String(a.id),
    kind: "Admission",
    title: String(a.reference_number ?? "Admission"),
    subtitle: String((a.decision as string) ?? "awaiting review").slice(0, 80),
    href: `/admissions/${String(a.id)}`,
    url: `/api/admissions/${String(a.id)}`,
    approveBody: { new_status: "approved" },
    rejectBody: { new_status: "denied" },
    showApprove: true,
    showReject: true,
  }));

  return (
    <div className="mt-6 grid gap-6 md:grid-cols-2 max-w-4xl">
      <Card
        title="Children in care"
        value={childrenCount === null ? "—" : String(childrenCount)}
        href="/children"
        linkText="Open Children"
      />
      <Card
        title="Team members"
        value={staffCount === null ? "—" : String(staffCount)}
        href="/team"
        linkText="Manage Team"
      />
      <Card
        title="Subscription"
        value={restricted ? "Inactive" : (subStatus ?? "Active")}
        href="/subscriptions"
        linkText="Open Subscriptions"
      />
      <PendingReviews
        title="Pending intake reviews"
        empty="No referrals or admissions awaiting review."
        items={[...pendingReferrals, ...pendingAdmissions]}
      />
      <div className="bg-white rounded-lg border p-6 md:col-span-2">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
          Quick links
        </h3>
        <div className="mt-3 flex flex-wrap gap-3">
          {[
            ["/team", "Team & Staff"],
            ["/audit", "Audit Trail"],
            ["/resources", "Resources"],
          ].map(([href, text]) => (
            <Link
              key={href}
              href={href}
              className="rounded-md bg-white border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {text}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

async function RecordsSection({ restricted }: { restricted: boolean }) {
  const [childrenCount, approvedAdmissions] = await Promise.all([
    fetchCount("/api/children?limit=1"),
    fetchList("/api/admissions?status=approved&limit=50"),
  ]);

  void restricted;

  const awaiting = approvedAdmissions.filter((a) => !(a.child_id as string | null));

  return (
    <div className="mt-6 grid gap-6 md:grid-cols-2 max-w-4xl">
      <Card
        title="Children registered"
        value={childrenCount === null ? "—" : String(childrenCount)}
        href="/children"
        linkText="Open Children"
      />
      <Card
        title="Approved admissions awaiting registration"
        value={String(awaiting.length)}
        href="/register"
        linkText="Register now"
      />
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
          Registration
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          Register a child from an approved admission: child, guardian and placement in one flow.
        </p>
        <Link
          href="/register"
          className="mt-3 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          New Registration →
        </Link>
      </div>
    </div>
  );
}

async function AccountantSection({ restricted }: { restricted: boolean }) {
  const [pendingExpenses, fundsCount, assetsCount] = await Promise.all([
    fetchCount("/api/resources/expenses?status=PENDING&limit=1"),
    fetchCount("/api/resources/funds?limit=1"),
    fetchCount("/api/resources/assets?limit=1"),
  ]);

  void restricted;

  return (
    <div className="mt-6 grid gap-6 md:grid-cols-2 max-w-4xl">
      <Card
        title="Expenses pending approval"
        value={pendingExpenses === null ? "—" : String(pendingExpenses)}
        href="/resources/expenses?status=PENDING"
        linkText="Review expenses"
      />
      <Card
        title="Funds"
        value={fundsCount === null ? "—" : String(fundsCount)}
        href="/resources/funds"
        linkText="Open Funds"
      />
      <Card
        title="Assets"
        value={assetsCount === null ? "—" : String(assetsCount)}
        href="/resources/assets"
        linkText="Open Assets"
      />
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
          Quick links
        </h3>
        <div className="mt-3 flex flex-wrap gap-3">
          {[
            ["/resources/sources", "Sources"],
            ["/resources/expenses/new", "New Expense"],
            ["/resources/benefits", "Benefits"],
          ].map(([href, text]) => (
            <Link
              key={href}
              href={href}
              className="rounded-md bg-white border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {text}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

async function CaregiverSection() {
  const supabase = await createClient();
  const ctx = await requireAppAccess(supabase as never, {
    allowInactiveSubscription: true,
  });

  let assigned: {
    child_id: string;
    child?: { id: string; first_name: string; last_name: string; reference_number: string } | null;
  }[] = [];
  try {
    const admin = createAdminClient();
    assigned = await listCaregiverChildren(admin, ctx.profile.id);
  } catch {
    assigned = [];
  }

  return (
    <div className="mt-6 max-w-3xl">
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">
            My Assigned Children ({assigned.length})
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            You can only see and record care for these children.
          </p>
        </div>
        {assigned.length === 0 ? (
          <p className="border-t border-gray-200 px-4 py-5 sm:px-6 text-sm text-gray-500">
            No children are currently assigned to you. Please contact your centre manager.
          </p>
        ) : (
          <ul className="border-t border-gray-200 divide-y divide-gray-200">
            {assigned.map((a) => (
              <li key={a.child_id} className="px-4 py-4 sm:px-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {a.child
                      ? `${a.child.first_name} ${a.child.last_name}`
                      : "Child"}
                  </p>
                  {a.child?.reference_number && (
                    <p className="text-xs text-gray-400 font-mono">{a.child.reference_number}</p>
                  )}
                </div>
                <Link
                  href={`/children/${a.child_id}`}
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
                >
                  Open →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
