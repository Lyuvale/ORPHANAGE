import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { getUserRoleName } from "@/lib/auth/authorization.service";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  trial: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  expired: "bg-gray-100 text-gray-800",
  suspended: "bg-amber-100 text-amber-800",
  cancelled: "bg-red-100 text-red-800",
};

export default async function AdminSubscriptionsPage() {
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

  const [subsRes, plansRes, centresRes] = await Promise.all([
    admin
      .from("subscriptions")
      .select(`
        id, centre_id, plan_id, status, start_date, end_date,
        trial_ends_at, payment_status, created_at,
        centres:centre_id (id, name, centre_code),
        plans:plan_id (id, name, price, billing_period)
      `)
      .order("created_at", { ascending: false }),
    admin
      .from("plans")
      .select("*")
      .order("price", { ascending: true }),
    admin
      .from("centres")
      .select("id, name, centre_code, status")
      .eq("status", "active")
      .order("name"),
  ]);

  const subscriptions = (subsRes.data ?? []) as Record<string, unknown>[];
  const plans = (plansRes.data ?? []) as Record<string, unknown>[];
  const centres = (centresRes.data ?? []) as Record<string, unknown>[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Subscription Management</h1>
          <p className="text-sm text-gray-500">Manage subscription plans and centre subscriptions</p>
        </div>
        <Link
          href="/admin"
          className="rounded-md bg-white border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to Admin
        </Link>
      </div>

      <nav className="flex flex-wrap gap-2">
        <Link href="/admin" className="rounded-md bg-white border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Overview</Link>
        <Link href="/admin/centres" className="rounded-md bg-white border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Centres</Link>
        <Link href="/admin/subscriptions" className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white">Subscriptions</Link>
        <Link href="/admin/payments" className="rounded-md bg-white border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Payments</Link>
      </nav>

      {/* Subscriptions List */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-gray-900">Centre Subscriptions ({subscriptions.length})</h2>
        {subscriptions.length === 0 ? (
          <p className="text-sm text-gray-500">No subscriptions yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                  <th className="px-4 py-2">Centre</th>
                  <th className="px-4 py-2">Plan</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Start</th>
                  <th className="px-4 py-2">End</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subscriptions.map((sub: Record<string, unknown>) => {
                  const centre = sub.centres as { name?: string; centre_code?: string } | null;
                  const plan = sub.plans as { name?: string; price?: number; billing_period?: string } | null;
                  return (
                    <tr key={sub.id as string}>
                      <td className="px-4 py-2 text-gray-900">
                        <Link href={`/admin/centres/${sub.centre_id}`} className="text-indigo-600 hover:underline">
                          {centre?.name ?? "—"}
                        </Link>
                        <span className="ml-1 text-xs text-gray-400">({centre?.centre_code ?? "—"})</span>
                      </td>
                      <td className="px-4 py-2 text-gray-900">
                        {plan?.name ?? "—"}
                        {plan?.price != null && (
                          <span className="ml-1 text-xs text-gray-400">
                            KES {Number(plan.price).toLocaleString()}/{(plan.billing_period ?? "").toLowerCase()}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[sub.status as string] ?? "bg-gray-100 text-gray-800"}`}>
                          {(sub.status as string)?.charAt(0).toUpperCase()}{(sub.status as string)?.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-500">
                        {sub.start_date ? new Date(sub.start_date as string).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-2 text-gray-500">
                        {sub.end_date ? new Date(sub.end_date as string).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-2">
                        <Link href={`/admin/centres/${sub.centre_id}`} className="text-xs text-indigo-600 hover:text-indigo-800">
                          View Centre →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Plans List */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-gray-900">Plans ({plans.length})</h2>
        {plans.length === 0 ? (
          <p className="text-sm text-gray-500">No plans created yet. Create one via Supabase Dashboard.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Price</th>
                  <th className="px-4 py-2">Period</th>
                  <th className="px-4 py-2">Description</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {plans.map((plan: Record<string, unknown>) => (
                  <tr key={plan.id as string}>
                    <td className="px-4 py-2 text-gray-900 font-medium">{plan.name as string}</td>
                    <td className="px-4 py-2 text-gray-900">KES {Number(plan.price).toLocaleString()}</td>
                    <td className="px-4 py-2 text-gray-500">{plan.billing_period as string}</td>
                    <td className="px-4 py-2 text-gray-500">{(plan.description as string) ?? "—"}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${plan.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                        {plan.is_active ? "Active" : "Inactive"}
                      </span>
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
