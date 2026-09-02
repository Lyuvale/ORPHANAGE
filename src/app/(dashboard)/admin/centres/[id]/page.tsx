import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { getUserRoleName } from "@/lib/auth/authorization.service";
import CentreEditForm from "./CentreEditForm";
import CentreActions from "./CentreActions";
import CentreSubscriptionManager from "./CentreSubscriptionManager";

export const dynamic = "force-dynamic";

export default async function CentreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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

  // Load centre
  const { data: centre, error: centreError } = await admin
    .from("centres")
    .select("*")
    .eq("id", id)
    .single();

  if (centreError || !centre) {
    notFound();
  }

  // Load related data separately (avoid complex joins that may fail)
  const [staffRes, childrenRes, paymentsRes] = await Promise.all([
    admin
      .from("user_profiles")
      .select("id", { count: "exact", head: true })
      .eq("centre_id", id)
      .eq("status", "active"),
    admin
      .from("children")
      .select("id", { count: "exact", head: true })
      .eq("centre_id", id)
      .eq("status", "active"),
    admin
      .from("payment_transactions")
      .select("id, amount, currency, status, flow_type, purpose, created_at")
      .eq("centre_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  // Load subscriptions (separate query — avoids join issues)
  const { data: subData } = await admin
    .from("subscriptions")
    .select("id, status, start_date, end_date, payment_status, created_at, plan_id")
    .eq("centre_id", id)
    .order("created_at", { ascending: false });

  const subscriptions = (subData ?? []) as Record<string, unknown>[];

  // Load plan details for each subscription
  const planIds = [...new Set(subscriptions.map((s) => s.plan_id).filter(Boolean))] as string[];
  const plansMap = new Map<string, Record<string, unknown>>();
  if (planIds.length > 0) {
    const { data: plansData } = await admin
      .from("plans")
      .select("id, name, price, billing_period")
      .in("id", planIds);
    for (const p of (plansData ?? []) as Record<string, unknown>[]) {
      plansMap.set(p.id as string, p);
    }
  }

  // Load all active plans for subscription manager
  const { data: allPlansData } = await admin
    .from("plans")
    .select("id, name, price, billing_period")
    .eq("is_active", true)
    .order("price", { ascending: true });
  const allPlans = (allPlansData ?? []) as Record<string, unknown>[];

  // Load user_roles with user details (separate queries for reliability)
  const { data: rolesData } = await admin
    .from("user_roles")
    .select("id, status, assigned_at, user_id, role_id, centre_id")
    .eq("centre_id", id)
    .eq("status", "active");

  const managers = (rolesData ?? []) as Record<string, unknown>[];

  // Load user profiles for each manager
  const userIds = [...new Set(managers.map((m) => m.user_id).filter(Boolean))] as string[];
  const usersMap = new Map<string, Record<string, unknown>>();
  if (userIds.length > 0) {
    const { data: usersData } = await admin
      .from("user_profiles")
      .select("id, first_name, last_name, email")
      .in("id", userIds);
    for (const u of (usersData ?? []) as Record<string, unknown>[]) {
      usersMap.set(u.id as string, u);
    }
  }

  // Load role details
  const roleIds = [...new Set(managers.map((m) => m.role_id).filter(Boolean))] as string[];
  const rolesMap = new Map<string, Record<string, unknown>>();
  if (roleIds.length > 0) {
    const { data: rolesDetail } = await admin
      .from("roles")
      .select("id, name")
      .in("id", roleIds);
    for (const r of (rolesDetail ?? []) as Record<string, unknown>[]) {
      rolesMap.set(r.id as string, r);
    }
  }

  const staffCount = staffRes.count ?? 0;
  const childrenCount = childrenRes.count ?? 0;
  const payments = (paymentsRes.data ?? []) as Record<string, unknown>[];
  const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <nav className="text-sm text-gray-500 mb-1">
            <Link href="/admin/centres" className="hover:text-gray-700">Centres</Link>
            <span className="mx-1">/</span>
            <span className="text-gray-900">{centre.name}</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900">{centre.name}</h1>
          <p className="text-sm text-gray-500">Code: {centre.code ?? "—"}</p>
        </div>
        <CentreActions centreId={centre.id} centreName={centre.name} isActive={centre.status === "active"} />
      </div>

      <nav className="flex flex-wrap gap-2">
        <Link href="/admin" className="rounded-md bg-white border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Overview</Link>
        <Link href="/admin/centres" className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white">Centres</Link>
        <Link href="/admin/subscriptions" className="rounded-md bg-white border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Subscriptions</Link>
        <Link href="/admin/payments" className="rounded-md bg-white border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Payments</Link>
      </nav>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl bg-white p-5 shadow-sm border">
          <p className="text-sm text-gray-500">Staff</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{staffCount}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm border">
          <p className="text-sm text-gray-500">Children</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{childrenCount}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm border">
          <p className="text-sm text-gray-500">Total Payments</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">KES {totalPayments.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm border">
          <p className="text-sm text-gray-500">Subscriptions</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{subscriptions.length}</p>
        </div>
      </div>

      {/* Edit Centre */}
      <CentreEditForm centre={centre} />

      {/* Managers / Staff */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Managers & Staff ({managers.length})</h2>
        {managers.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center">
            <p className="text-sm text-gray-500">No staff assigned to this centre.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {managers.map((m) => {
                  const user = usersMap.get(m.user_id as string) as { first_name?: string; last_name?: string; email?: string } | undefined;
                  const role = rolesMap.get(m.role_id as string) as { name?: string } | undefined;
                  const fullName = user ? [user.first_name, user.last_name].filter(Boolean).join(" ") : null;
                  return (
                    <tr key={m.id as string} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900 font-medium">{fullName || "—"}</td>
                      <td className="px-4 py-3 text-gray-500">{user?.email ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                          {role?.name ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          m.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                        }`}>
                          {m.status as string}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Subscription Manager */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Subscription</h2>
        <CentreSubscriptionManager
          centreId={centre.id}
          centreName={centre.name}
          plans={allPlans as unknown as { id: string; name: string; price: number; billing_period: string }[]}
          existingSub={subscriptions.length > 0 ? {
            id: subscriptions[0].id as string,
            plan_id: subscriptions[0].plan_id as string,
            status: subscriptions[0].status as string,
            start_date: subscriptions[0].start_date as string | null,
            end_date: subscriptions[0].end_date as string | null,
          } : null}
        />
      </section>

      {/* Recent Payments */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Recent Payments</h2>
        {payments.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center">
            <p className="text-sm text-gray-500">No payments yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Purpose</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => (
                  <tr key={p.id as string} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`font-medium ${p.flow_type === "CONTRIBUTION" ? "text-sky-700" : "text-indigo-700"}`}>
                        {p.flow_type as string}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {p.currency as string} {Number(p.amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{(p.purpose as string) ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.status === "SUCCESSFUL" ? "bg-green-100 text-green-700" :
                        p.status === "PENDING" ? "bg-amber-100 text-amber-700" :
                        p.status === "FAILED" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {p.status as string}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(p.created_at as string).toLocaleDateString("en-GB")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
