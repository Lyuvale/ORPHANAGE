import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import {
  listPlans,
  createPlan,
} from "@/lib/subscriptions/subscription.service";
import { createPlanSchema } from "@/lib/subscriptions/subscription.validation";

function statusFromError(message: string): number {
  if (message.includes("NOT_AUTHENTICATED")) return 401;
  if (message.includes("PERMISSION_DENIED")) return 403;
  if (message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE") || message.includes("SUBSCRIPTION_INACTIVE")) return 403;
  if (message.includes("V_")) return 400;
  if (message.includes("already exists")) return 409;
  return 500;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    // Allow a centre without an active subscription to browse plans so it can
    // pick one and submit a payment request. (The submit endpoint uses the same
    // option; a fresh centre has SUBSCRIPTION_INACTIVE by default.)
    await requireAppAccess(supabase as unknown as SupabaseClient, {
      allowInactiveSubscription: true,
    });

    const includeInactive = request.nextUrl.searchParams.get("include_inactive") === "true";
    const admin = createAdminClient();
    const plans = await listPlans(admin, { includeInactive });
    return NextResponse.json({ data: plans });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient, {
      allowInactiveSubscription: true,
    });
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "subscriptions.manage");

    const body = await request.json();
    const parsed = createPlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const plan = await createPlan(admin, {
      name: parsed.data.name,
      description: parsed.data.description,
      price: parsed.data.price,
      billing_period: parsed.data.billing_period ?? "MONTHLY",
      is_active: parsed.data.is_active ?? true,
    });

    await auditCreate(admin, ctx, "plan", plan.id, {
      name: plan.name,
      price: plan.price,
      billing_period: plan.billing_period,
      is_active: plan.is_active,
    });

    return NextResponse.json({ data: plan }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
