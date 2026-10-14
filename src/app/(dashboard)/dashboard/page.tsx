import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { getUserRoleName, can } from "@/lib/auth/authorization.service";
import { listCaregiverChildren } from "@/lib/caregivers/caregiver.service";
import { getSiteTheme, listSitePages } from "@/lib/centre-site/centre-site.service";
import ApproveRejectButtons from "@/app/(dashboard)/_components/approve-reject-buttons";
import PackageApproveButtons from "@/app/(dashboard)/dashboard/_components/package-approve-buttons";
import WithdrawButton from "@/app/(dashboard)/_components/withdraw-button";
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
  withdrawUrl?: string;
  showWithdraw?: boolean;
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
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm md:col-span-2">
      <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-4">
        <h3 className="text-sm font-semibold text-zinc-900">
          {title} <span className="ml-1 text-zinc-400">({items.length})</span>
        </h3>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-zinc-400">{empty}</p>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {items.map((item) => (
            <li key={`${item.kind}-${item.id}`} className="flex items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700">
                    {item.kind}
                  </span>
                  <Link href={item.href} className="truncate text-sm font-semibold text-zinc-600 hover:text-zinc-700">
                    {item.title}
                  </Link>
                </div>
                <p className="mt-0.5 truncate text-xs text-zinc-400">{item.subtitle}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <ApproveRejectButtons
                  url={item.url}
                  approveBody={item.approveBody}
                  rejectBody={item.rejectBody}
                  showApprove={item.showApprove}
                  showReject={item.showReject}
                />
                {item.showWithdraw && item.withdrawUrl && (
                  <WithdrawButton url={item.withdrawUrl} />
                )}
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
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {title}
      </h3>
      <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">{value}</p>
      <Link
        href={href}
        className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-zinc-600 hover:text-zinc-700"
      >
        {linkText}
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {ctx.centre?.name ?? ""} — {roleName?.replace(/_/g, " ") ?? "Staff"}
        </p>
      </div>

      {restricted && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
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

      {roleName === "CENTRE_IT" && <ItSection />}
    </div>
  );
}

async function ItSection() {
  const supabase = await createClient();
  const ctx = await requireAppAccess(supabase as never, {
    allowInactiveSubscription: true,
  });

  let publishedCount = 0;
  let draftCount = 0;
  let siteUrl = "#";
  try {
    const admin = createAdminClient();
    const pages = await listSitePages(admin, ctx.centre.id);
    publishedCount = pages.data.filter((p) => p.is_published).length;
    draftCount = pages.data.length - publishedCount;
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    siteUrl = `${base}/s/${ctx.centre.code}`;
    await getSiteTheme(admin, ctx.centre.id);
  } catch {
    // keep zeros
  }

  return (
    <div className="mt-6 grid gap-5 md:grid-cols-2 max-w-4xl">
      <Card title="Published pages" value={String(publishedCount)} href="/centre-site" linkText="Manage Pages" />
      <Card title="Draft pages" value={String(draftCount)} href="/centre-site" linkText="Manage Pages" />
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Public website
        </h3>
        <p className="mt-2 text-sm text-zinc-500">
          Your centre&apos;s own public site — build pages and appearance here.
        </p>
        <Link
          href="/centre-site"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800"
        >
          Open Website Builder
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Preview
        </h3>
        <p className="mt-2 text-sm text-zinc-500">
          Only published pages are visible to visitors.
        </p>
        <a
          href={siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-zinc-600 hover:text-zinc-700"
        >
          View live site
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </a>
      </div>
    </div>
  );
}

async function SocialWorkerSection({ restricted }: { restricted: boolean }) {
  const supabase = await createClient();
  const ctx = await requireAppAccess(supabase as never, {
    allowInactiveSubscription: true,
  });
  const [refSubmitted, refUnderReview, openCases, openSafeguarding, upcomingVisits, swCanReview, swCanReject, swCanWithdraw] =
    await Promise.all([
      fetchList("/api/referrals?status=submitted&limit=20"),
      fetchList("/api/referrals?status=under_review&limit=20"),
      fetchCount("/api/cases?status=open&limit=1"),
      fetchCount("/api/safeguarding?status=open&limit=1"),
      fetchCount("/api/visits?status=scheduled&limit=1"),
      can(supabase as never, ctx, "referrals.review").catch(() => false),
      can(supabase as never, ctx, "referrals.reject").catch(() => false),
      can(supabase as never, ctx, "referrals.update").catch(() => false),
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
    withdrawUrl: `/api/referrals/${String(r.id)}`,
    showWithdraw: swCanWithdraw && !swCanReview && !swCanReject,
  }));

  return (
    <div className="mt-6 grid gap-5 md:grid-cols-2 max-w-4xl">
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
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm md:col-span-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Quick links
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            ["/register", "New Registration"],
            ["/children", "Children"],
            ["/health", "Health"],
            ["/education", "Education"],
          ].map(([href, text]) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-care-200 hover:bg-zinc-100 hover:text-zinc-700"
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

  const allReferrals = [...refSubmitted, ...refUnderReview];
  const admissionByReferral = new Map(
    admPending.map((a) => [String(a.referral_id), a]),
  );
  // Guardians submitted with each referral (shown inside the package).
  const guardiansByReferral = new Map<string, string[]>();
  await Promise.all(
    allReferrals.map(async (r) => {
      const list = await fetchList(
        `/api/guardians?referral_id=${String(r.id)}&limit=20`,
      );
      guardiansByReferral.set(
        String(r.id),
        list.map((g) =>
          `${String(g.first_name ?? "")} ${String(g.last_name ?? "")}`.trim(),
        ),
      );
    }),
  );

  const packages = allReferrals.map((r) => {
    const refId = String(r.id);
    const adm = admissionByReferral.get(refId) as Record<string, unknown> | undefined;
    return {
      referralId: refId,
      admissionId: adm ? String(adm.id) : null,
      childName:
        `${String(r.child_first_name ?? "")} ${String(r.child_last_name ?? "")}`.trim() ||
        "Unnamed referral",
      referralRef: String(r.reference_number ?? ""),
      referralStatus: String(r.status ?? ""),
      admissionRef: adm ? String(adm.reference_number ?? "") : null,
      guardians: guardiansByReferral.get(refId) ?? [],
    };
  });

  return (
    <div className="mt-6 grid gap-5 md:grid-cols-2 max-w-4xl">
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
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm md:col-span-2">
        <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-4">
          <h3 className="text-sm font-semibold text-zinc-900">
            Pending intake packages <span className="ml-1 text-zinc-400">({packages.length})</span>
          </h3>
          <p className="mt-0.5 text-xs text-zinc-400">
            Referral + admission + guardians as one thing — approve or reject together.
          </p>
        </div>
        {packages.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-zinc-400">
            No referrals, admissions or guardians awaiting review.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {packages.map((p) => (
              <li key={p.referralId} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900">{p.childName}</p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      Referral {p.referralRef} ({p.referralStatus.replace(/_/g, " ")})
                      {p.admissionRef ? ` · Admission ${p.admissionRef}` : " · No admission yet"}
                      {p.guardians.length > 0 ? ` · Guardians: ${p.guardians.join(", ")}` : ""}
                    </p>
                  </div>
                  <PackageApproveButtons referralId={p.referralId} admissionId={p.admissionId} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm md:col-span-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Quick links
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            ["/team", "Team & Staff"],
            ["/audit", "Audit Trail"],
            ["/resources", "Resources"],
          ].map(([href, text]) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-care-200 hover:bg-zinc-100 hover:text-zinc-700"
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
    <div className="mt-6 grid gap-5 md:grid-cols-2 max-w-4xl">
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
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Registration
        </h3>
        <p className="mt-2 text-sm text-zinc-500">
          Register a child from an approved admission: child, guardian and placement in one flow.
        </p>
        <Link
          href="/register"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800"
        >
          New Registration
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
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
    <div className="mt-6 grid gap-5 md:grid-cols-2 max-w-4xl">
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
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Quick links
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            ["/resources/sources", "Sources"],
            ["/resources/expenses/new", "New Expense"],
            ["/resources/benefits", "Benefits"],
          ].map(([href, text]) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-care-200 hover:bg-zinc-100 hover:text-zinc-700"
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
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="px-6 py-5">
          <h2 className="text-lg font-semibold text-zinc-900">
            My Assigned Children ({assigned.length})
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            You can only see and record care for these children.
          </p>
        </div>
        {assigned.length === 0 ? (
          <p className="border-t border-zinc-100 px-6 py-8 text-center text-sm text-zinc-400">
            No children are currently assigned to you. Please contact your centre manager.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 border-t border-zinc-100">
            {assigned.map((a) => (
              <li key={a.child_id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    {a.child
                      ? `${a.child.first_name} ${a.child.last_name}`
                      : "Child"}
                  </p>
                  {a.child?.reference_number && (
                    <p className="mt-0.5 font-mono text-xs text-zinc-400">{a.child.reference_number}</p>
                  )}
                </div>
                <Link
                  href={`/children/${a.child_id}`}
                  className="text-sm font-semibold text-zinc-600 hover:text-zinc-700"
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
