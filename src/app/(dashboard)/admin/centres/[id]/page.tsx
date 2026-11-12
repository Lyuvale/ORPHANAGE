import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { getUserRoleName } from "@/lib/auth/authorization.service";
import CentreEditForm from "./CentreEditForm";
import CentreActions from "./CentreActions";
import CentreSubscriptionManager from "./CentreSubscriptionManager";
import { AssignManagerForm } from "./AssignManagerForm";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";

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
      .from("user_roles")
      .select("user_id, role_id")
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

  // Role names for the centre's staff (used to exclude the PLATFORM_ADMINISTRATOR)
  const staffRoleIds = [...new Set(((staffRes.data ?? []) as { role_id?: string }[]).map((r) => r.role_id).filter(Boolean))] as string[];
  const staffRoleNames = new Map<string, string>();
  if (staffRoleIds.length > 0) {
    const { data: staffRoles } = await admin.from("roles").select("id, name").in("id", staffRoleIds);
    for (const r of (staffRoles ?? []) as { id: string; name: string }[]) {
      staffRoleNames.set(r.id, r.name);
    }
  }

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

  // Load user profiles for assign-manager form (all staff at this centre)
  const { data: allProfilesData } = await admin
    .from("user_profiles")
    .select("id, first_name, last_name, email, phone")
    .eq("centre_id", id)
    .order("last_name", { ascending: true });
  const allProfiles = (allProfilesData ?? []) as Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
  }>;

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

  // Current manager profile (for assign-manager form)
  const currentManagerProfile =
    managers
      .filter((m) => rolesMap.get(m.role_id as string)?.name === "CENTRE_MANAGER")
      .map((m) => usersMap.get(m.user_id as string))
      .filter(Boolean)
      .map((u) => ({
        id: u!.id as string,
        first_name: u!.first_name as string,
        last_name: u!.last_name as string,
        email: (u!.email as string) ?? null,
      }))[0] ?? null;

  const staffCount = ((staffRes.data ?? []) as { role_id?: string }[]).filter(
    (r) => staffRoleNames.get(r.role_id ?? "") !== "PLATFORM_ADMINISTRATOR",
  ).length;
  const childrenCount = childrenRes.count ?? 0;
  const payments = (paymentsRes.data ?? []) as Record<string, unknown>[];
  const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={
          <>
            <Link href="/admin/centres" className="hover:text-zinc-700">
              Centres
            </Link>
            <span className="mx-1">/</span>
            <span className="text-zinc-900">{centre.name}</span>
          </>
        }
        title={centre.name}
        subtitle={`Code: ${centre.code ?? "—"}`}
        actions={
          <CentreActions
            centreId={centre.id}
            centreName={centre.name}
            isActive={centre.status === "active"}
          />
        }
      />

      <nav className="flex flex-wrap gap-2">
        <Link href="/admin" className="rounded-md border bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Overview</Link>
        <Link href="/admin/centres" className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white">Centres</Link>
        <Link href="/admin/subscriptions" className="rounded-md border bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Subscriptions</Link>
        <Link href="/admin/payments" className="rounded-md border bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Payments</Link>
      </nav>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Staff" value={staffCount} />
        <StatCard label="Children" value={childrenCount} />
        <StatCard label="Total payments" value={`TZS ${totalPayments.toLocaleString()}`} />
        <StatCard label="Subscriptions" value={subscriptions.length} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <CentreEditForm centre={centre} />

          <Card>
            <CardHeader
              title={`Managers & staff (${managers.length})`}
              description="Active staff assigned to this centre."
            />
            {managers.length === 0 ? (
              <CardBody>
                <EmptyState
                  title="No staff assigned"
                  description="Assign staff to this centre to get started."
                />
              </CardBody>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-zinc-50/60 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                      <th className="px-5 py-3">Name</th>
                      <th className="px-5 py-3">Email</th>
                      <th className="px-5 py-3">Role</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {managers.map((m) => {
                      const user = usersMap.get(m.user_id as string) as { first_name?: string; last_name?: string; email?: string } | undefined;
                      const role = rolesMap.get(m.role_id as string) as { name?: string } | undefined;
                      const fullName = user ? [user.first_name, user.last_name].filter(Boolean).join(" ") : null;
                      return (
                        <tr key={m.id as string} className="hover:bg-zinc-50/60">
                          <td className="px-5 py-3 font-medium text-zinc-900">{fullName || "—"}</td>
                          <td className="px-5 py-3 text-zinc-500">{user?.email ?? "—"}</td>
                          <td className="px-5 py-3">
                            <span className="inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                              {role?.name ?? "—"}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                              m.status === "active" ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-600"
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
          </Card>

          <Card>
            <CardHeader
              title="Recent payments"
              description="The last 10 payments recorded for this centre."
            />
            {payments.length === 0 ? (
              <CardBody>
                <EmptyState title="No payments yet" />
              </CardBody>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-zinc-50/60 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3">Amount</th>
                      <th className="px-5 py-3">Purpose</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {payments.map((p) => (
                      <tr key={p.id as string} className="hover:bg-zinc-50/60">
                        <td className="px-5 py-3">
                          <span className={`font-medium ${p.flow_type === "CONTRIBUTION" ? "text-sky-700" : "text-indigo-700"}`}>
                            {p.flow_type as string}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-medium text-zinc-900">
                          {p.currency as string} {Number(p.amount).toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-zinc-500">{(p.purpose as string) ?? "—"}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            p.status === "SUCCESSFUL" ? "bg-green-100 text-green-700" :
                            p.status === "PENDING" ? "bg-amber-100 text-amber-700" :
                            p.status === "FAILED" ? "bg-red-100 text-red-700" :
                            "bg-zinc-100 text-zinc-600"
                          }`}>
                            {p.status as string}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-zinc-500">
                          {new Date(p.created_at as string).toLocaleDateString("en-GB")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <AssignManagerForm
            centreId={centre.id}
            users={allProfiles}
            currentManager={currentManagerProfile}
          />

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
        </div>
      </div>
    </div>
  );
}
