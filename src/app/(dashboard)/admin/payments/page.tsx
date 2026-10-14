import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { getUserRoleName } from "@/lib/auth/authorization.service";
import PaymentActions from "./PaymentActions";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  SUCCESSFUL: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  CANCELLED: "bg-zinc-100 text-zinc-600",
  REFUNDED: "bg-purple-100 text-purple-700",
};

export default async function AdminPaymentsPage() {
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

  const { data: payments, error } = await admin
    .from("payment_transactions")
    .select(
      "id, centre_id, flow_type, purpose, amount, currency, status, provider_reference, subscription_id, plan_id, review_feedback, created_at, reviewed_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const allPayments = (payments ?? []) as Record<string, unknown>[];

  // Load centre names for linking
  const centreIds = [...new Set(allPayments.map((p) => p.centre_id).filter(Boolean))] as string[];
  const { data: centresData } = await admin
    .from("centres")
    .select("id, name, code")
    .in("id", centreIds.length > 0 ? centreIds : ["00000000-0000-0000-0000-000000000000"]);
  const centresMap = new Map(
    (centresData ?? []).map((c: Record<string, unknown>) => [c.id, c]),
  );

  // Load plan names for the submitted plan and the auto-selected plan.
  const planIds = [...new Set(allPayments.map((p) => p.plan_id).filter(Boolean))] as string[];
  const { data: plansData } = await admin
    .from("plans")
    .select("id, name, price")
    .in("id", planIds.length > 0 ? planIds : ["00000000-0000-0000-0000-000000000000"]);
  const plansMap = new Map(
    (plansData ?? []).map((c: Record<string, unknown>) => [c.id, c]),
  );

  // Stats
  const totalAmount = allPayments.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
  const successfulPayments = allPayments.filter((p) => p.status === "SUCCESSFUL");
  const successfulAmount = successfulPayments.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
  const pendingPayments = allPayments.filter((p) => p.status === "PENDING");
  const failedPayments = allPayments.filter((p) => p.status === "FAILED");
  const contributionPayments = allPayments.filter((p) => p.flow_type === "CONTRIBUTION");
  const subscriptionPayments = allPayments.filter((p) => p.flow_type === "SUBSCRIPTION");

  const stats = [
    { label: "Total Transactions", value: allPayments.length, color: "text-zinc-900" },
    { label: "Total Amount", value: `TZS ${totalAmount.toLocaleString()}`, color: "text-zinc-900" },
    { label: "Approved", value: successfulPayments.length, sub: `TZS ${successfulAmount.toLocaleString()}`, color: "text-green-700" },
    { label: "Pending Review", value: pendingPayments.length, color: "text-amber-700" },
    { label: "Rejected", value: failedPayments.length, color: "text-red-700" },
    { label: "Contributions", value: contributionPayments.length, color: "text-sky-700" },
    { label: "Subscriptions", value: subscriptionPayments.length, color: "text-indigo-700" },
  ];

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Platform Payments</h1>
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          Failed to load payments: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Platform Payments</h1>
        <Link
          href="/admin"
          className="rounded-md bg-white border px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Back to Admin
        </Link>
      </div>

      <nav className="flex flex-wrap gap-2">
        <Link href="/admin" className="rounded-md bg-white border px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Overview</Link>
        <Link href="/admin/centres" className="rounded-md bg-white border px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Centres</Link>
        <Link href="/admin/subscriptions" className="rounded-md bg-white border px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Subscriptions</Link>
        <Link href="/admin/payments" className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white">Payments</Link>
      </nav>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg bg-white p-4 shadow-sm border">
            <p className="text-xs text-zinc-500">{s.label}</p>
            <p className={`mt-1 text-xl font-semibold ${s.color}`}>{s.value}</p>
            {s.sub && <p className="text-xs text-zinc-400">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* How Payments Work */}
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <h3 className="text-sm font-semibold text-indigo-900">How Payments Work</h3>
        <div className="mt-2 text-xs text-indigo-800">
          <p>
            <strong>Centre submits:</strong> a centre chooses a plan, enters the amount paid and the
            transaction reference from its subscriptions page. The request arrives here as{" "}
            <strong>PENDING</strong>.
          </p>
          <p className="mt-1">
            <strong>You review:</strong> Approve to accept the payment - the system auto-selects the
            best-fitting plan for the confirmed amount and activates the centre&apos;s subscription. Reject to
            return it, optionally with a feedback reason the centre can see.
          </p>
        </div>
        <div className="mt-2 text-xs text-indigo-700">
          <strong>Status:</strong> PENDING = awaiting review · SUCCESSFUL = approved (subscription active)
          · FAILED = rejected · CANCELLED · REFUNDED
        </div>
      </div>

      {/* Payments Table */}
      {allPayments.length === 0 ? (
        <p className="text-sm text-zinc-500">No payment transactions yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white shadow-sm border">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead>
                <tr className="bg-zinc-50 text-left text-xs font-medium text-zinc-500 uppercase">
                <th className="px-4 py-3">Flow</th>
                <th className="px-4 py-3">Centre</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Feedback</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {allPayments.map((p) => {
                const centre = centresMap.get(p.centre_id as string) as Record<string, unknown> | undefined;
                const plan = plansMap.get(p.plan_id as string) as Record<string, unknown> | undefined;
                return (
                  <tr key={p.id as string} className="hover:bg-zinc-50">
                    <td className="px-4 py-2">
                      <span
                        className={
                          p.flow_type === "CONTRIBUTION"
                            ? "text-sky-700 font-medium"
                            : "text-indigo-700 font-medium"
                        }
                      >
                        {p.flow_type as string}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {centre ? (
                        <Link href={`/admin/centres/${p.centre_id}`} className="text-indigo-600 hover:underline text-xs">
                          {centre.name as string}
                        </Link>
                      ) : (
                        <span className="text-zinc-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-800">{(plan?.name as string) ?? "—"}</td>
                    <td className="px-4 py-2 text-gray-800 font-medium">
                      {p.currency as string} {Number(p.amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATUS_STYLES[p.status as string] ?? "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {p.status === "SUCCESSFUL" ? "APPROVED" : p.status === "FAILED" ? "REJECTED" : (p.status as string)}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-zinc-500">
                      {p.provider_reference as string}
                    </td>
                    <td className="px-4 py-2 text-xs text-zinc-600">
                      {(p.review_feedback as string) ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-xs text-zinc-500">
                      {new Date(p.created_at as string).toLocaleDateString("en-GB")}
                      <br />
                      {new Date(p.created_at as string).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-2">
                      <PaymentActions paymentId={p.id as string} currentStatus={p.status as string} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
