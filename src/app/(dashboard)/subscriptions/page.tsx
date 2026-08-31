import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { can, getUserRoleName } from "@/lib/auth/authorization.service";
import SubscriptionAdminClient, {
  type SubscriptionAdminData,
} from "./SubscriptionAdminClient";

// Platform Administration for subscriptions and plans.
// Only CENTRE_MANAGER with subscriptions.manage may use this area.

async function loadAdminData() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  let subscriptions: SubscriptionAdminData["subscriptions"] = [];
  let plans: SubscriptionAdminData["plans"] = [];
  let centres: SubscriptionAdminData["centres"] = [];

  try {
    const sRes = await fetch(`${baseUrl}/api/subscriptions`, { cache: "no-store" });
    if (sRes.ok) subscriptions = (await sRes.json()).data ?? [];
  } catch {
    /* ignore */
  }
  try {
    const pRes = await fetch(`${baseUrl}/api/plans?include_inactive=true`, { cache: "no-store" });
    if (pRes.ok) plans = (await pRes.json()).data ?? [];
  } catch {
    /* ignore */
  }
  try {
    const cRes = await fetch(`${baseUrl}/api/centres`, { cache: "no-store" });
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

  return (
    <div>
      <SubscriptionAdminClient
        subscriptions={subscriptions}
        plans={plans}
        centres={centres}
      />
    </div>
  );
}
