import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { recordAuditEvent } from "@/lib/audit/audit.service";
import { statusFromError } from "@/lib/resources/route-helpers";
import { createSubscription, getPlanById, listPlans } from "@/lib/subscriptions/subscription.service";
import { loadSubscriptionForContext } from "@/lib/subscriptions/subscription-access.service";

/**
 * POST /api/platform/centres
 * PLATFORM ADMIN: create a new centre — platform.centres.
 *
 * SECURITY: a centre is NEVER created "active". New centres are created with
 * status "pending" and a TRIAL subscription is provisioned immediately (on the
 * requested active plan, or the cheapest active plan), so an "active" centre
 * can never exist without a subscription. A centre is only useful once the
 * platform administrator ACTIVATES it (PATCH), which requires a valid
 * subscription.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient, {
      allowInactiveSubscription: true,
    });
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "platform.centres");

    const body = (await request.json()) as {
      name?: string;
      code?: string;
      contact_email?: string;
      contact_phone?: string;
      address_line1?: string;
      city?: string;
      country?: string;
      plan_id?: string;
    };

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Centre name is required." }, { status: 400 });
    }
    if (!body.code?.trim()) {
      return NextResponse.json({ error: "Centre code is required." }, { status: 400 });
    }

    const admin = createAdminClient();

    // Check for duplicate code
    const { data: existing } = await admin
      .from("centres")
      .select("id")
      .ilike("code", body.code.trim())
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: `A centre with code "${body.code.trim()}" already exists.` },
        { status: 409 },
      );
    }

    // Resolve the plan to provision: explicit active plan, else cheapest active plan.
    let planId: string | null = null;
    if (body.plan_id?.trim()) {
      const plan = await getPlanById(admin, body.plan_id.trim());
      if (!plan || !plan.is_active) {
        return NextResponse.json({ error: "The requested plan does not exist or is inactive." }, { status: 400 });
      }
      planId = plan.id;
    }

    // Create the centre as PENDING (never active without a subscription).
    const { data, error } = await admin
      .from("centres")
      .insert({
        name: body.name.trim(),
        code: body.code.trim().toUpperCase(),
        contact_email: body.contact_email?.trim() || null,
        contact_phone: body.contact_phone?.trim() || null,
        address_line1: body.address_line1?.trim() || null,
        city: body.city?.trim() || null,
        country: body.country?.trim() || "Nigeria",
        status: "pending",
      })
      .select("id, name, code, status, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to create centre." }, { status: 500 });
    }

    // Provision a trial subscription (14 days) so the centre is ready to be
    // activated with a plan in place.
    const chosenPlanId =
      planId ?? (await listPlans(admin)).sort((a, b) => Number(a.price) - Number(b.price))[0]?.id ?? null;

    if (!chosenPlanId) {
      await admin.from("centres").delete().eq("id", data.id);
      return NextResponse.json(
        { error: "No active plan exists. Create a plan first, then create the centre." },
        { status: 400 },
      );
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    const trialEndIso = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    await createSubscription(admin, {
      centreId: data.id,
      planId: chosenPlanId,
      status: "trial",
      startDate: todayIso,
      trialEndsAt: trialEndIso,
    }, { actorUserId: ctx.profile.id, reason: "Trial subscription provisioned automatically at centre creation." });

    await recordAuditEvent(admin, ctx, {
      action: "CENTRE_CREATED",
      entity_type: "centre",
      entity_id: data.id,
      new_values: { name: data.name, code: data.code, status: data.status },
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

/**
 * GET /api/platform/centres
 * PLATFORM ADMIN: list all centres across the platform (platform.centres).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient, {
      allowInactiveSubscription: true,
    });
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "platform.centres");

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("centres")
      .select("id, name, code, status, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "Failed to load centres" }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

/**
 * PATCH /api/platform/centres
 * PLATFORM ADMIN: update a centre (e.g. activate/deactivate) — platform.centres.
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient, {
      allowInactiveSubscription: true,
    });
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "platform.centres");

    const body = (await request.json()) as { centre_id?: string; is_active?: boolean };
    if (!body.centre_id || typeof body.is_active !== "boolean") {
      return NextResponse.json({ error: "V_INVALID: centre_id and is_active required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const targetStatus = body.is_active ? "active" : "deactivated";

    const { data: existing } = await admin
      .from("centres")
      .select("id, name, status")
      .eq("id", body.centre_id)
      .maybeSingle();
    if (!existing) {
      return NextResponse.json({ error: "Centre not found" }, { status: 404 });
    }

    // SECURITY: activation requires a valid subscription.
    if (targetStatus === "active") {
      const subCtx = await loadSubscriptionForContext(admin as never, body.centre_id);
      if (!subCtx.isSubscriptionValid) {
        return NextResponse.json(
          { error: "Cannot activate this centre — it has no valid subscription. Assign or renew a plan first." },
          { status: 400 },
        );
      }
    }

    const { data, error } = await admin
      .from("centres")
      .update({ status: targetStatus })
      .eq("id", body.centre_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update centre" }, { status: 500 });
    }

    await recordAuditEvent(admin, ctx, {
      action: "CENTRE_STATUS_CHANGED",
      entity_type: "centre",
      entity_id: body.centre_id,
      previous_values: { status: existing.status },
      new_values: { status: targetStatus },
    });

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
