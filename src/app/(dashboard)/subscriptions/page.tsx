import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { can } from "@/lib/auth/authorization.service";
import SubmitPaymentClient from "./SubmitPaymentClient";
import { serverFetch } from "@/lib/server-fetch";

// Centre-level subscription page: submit a subscription payment for review
// and view your payment requests / feedback.
// Accessible to CENTRE_MANAGER (or roles) with subscriptions.manage.

async function loadPlans() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  let plans: { id: string; name: string; price: number | string; billing_period: string; is_active: boolean }[] = [];
  try {
    const pRes = await serverFetch(`${baseUrl}/api/plans?include_inactive=false`, { cache: "no-store" });
    if (pRes.ok) plans = (await pRes.json()).data ?? [];
  } catch {
    /* ignore */
  }
  return plans
    .filter((p) => p.is_active)
    .map((p) => ({ id: p.id, name: p.name, price: p.price, billing_period: p.billing_period }));
}

export default async function SubscriptionsPage() {
  const supabase = await createClient();
  const ctx = await requireAppAccess(supabase as never, {
    allowInactiveSubscription: true,
  });

  const canManage = await can(supabase as never, ctx, "subscriptions.manage");

  if (!canManage) {
    redirect("/children");
  }

  const activePlans = await loadPlans();

  return (
    <div>
      <SubmitPaymentClient plans={activePlans} />
    </div>
  );
}

