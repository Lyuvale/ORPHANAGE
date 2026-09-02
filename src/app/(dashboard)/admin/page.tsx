import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { getUserRoleName } from "@/lib/auth/authorization.service";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = (await createClient()) as never;
  let ctx;
  try {
    ctx = await requireAppAccess(supabase, { allowInactiveSubscription: true });
  } catch {
    redirect("/login");
  }

  const roleName = await getUserRoleName(supabase, ctx);
  if (roleName !== "PLATFORM_ADMINISTRATOR") {
    redirect("/children");
  }

  const admin = createAdminClient();

  // ── Parallel data queries (fetch data, not head:true) ─────
  const [
    centresRes,
    activeCentresRes,
    subsData,
    activeSubsData,
    paymentsRes,
    recentCentresRes,
    recentSubsRes,
    auditRes,
    staffData,
    childrenData,
  ] = await Promise.all([
    admin.from("centres").select("id"),
    admin.from("centres").select("id").eq("status", "active"),
    admin.from("subscriptions").select("id, status"),
    admin.from("subscriptions").select("id").eq("status", "active"),
    admin
      .from("payment_transactions")
      .select("id, amount, currency, status, flow_type, created_at")
      .order("created_at", { ascending: false }),
    admin
      .from("centres")
      .select("id, name, code, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    admin
      .from("subscriptions")
      .select(`
        id, status, start_date, end_date, created_at,
        centres:centre_id (id, name, code),
        plans:plan_id (id, name, price, billing_period)
      `)
      .order("created_at", { ascending: false })
      .limit(5),
    admin
      .from("audit_log")
      .select("id, action, entity_type, entity_id, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    admin.from("user_profiles").select("id, centre_id").eq("status", "active"),
    admin.from("children").select("id").eq("status", "active"),
  ]);

  // ── Compute counts from fetched data ──────────────────────
  const totalCentres = (centresRes.data ?? []).length;
  const activeCentres = (activeCentresRes.data ?? []).length;
  const totalSubs = (subsData.data ?? []).length;
  const activeSubs = (activeSubsData.data ?? []).length;
  const totalStaff = (staffData.data ?? []).length;
  const totalChildren = (childrenData.data ?? []).length;

  // ── Compute payment stats ──────────────────────────────────
  const allPayments = (paymentsRes.data ?? []) as Record<string, unknown>[];
  const totalRevenue = allPayments
    .filter((p) => p.status === "SUCCESSFUL")
    .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
  const pendingAmount = allPayments
    .filter((p) => p.status === "PENDING")
    .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
  const contributionTotal = allPayments
    .filter((p) => p.flow_type === "CONTRIBUTION" && p.status === "SUCCESSFUL")
    .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
  const subscriptionTotal = allPayments
    .filter((p) => p.flow_type === "SUBSCRIPTION" && p.status === "SUCCESSFUL")
    .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

  // ── KPI cards ──────────────────────────────────────────────
  const kpiCards = [
    {
      label: "Total Centres",
      value: totalCentres,
      sub: `${activeCentres} active`,
      icon: "🏛",
      color: "bg-indigo-50 text-indigo-700",
      href: "/admin/centres",
    },
    {
      label: "Total Staff",
      value: totalStaff,
      sub: "across all centres",
      icon: "👥",
      color: "bg-blue-50 text-blue-700",
      href: "/admin/centres",
    },
    {
      label: "Children Enrolled",
      value: totalChildren,
      sub: "active children",
      icon: "👶",
      color: "bg-emerald-50 text-emerald-700",
      href: null,
    },
    {
      label: "Subscriptions",
      value: totalSubs,
      sub: `${activeSubs} active`,
      icon: "📋",
      color: "bg-amber-50 text-amber-700",
      href: "/admin/subscriptions",
    },
    {
      label: "Revenue Collected",
      value: `TZS ${totalRevenue.toLocaleString()}`,
      sub: `${allPayments.filter((p) => p.status === "SUCCESSFUL").length} successful`,
      icon: "💰",
      color: "bg-green-50 text-green-700",
      href: "/admin/payments",
    },
    {
      label: "Pending Payments",
      value: `TZS ${pendingAmount.toLocaleString()}`,
      sub: `${allPayments.filter((p) => p.status === "PENDING").length} awaiting`,
      icon: "⏳",
      color: "bg-orange-50 text-orange-700",
      href: "/admin/payments",
    },
  ];

  // ── Revenue breakdown ──────────────────────────────────────
  const revenueBreakdown = [
    { label: "Contributions", amount: contributionTotal, color: "bg-sky-500" },
    { label: "Subscriptions", amount: subscriptionTotal, color: "bg-indigo-500" },
  ];
  const maxRevenue = Math.max(contributionTotal + subscriptionTotal, 1);

  // ── Recent centres ─────────────────────────────────────────
  const recentCentres = (recentCentresRes.data ?? []) as Record<string, unknown>[];

  // ── Recent subscriptions ───────────────────────────────────
  const recentSubs = (recentSubsRes.data ?? []) as Record<string, unknown>[];

  // ── Audit trail ────────────────────────────────────────────
  const auditEntries = (auditRes.data ?? []) as Record<string, unknown>[];

  const ACTION_LABELS: Record<string, string> = {
    CENTRE_CREATED: "Centre created",
    CENTRE_STATUS_CHANGED: "Centre status changed",
    CENTRE_UPDATED: "Centre updated",
    LOGIN: "Login",
    ROLE_CHANGED: "Role changed",
    ACCOUNT_DEACTIVATED: "Account deactivated",
    ACCOUNT_ACTIVATED: "Account activated",
  };

  return (
    <div className="space-y-8">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Dashboard</h1>
          <p className="text-sm text-gray-500">Overview of all centres, subscriptions and payments</p>
        </div>
        <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          PLATFORM ADMIN
        </span>
      </div>

      {/* ── KPI Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpiCards.map((kpi) => {
          const cardContent = (
            <div className={`group rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md ${kpi.color.split(" ")[0]} hover:border-current`}>
              <div className="flex items-center justify-between">
                <span className="text-2xl">{kpi.icon}</span>
                {kpi.href && <span className="text-xs text-gray-400 group-hover:text-gray-600">→</span>}
              </div>
              <p className="mt-3 text-2xl font-bold text-gray-900">{kpi.value}</p>
              <p className="text-sm text-gray-500">{kpi.label}</p>
              <p className={`mt-1 text-xs font-medium ${kpi.color.split(" ")[1]}`}>{kpi.sub}</p>
            </div>
          );

          if (kpi.href) {
            return (
              <Link key={kpi.label} href={kpi.href}>
                {cardContent}
              </Link>
            );
          }
          return <div key={kpi.label}>{cardContent}</div>;
        })}
      </div>

      {/* ── Quick Actions ───────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/admin/centres/new"
          className="flex items-center gap-3 rounded-xl border-2 border-dashed border-indigo-200 bg-white p-4 text-center transition hover:border-indigo-400 hover:bg-indigo-50"
        >
          <span className="text-2xl">➕</span>
          <span className="text-sm font-medium text-gray-700">Create Centre</span>
        </Link>
        <Link
          href="/admin/users"
          className="flex items-center gap-3 rounded-xl border-2 border-dashed border-blue-200 bg-white p-4 text-center transition hover:border-blue-400 hover:bg-blue-50"
        >
          <span className="text-2xl">👤</span>
          <span className="text-sm font-medium text-gray-700">Create Manager</span>
        </Link>
        <Link
          href="/admin/subscriptions"
          className="flex items-center gap-3 rounded-xl border-2 border-dashed border-amber-200 bg-white p-4 text-center transition hover:border-amber-400 hover:bg-amber-50"
        >
          <span className="text-2xl">📋</span>
          <span className="text-sm font-medium text-gray-700">Manage Plans</span>
        </Link>
        <Link
          href="/admin/payments"
          className="flex items-center gap-3 rounded-xl border-2 border-dashed border-green-200 bg-white p-4 text-center transition hover:border-green-400 hover:bg-green-50"
        >
          <span className="text-2xl">💳</span>
          <span className="text-sm font-medium text-gray-700">View Payments</span>
        </Link>
      </div>

      {/* ── Two-column layout: Revenue + Recent Centres ──────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue Breakdown */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Revenue Breakdown</h2>
          <div className="space-y-4">
            {revenueBreakdown.map((rb) => (
              <div key={rb.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-gray-600">{rb.label}</span>
                  <span className="font-medium text-gray-900">TZS {rb.amount.toLocaleString()}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${rb.color} transition-all`}
                    style={{ width: `${(rb.amount / maxRevenue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t pt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">Total Revenue</span>
              <span className="text-lg font-bold text-gray-900">TZS {totalRevenue.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Recent Centres */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Centres</h2>
            <Link href="/admin/centres" className="text-sm text-indigo-600 hover:text-indigo-800">
              View all →
            </Link>
          </div>
          {recentCentres.length === 0 ? (
            <p className="text-sm text-gray-500">No centres yet.</p>
          ) : (
            <div className="space-y-3">
              {recentCentres.map((c) => (
                <Link
                  key={c.id as string}
                  href={`/admin/centres/${c.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition hover:bg-gray-50"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.name as string}</p>
                    <p className="text-xs text-gray-500">{c.code as string}</p>
                  </div>
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {c.status === "active" ? "Active" : "Inactive"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Two-column: Recent Subscriptions + Audit Trail ───── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Subscriptions */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Subscriptions</h2>
            <Link href="/admin/subscriptions" className="text-sm text-indigo-600 hover:text-indigo-800">
              View all →
            </Link>
          </div>
          {recentSubs.length === 0 ? (
            <p className="text-sm text-gray-500">No subscriptions yet.</p>
          ) : (
            <div className="space-y-3">
              {recentSubs.map((sub) => {
                const centre = sub.centres as { name?: string } | null;
                const plan = sub.plans as { name?: string; price?: number } | null;
                return (
                  <div key={sub.id as string} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{centre?.name ?? "Unknown"}</p>
                      <p className="text-xs text-gray-500">
                        {plan?.name ?? "—"} {plan?.price != null ? `· TZS ${Number(plan.price).toLocaleString()}` : ""}
                      </p>
                    </div>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        sub.status === "active"
                          ? "bg-green-100 text-green-700"
                          : sub.status === "trial"
                            ? "bg-blue-100 text-blue-700"
                            : sub.status === "expired"
                              ? "bg-gray-100 text-gray-600"
                              : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {(sub.status as string)?.charAt(0).toUpperCase()}{(sub.status as string)?.slice(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Audit Trail */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            <Link href="/audit" className="text-sm text-indigo-600 hover:text-indigo-800">
              View all →
            </Link>
          </div>
          {auditEntries.length === 0 ? (
            <p className="text-sm text-gray-500">No activity yet.</p>
          ) : (
            <div className="space-y-3">
              {auditEntries.map((entry) => (
                <div key={entry.id as string} className="flex items-start gap-3 rounded-lg border p-3">
                  <span className="mt-0.5 text-sm">
                    {entry.entity_type === "centre"
                      ? "🏛"
                      : entry.entity_type === "child"
                        ? "👶"
                        : entry.entity_type === "payment"
                          ? "💳"
                          : entry.entity_type === "user"
                            ? "👤"
                            : "📝"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-900">
                      {ACTION_LABELS[entry.action as string] ?? (entry.action as string)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {entry.entity_type as string} · {new Date(entry.created_at as string).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
