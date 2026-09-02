import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { getUserRoleName } from "@/lib/auth/authorization.service";
import SubscriptionActions from "./SubscriptionActions";

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

  // Load subscriptions separately
  const { data: subsData } = await admin
    .from("subscriptions")
    .select("id, centre_id, plan_id, status, start_date, end_date, payment_status, created_at")
    .order("created_at", { ascending: false });

  const subscriptions = (subsData ?? []) as Record<string, unknown>[];

  // Load plans
  const planIds = [...new Set(subscriptions.map((s) => s.plan_id).filter(Boolean))] as string[];
  const plansMap = new Map<string, Record<string, unknown>>();
  if (planIds.length > 0) {
    const { data: plansData } = await admin.from("plans").select("*").in("id", planIds);
    for (const p of (plansData ?? []) as Record<string, unknown>[]) {
      plansMap.set(p.id as string, p);
    }
  }

  // Load all plans for new subscription form
  const { data: allPlansData } = await admin.from("plans").select("*").eq("is_active", true).order("price");
  const allPlans = (allPlansData ?? []) as Record<string, unknown>[];

  // Load centres for dropdown
  const { data: centresDropdown } = await admin
    .from("centres")
    .select("id, name, centre_code, status")
    .eq("status", "active")
    .order("name");

  // Load centre names for display
  const centreIds = [...new Set(subscriptions.map((s) => s.centre_id).filter(Boolean))] as string[];
  const centresMap = new Map<string, Record<string, unknown>>();
  if (centreIds.length > 0) {
    const { data: cData } = await admin.from("centres").select("id, name, centre_code").in("id", centreIds);
    for (const c of (cData ?? []) as Record<string, unknown>[]) {
      centresMap.set(c.id as string, c);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription Management</h1>
          <p className="text-sm text-gray-500">Manage subscription plans and centre subscriptions</p>
        </div>
        <Link href="/admin" className="rounded-md bg-white border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
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
        <h2 className="text-lg font-semibold text-gray-900">Centre Subscriptions ({subscriptions.length})</h2>
        {subscriptions.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center">
            <p className="text-gray-500">No subscriptions yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                  <th className="px-4 py-3">Centre</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Start</th>
                  <th className="px-4 py-3">End</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subscriptions.map((sub) => {
                  const centre = centresMap.get(sub.centre_id as string) as { name?: string; centre_code?: string } | undefined;
                  const plan = plansMap.get(sub.plan_id as string) as { name?: string; price?: number; billing_period?: string } | undefined;
                  return (
                    <tr key={sub.id as string} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link href={`/admin/centres/${sub.centre_id}`} className="text-indigo-600 hover:underline font-medium">
                          {centre?.name ?? "—"}
                        </Link>
                        <span className="ml-1 text-xs text-gray-400">({centre?.centre_code ?? "—"})</span>
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        {plan?.name ?? "—"}
                        {plan?.price != null && (
                          <span className="ml-1 text-xs text-gray-400">
                            KES {Number(plan.price).toLocaleString()}/{(plan.billing_period ?? "").toLowerCase()}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[sub.status as string] ?? "bg-gray-100 text-gray-800"}`}>
                          {(sub.status as string)?.charAt(0).toUpperCase()}{(sub.status as string)?.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {sub.start_date ? new Date(sub.start_date as string).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {sub.end_date ? new Date(sub.end_date as string).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <SubscriptionActions
                          subscriptionId={sub.id as string}
                          currentStatus={sub.status as string}
                          currentEndDate={sub.end_date as string | null}
                        />
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
        <h2 className="text-lg font-semibold text-gray-900">Plans ({allPlans.length})</h2>
        {allPlans.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center">
            <p className="text-gray-500">No plans created yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allPlans.map((plan) => (
                  <tr key={plan.id as string} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900 font-medium">{plan.name as string}</td>
                    <td className="px-4 py-3 text-gray-900">KES {Number(plan.price).toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-500">{plan.billing_period as string}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{(plan.description as string) ?? "—"}</td>
                    <td className="px-4 py-3">
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
