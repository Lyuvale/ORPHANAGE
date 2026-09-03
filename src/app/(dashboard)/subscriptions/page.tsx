import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { can, getUserRoleName } from "@/lib/auth/authorization.service";
import SubscriptionAdminClient, {
  type SubscriptionAdminData,
} from "./SubscriptionAdminClient";
import SubmitPaymentClient from "./SubmitPaymentClient";
import { serverFetch } from "@/lib/server-fetch";

// Platform Administration for subscriptions and plans.
// Only CENTRE_MANAGER with subscriptions.manage may use this area.

async function loadAdminData() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  let subscriptions: SubscriptionAdminData["subscriptions"] = [];
  let plans: SubscriptionAdminData["plans"] = [];
  let centres: SubscriptionAdminData["centres"] = [];

  try {
    const sRes = await serverFetch(`${baseUrl}/api/subscriptions`, { cache: "no-store" });
    if (sRes.ok) subscriptions = (await sRes.json()).data ?? [];
  } catch {
    /* ignore */
  }
  try {
    const pRes = await serverFetch(`${baseUrl}/api/plans?include_inactive=true`, { cache: "no-store" });
    if (pRes.ok) plans = (await pRes.json()).data ?? [];
  } catch {
    /* ignore */
  }
  try {
    const cRes = await serverFetch(`${baseUrl}/api/centres`, { cache: "no-store" });
    if (cRes.ok) centres = (await cRes.json()).data ?? [];
  } catch {
    /* ignore */
  }

  return { subscriptions, plans, centres };
}

export default async function SubscriptionsPage() {
  const supabase = await createClient();
  const ctx = await requireAppAccess(supabase as never, {
    allowInactiveSubscription: true,
  });

  const roleName = await getUserRoleName(supabase as never, ctx);
  const canManage = await can(supabase as never, ctx, "subscriptions.manage");

  if (roleName !== "CENTRE_MANAGER" || !canManage) {
    redirect("/children");
  }

  const { subscriptions, plans, centres } = await loadAdminData();

  // Active plans for the centre's payment submission form.
  const activePlans = plans
    .filter((p: SubscriptionAdminData["plans"][number]) => p.is_active)
    .map((p: SubscriptionAdminData["plans"][number]) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      billing_period: p.billing_period,
    }));

  return (
    <div className="space-y-8">
      <SubmitPaymentClient plans={activePlans} />
      <SubscriptionAdminClient
        subscriptions={subscriptions}
        plans={plans}
        centres={centres}
      />
    </div>
  );
}
