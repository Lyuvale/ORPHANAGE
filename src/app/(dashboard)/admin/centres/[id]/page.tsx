import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { getUserRoleName } from "@/lib/auth/authorization.service";
import CentreEditForm from "./CentreEditForm";

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

  // Load related data in parallel
  const [staffRes, childrenRes, subRes, managersRes, paymentsRes] = await Promise.all([
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
      .from("subscriptions")
      .select(`
        id, status, start_date, end_date, payment_status, created_at,
        plans:plan_id (id, name, price, billing_period)
      `)
      .eq("centre_id", id)
      .order("created_at", { ascending: false })
      .limit(5),
    admin
      .from("user_roles")
      .select(`
        id, status, assigned_at,
        user:user_id (id, full_name, email),
        role:roles (id, name)
      `)
      .eq("centre_id", id)
      .eq("status", "active"),
    admin
      .from("payment_transactions")
      .select("id, amount, currency, status, flow_type, purpose, created_at")
      .eq("centre_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const staffCount = staffRes.count ?? 0;
  const childrenCount = childrenRes.count ?? 0;
  const subscriptions = (subRes.data ?? []) as Record<string, unknown>[];
  const managers = (managersRes.data ?? []) as Record<string, unknown>[];
  const payments = (paymentsRes.data ?? []) as Record<string, unknown>[];

  const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <nav className="text-sm text-gray-500 mb-1">
            <Link href="/admin/centres" className="hover:text-gray-700">Centres</Link>
            <span className="mx-1">/</span>
            <span className="text-gray-900">{centre.name}</span>
          </nav>
          <h1 className="text-2xl font-semibold text-gray-900">{centre.name}</h1>
          <p className="text-sm text-gray-500">Code: {centre.code ?? "—"}</p>
        </div>
        <span
          className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
            centre.status === "active"
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {centre.status === "active" ? "Active" : "Deactivated"}
        </span>
      </div>

      <nav className="flex flex-wrap gap-2">
        <Link href="/admin" className="rounded-md bg-white border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Overview</Link>
        <Link href="/admin/centres" className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white">Centres</Link>
        <Link href="/admin/subscriptions" className="rounded-md bg-white border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Subscriptions</Link>
        <Link href="/admin/payments" className="rounded-md bg-white border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Payments</Link>
      </nav>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow-sm border">
          <p className="text-sm text-gray-500">Staff</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{staffCount}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm border">
          <p className="text-sm text-gray-500">Children</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{childrenCount}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm border">
          <p className="text-sm text-gray-500">Total Payments</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">KES {totalPayments.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm border">
          <p className="text-sm text-gray-500">Subscriptions</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{subscriptions.length}</p>
        </div>
      </div>

      {/* Edit Centre */}
      <CentreEditForm centre={centre} />

      {/* Manager / Staff */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-gray-900">Managers & Staff ({managers.length})</h2>
        {managers.length === 0 ? (
          <p className="text-sm text-gray-500">No staff assigned.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Role</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {managers.map((m: Record<string, unknown>) => {
                  const user = m.user as { full_name?: string; email?: string } | null;
                  const role = m.role as { name?: string } | null;
                  return (
                    <tr key={m.id as string}>
                      <td className="px-4 py-2 text-gray-900 font-medium">{user?.full_name ?? "—"}</td>
                      <td className="px-4 py-2 text-gray-500">{user?.email ?? "—"}</td>
                      <td className="px-4 py-2">
                        <span className="inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                          {role?.name ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-2">
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

      {/* Subscriptions */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Subscriptions</h2>
          <Link href="/admin/subscriptions" className="text-sm text-indigo-600 hover:text-indigo-800">Manage →</Link>
        </div>
        {subscriptions.length === 0 ? (
          <p className="text-sm text-gray-500">No subscriptions.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                  <th className="px-4 py-2">Plan</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Start</th>
                  <th className="px-4 py-2">End</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subscriptions.map((sub: Record<string, unknown>) => {
                  const plan = sub.plans as { name?: string; price?: number } | null;
                  return (
                    <tr key={sub.id as string}>
                      <td className="px-4 py-2 text-gray-900">{plan?.name ?? "—"}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          sub.status === "active" ? "bg-green-100 text-green-700" :
                          sub.status === "trial" ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {sub.status as string}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-500">{sub.start_date ? new Date(sub.start_date as string).toLocaleDateString() : "—"}</td>
                      <td className="px-4 py-2 text-gray-500">{sub.end_date ? new Date(sub.end_date as string).toLocaleDateString() : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent Payments */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-gray-900">Recent Payments</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-gray-500">No payments yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Purpose</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p: Record<string, unknown>) => (
                  <tr key={p.id as string}>
                    <td className="px-4 py-2">
                      <span className={`font-medium ${p.flow_type === "CONTRIBUTION" ? "text-sky-700" : "text-indigo-700"}`}>
                        {p.flow_type as string}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-900">
                      {p.currency as string} {Number(p.amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-gray-500">{(p.purpose as string) ?? "—"}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.status === "SUCCESSFUL" ? "bg-green-100 text-green-700" :
                        p.status === "PENDING" ? "bg-amber-100 text-amber-700" :
                        p.status === "FAILED" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {p.status as string}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">
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
