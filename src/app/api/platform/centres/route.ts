import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { recordAuditEvent } from "@/lib/audit/audit.service";
import { statusFromError } from "@/lib/resources/route-helpers";

/**
 * POST /api/platform/centres
 * PLATFORM ADMIN: create a new centre — platform.centres.
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
        status: "active",
      })
      .select("id, name, code, status, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to create centre." }, { status: 500 });
    }

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
