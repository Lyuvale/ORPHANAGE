import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { getUserRoleName, can } from "@/lib/auth/authorization.service";

// Platform Administration — PLATFORM_ADMINISTRATOR ONLY.
// This is NOT a normal Centre user role.

interface DashboardData {
  centres: number;
  active_centres: number;
  subscriptions: number;
  active_subscriptions: number;
  payments: number;
  total_contributions_amount: number;
  alerts: { id: string; severity: string; title: string; message: string | null }[];
}

async function loadDashboard(): Promise<DashboardData | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    const res = await fetch(`${baseUrl}/api/platform/dashboard`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()).data as DashboardData;
  } catch {
    return null;
  }
}

export default async function AdminPage() {
  const supabase = await createClient();
  const ctx = await requireAppAccess(supabase as never, {
    allowInactiveSubscription: true,
  });

  const roleName = await getUserRoleName(supabase as never, ctx);
  const canView = await can(supabase as never, ctx, "platform.view");

  if (roleName !== "PLATFORM_ADMINISTRATOR" || !canView) {
    redirect("/children");
  }

  const dashboard = await loadDashboard();

  const stats = [
    { label: "Centres", value: dashboard?.centres ?? 0 },
    { label: "Active Centres", value: dashboard?.active_centres ?? 0 },
    { label: "Subscriptions", value: dashboard?.subscriptions ?? 0 },
    { label: "Active Subscriptions", value: dashboard?.active_subscriptions ?? 0 },
    { label: "Payments", value: dashboard?.payments ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Platform Administration</h1>
        <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
          PLATFORM ADMINISTRATOR
        </span>
      </div>

      <nav className="flex flex-wrap gap-2">
        <Link
          href="/admin"
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white"
        >
          Overview
        </Link>
        <Link
          href="/admin/centres"
          className="rounded-md bg-white border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Centres
        </Link>
        <Link
          href="/admin/users"
          className="rounded-md bg-white border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Create Users
        </Link>
        <Link
          href="/admin/payments"
          className="rounded-md bg-white border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Payments
        </Link>
        <Link
          href="/admin/settings"
          className="rounded-md bg-white border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Settings
        </Link>
      </nav>

      {!dashboard ? (
        <p className="text-sm text-gray-500">
          Platform statistics are unavailable right now.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {stats.map((s) => (
              <div key={s.label} className="rounded-lg bg-white p-5 shadow-sm border">
                <p className="text-sm text-gray-500">{s.label}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-white p-5 shadow-sm border">
            <p className="text-sm font-medium text-gray-900">
              Confirmed contributions (KES)
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {Number(dashboard.total_contributions_amount || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>

          <div className="rounded-lg bg-white p-5 shadow-sm border">
            <h2 className="text-sm font-medium text-gray-900 mb-3">Open platform alerts</h2>
            {dashboard.alerts.length === 0 ? (
              <p className="text-sm text-gray-500">No open alerts.</p>
            ) : (
              <ul className="divide-y">
                {dashboard.alerts.map((a) => (
                  <li key={a.id} className="py-2 text-sm">
                    <span
                      className={
                        a.severity === "CRITICAL"
                          ? "text-red-600 font-medium"
                          : a.severity === "WARNING"
                            ? "text-amber-600 font-medium"
                            : "text-gray-700"
                      }
                    >
                      {a.title}
                    </span>
                    {a.message ? (
                      <span className="text-gray-500"> — {a.message}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}