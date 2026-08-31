import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { getUserRoleName, can } from "@/lib/auth/authorization.service";

interface PaymentRecord {
  id: string;
  centre_id: string;
  flow_type: "SUBSCRIPTION" | "CONTRIBUTION";
  purpose: string | null;
  amount: number;
  currency: string;
  status: string;
  provider_reference: string;
  contributor_name: string | null;
  contributor_email: string | null;
  created_at: string;
}

async function loadPayments(): Promise<PaymentRecord[]> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    const res = await fetch(`${baseUrl}/api/platform/payments`, { cache: "no-store" });
    if (!res.ok) return [];
    return (await res.json()).data ?? [];
  } catch {
    return [];
  }
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  SUCCESSFUL: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-600",
  REFUNDED: "bg-purple-100 text-purple-700",
};

export default async function AdminPaymentsPage() {
  const supabase = await createClient();
  const ctx = await requireAppAccess(supabase as never, {
    allowInactiveSubscription: true,
  });

  const roleName = await getUserRoleName(supabase as never, ctx);
  const canView = await can(supabase as never, ctx, "platform.payments");

  if (roleName !== "PLATFORM_ADMINISTRATOR" || !canView) {
    redirect("/children");
  }

  const payments = await loadPayments();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Platform Payments</h1>
      <nav className="flex flex-wrap gap-2">
        <Link
          href="/admin"
          className="rounded-md bg-white border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
          href="/admin/payments"
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white"
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

      {payments.length === 0 ? (
        <p className="text-sm text-gray-500">No payment transactions yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white shadow-sm border">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                <th className="px-4 py-3">Flow</th>
                <th className="px-4 py-3">Purpose</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Contributor</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2">
                    <span
                      className={
                        p.flow_type === "CONTRIBUTION"
                          ? "text-sky-700 font-medium"
                          : "text-indigo-700 font-medium"
                      }
                    >
                      {p.flow_type}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-800">{p.purpose ?? "—"}</td>
                  <td className="px-4 py-2 text-gray-800">
                    {p.currency} {Number(p.amount).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_STYLES[p.status] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    {p.contributor_name ?? "—"}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-500">
                    {p.provider_reference}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500">
                    {new Date(p.created_at).toLocaleString("en-GB")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}