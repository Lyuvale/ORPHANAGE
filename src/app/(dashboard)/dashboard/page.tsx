import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { getUserRoleName } from "@/lib/auth/authorization.service";
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
    </div>
  );
}

async function SocialWorkerSection({ restricted }: { restricted: boolean }) {
  const [pendingReferrals, openCases, openSafeguarding, upcomingVisits] =
    await Promise.all([
      fetchCount("/api/referrals?status=submitted&limit=1"),
      fetchCount("/api/cases?status=open&limit=1"),
      fetchCount("/api/safeguarding?status=open&limit=1"),
      fetchCount("/api/visits?status=scheduled&limit=1"),
    ]);

  void restricted;

  return (
    <div className="mt-6 grid gap-6 md:grid-cols-2 max-w-4xl">
      <Card
        title="Pending referrals"
        value={pendingReferrals === null ? "—" : String(pendingReferrals)}
        href="/referrals?status=submitted"
        linkText="Review referrals"
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
            ["/guardians", "Guardians"],
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
  const [childrenCount, staffCount, pendingReferrals, subStatus] =
    await Promise.all([
      fetchCount("/api/children?limit=1"),
      fetchCount("/api/staff?limit=1"),
      fetchCount("/api/referrals?status=submitted&limit=1"),
      fetchSubscriptionStatus(),
    ]);

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
        title="Pending referrals"
        value={pendingReferrals === null ? "—" : String(pendingReferrals)}
        href="/referrals?status=submitted"
        linkText="Review referrals"
      />
      <Card
        title="Subscription"
        value={restricted ? "Inactive" : (subStatus ?? "Active")}
        href="/subscriptions"
        linkText="Open Subscriptions"
      />
      <div className="bg-white rounded-lg border p-6 md:col-span-2">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
          Quick links
        </h3>
        <div className="mt-3 flex flex-wrap gap-3">
          {[
            ["/team", "Team"],
            ["/staff", "Staff"],
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
