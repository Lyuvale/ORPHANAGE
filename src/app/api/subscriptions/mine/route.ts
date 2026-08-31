import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { loadSubscriptionForContext } from "@/lib/subscriptions/subscription-access.service";

function statusFromError(message: string): number {
  if (message.includes("NOT_AUTHENTICATED")) return 401;
  if (message.includes("PERMISSION_DENIED")) return 403;
  if (message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE") || message.includes("SUBSCRIPTION_INACTIVE")) return 403;
  return 500;
}

// ─── GET /api/subscriptions/mine ──────────────────────────────
// A centre user may view THEIR OWN centre's subscription (tenant-scoped).
// Works even when access is restricted so the user can see the reason.

export async function GET() {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient, {
      allowInactiveSubscription: true,
    });
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "subscriptions.view_own");

    const access = await loadSubscriptionForContext(
      supabase as unknown as SupabaseClient,
      ctx.centre.id,
    );

    return NextResponse.json({
      data: {
        subscription: access.subscription,
        approved: access.isSubscriptionValid,
        status: access.status,
        reason: access.reason,
        enabledFeatures: Array.from(access.enabledFeatures),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
