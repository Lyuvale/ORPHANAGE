import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditUpdate } from "@/lib/audit/audit.service";
import {
  getPlanById,
  updatePlan,
  setPlanFeatures,
} from "@/lib/subscriptions/subscription.service";
import {
  updatePlanSchema,
  setPlanFeaturesSchema,
} from "@/lib/subscriptions/subscription.validation";

function statusFromError(message: string): number {
  if (message.includes("NOT_AUTHENTICATED")) return 401;
  if (message.includes("PERMISSION_DENIED")) return 403;
  if (message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE") || message.includes("SUBSCRIPTION_INACTIVE")) return 403;
  if (message.includes("V_")) return 400;
  if (message.includes("already exists")) return 409;
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
    const parsed = updatePlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const existing = await getPlanById(admin, id);
    if (!existing) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const updated = await updatePlan(admin, id, {
      name: parsed.data.name,
      description: parsed.data.description,
      price: parsed.data.price,
      billing_period: parsed.data.billing_period,
      is_active: parsed.data.is_active,
    });

    await auditUpdate(admin, ctx, "plan", id,
      {
        name: existing.name,
        price: existing.price,
        billing_period: existing.billing_period,
        is_active: existing.is_active,
      },
      {
        name: updated.name,
        price: updated.price,
        billing_period: updated.billing_period,
        is_active: updated.is_active,
      },
    );

    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient, {
      allowInactiveSubscription: true,
    });
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "subscriptions.manage");

    const admin = createAdminClient();
    const existing = await getPlanById(admin, id);
    if (!existing) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Soft-deactivate rather than hard-delete (plans may have historic subscriptions
    // referencing them, and the FK is RESTRICT).
    const updated = await updatePlan(admin, id, { is_active: false });

    await auditUpdate(admin, ctx, "plan", id,
      { is_active: existing.is_active },
      { is_active: false },
    );

    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

export async function PUT(
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
    const parsed = setPlanFeaturesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const updated = await setPlanFeatures(admin, id, parsed.data.features);

    await auditUpdate(admin, ctx, "plan_features", id, {}, {});

    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
