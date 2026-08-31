import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import {
  listSubscriptions,
  createSubscription,
  isSubscriptionStatus,
  getPlanById,
} from "@/lib/subscriptions/subscription.service";
import { createSubscriptionSchema } from "@/lib/subscriptions/subscription.validation";
import { notifySubscriptionEvent } from "@/lib/subscriptions/subscription-access.service";

function statusFromError(message: string): number {
  if (message.includes("NOT_AUTHENTICATED")) return 401;
  if (message.includes("PERMISSION_DENIED")) return 403;
  if (message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE") || message.includes("SUBSCRIPTION_INACTIVE")) return 403;
  if (message.includes("V_")) return 400;
  if (message.includes("not found")) return 404;
  return 500;
}

// ─── GET /api/subscriptions ───────────────────────────────────
// Platform-level: list subscriptions across centres (subscriptions.view).

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "subscriptions.view");

    const sp = request.nextUrl.searchParams;
    const statusParam = sp.get("status");
    const status = statusParam && isSubscriptionStatus(statusParam) ? statusParam : undefined;
    const centreId = sp.get("centre_id") ?? undefined;
    const limit = parseInt(sp.get("limit") ?? "50", 10);
    const offset = parseInt(sp.get("offset") ?? "0", 10);

    const admin = createAdminClient();
    const result = await listSubscriptions(admin, {
      status,
      centreId,
      limit: Math.min(limit, 100),
      offset: Math.max(offset, 0),
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

// ─── POST /api/subscriptions ──────────────────────────────────
// Platform-level: assign a plan to a centre (creates a subscription period).

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient, {
      allowInactiveSubscription: true,
    });
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "subscriptions.manage");

    const body = await request.json();
    const parsed = createSubscriptionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const plan = await getPlanById(admin, parsed.data.plan_id);
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const sub = await createSubscription(admin, {
      centreId: parsed.data.centre_id,
      planId: parsed.data.plan_id,
      status: parsed.data.status ?? "trial",
      startDate: parsed.data.start_date,
      endDate: parsed.data.end_date,
      trialEndsAt: parsed.data.trial_ends_at,
      paymentStatus: parsed.data.payment_status,
      paymentProvider: parsed.data.payment_provider,
      paymentReference: parsed.data.payment_reference,
    }, { actorUserId: ctx.authUserId });

    await auditCreate(admin, ctx, "subscription", sub.id, {
      centre_id: sub.centre_id,
      plan: { id: plan.id, name: plan.name },
      status: sub.status,
      start_date: sub.start_date,
      end_date: sub.end_date,
      trial_ends_at: sub.trial_ends_at,
    });

    if (sub.status === "active") {
      await notifySubscriptionEvent(admin, sub.centre_id, "ACTIVATED", plan.name);
    } else if (sub.status === "trial") {
      await notifySubscriptionEvent(admin, sub.centre_id, "TRIAL_STARTED", plan.name);
    }

    return NextResponse.json({ data: sub }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
