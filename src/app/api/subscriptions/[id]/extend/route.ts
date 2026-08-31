import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditUpdate } from "@/lib/audit/audit.service";
import {
  getSubscriptionById,
  extendSubscription,
} from "@/lib/subscriptions/subscription.service";
import { extendSubscriptionSchema } from "@/lib/subscriptions/subscription.validation";

function statusFromError(message: string): number {
  if (message.includes("NOT_AUTHENTICATED")) return 401;
  if (message.includes("PERMISSION_DENIED")) return 403;
  if (message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE") || message.includes("SUBSCRIPTION_INACTIVE")) return 403;
  if (message.includes("V_")) return 400;
  if (message.includes("not found")) return 404;
  return 500;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient, {
      allowInactiveSubscription: true,
    });
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "subscriptions.manage");

    const body = await request.json();
    const parsed = extendSubscriptionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const existing = await getSubscriptionById(admin, id);
    if (!existing) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    const updated = await extendSubscription(admin, id, {
      endDate: parsed.data.end_date,
      trialEndsAt: parsed.data.trial_ends_at,
    }, { actorUserId: ctx.authUserId, reason: parsed.data.reason });

    await auditUpdate(admin, ctx, "subscription", id,
      { end_date: existing.end_date, trial_ends_at: existing.trial_ends_at },
      { end_date: updated.end_date, trial_ends_at: updated.trial_ends_at },
      { reason: parsed.data.reason ?? null },
    );

    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
