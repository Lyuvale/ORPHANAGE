import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { getUserRoleName } from "@/lib/auth/authorization.service";
import SubmitPaymentClient from "./SubmitPaymentClient";
import { createAdminClient } from "@/lib/supabase/admin";
import { listPlans } from "@/lib/subscriptions/subscription.service";

// Centre-level subscription page: submit a subscription payment for review
// and view your payment requests / feedback.
// Gated by the CENTRE_MANAGER role (retrieved from the DB by getUserRoleName)
// so it works independently of any specific permission-string mapping in the
// roles table — the same signal used to render the nav link.

async function loadPlans() {
  try {
    const admin = createAdminClient();
    const plans = await listPlans(admin, { includeInactive: false });
    return plans
      .filter((p) => p.is_active)
      .map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        billing_period: p.billing_period,
      }));
  } catch {
    return [];
  }
}

export default async function SubscriptionsPage() {
  const supabase = await createClient();
  const ctx = await requireAppAccess(supabase as never, {
    allowInactiveSubscription: true,
  });

  const roleName = await getUserRoleName(supabase as never, ctx);

  // Only a CENTRE_MANAGER submits subscription payments on behalf of the centre.
  if (roleName !== "CENTRE_MANAGER") {
    redirect("/children");
  }

  const activePlans = await loadPlans();

  return (
    <div>
      <SubmitPaymentClient plans={activePlans} />
    </div>
  );
}

