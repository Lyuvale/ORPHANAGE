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
  setSubscriptionStatus,
} from "@/lib/subscriptions/subscription.service";
import { setSubscriptionStatusSchema } from "@/lib/subscriptions/subscription.validation";
import { notifySubscriptionEvent } from "@/lib/subscriptions/subscription-access.service";

function statusFromError(message: string): number {
  if (message.includes("NOT_AUTHENTICATED")) return 401;
  if (message.includes("PERMISSION_DENIED")) return 403;
  if (message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE") || message.includes("SUBSCRIPTION_INACTIVE")) return 403;
  if (message.includes("V_")) return 400;
  if (message.includes("not found")) return 404;
  return 500;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "subscriptions.view");

    const admin = createAdminClient();
    const sub = await getSubscriptionById(admin, id);
    if (!sub) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }
    return NextResponse.json({ data: sub });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

// ─── PATCH /api/subscriptions/[id] ────────────────────────────
// Platform-level: change subscription status (activate / suspend / cancel /
// expire) with reason + audit + notification.

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
    const parsed = setSubscriptionStatusSchema.safeParse(body);
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

    const updated = await setSubscriptionStatus(admin, id, parsed.data.status, {
      actorUserId: ctx.authUserId,
      reason: parsed.data.reason,
      endDate: parsed.data.end_date,
    });

    await auditUpdate(admin, ctx, "subscription", id,
      { status: existing.status, plan_id: existing.plan_id },
      { status: updated.status, plan_id: updated.plan_id },
      { reason: parsed.data.reason ?? null },
    );

    if (parsed.data.status === "active") {
      await notifySubscriptionEvent(admin, existing.centre_id, "ACTIVATED", existing.plan.name);
    } else if (parsed.data.status === "suspended") {
      await notifySubscriptionEvent(admin, existing.centre_id, "SUSPENDED", existing.plan.name);
    } else if (parsed.data.status === "cancelled") {
      await notifySubscriptionEvent(admin, existing.centre_id, "CANCELLED", existing.plan.name);
    } else if (parsed.data.status === "expired") {
      await notifySubscriptionEvent(admin, existing.centre_id, "EXPIRED", existing.plan.name);
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
