import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { recordAuditEvent } from "@/lib/audit/audit.service";

/**
 * POST /api/platform/centres/update
 * PLATFORM ADMIN: update centre details (name, code, contact, address, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient, {
      allowInactiveSubscription: true,
    });
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "platform.centres");

    const body = (await request.json()) as {
      centre_id?: string;
      name?: string;
      code?: string;
      contact_email?: string;
      contact_phone?: string;
      address_line1?: string;
      city?: string;
      country?: string;
    };

    if (!body.centre_id) {
      return NextResponse.json({ error: "centre_id is required." }, { status: 400 });
    }

    const admin = createAdminClient();

    // Get existing centre
    const { data: existing } = await admin
      .from("centres")
      .select("id, name, code")
      .eq("id", body.centre_id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Centre not found." }, { status: 404 });
    }

    // Check for duplicate code if changing
    if (body.code && body.code.toUpperCase() !== (existing.code ?? "").toUpperCase()) {
      const { data: dup } = await admin
        .from("centres")
        .select("id")
        .ilike("code", body.code.trim())
        .maybeSingle();
      if (dup) {
        return NextResponse.json(
          { error: `A centre with code "${body.code.trim()}" already exists.` },
          { status: 409 },
        );
      }
    }

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.code !== undefined) updates.code = body.code.trim().toUpperCase();
    if (body.contact_email !== undefined) updates.contact_email = body.contact_email.trim() || null;
    if (body.contact_phone !== undefined) updates.contact_phone = body.contact_phone.trim() || null;
    if (body.address_line1 !== undefined) updates.address_line1 = body.address_line1.trim() || null;
    if (body.city !== undefined) updates.city = body.city.trim() || null;
    if (body.country !== undefined) updates.country = body.country.trim() || null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided." }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await admin
      .from("centres")
      .update(updates)
      .eq("id", body.centre_id)
      .select("id, name, code, status, contact_email, contact_phone, address_line1, city, country, created_at, updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update centre." }, { status: 500 });
    }

    await recordAuditEvent(admin, ctx, {
      action: "CENTRE_UPDATED",
      entity_type: "centre",
      entity_id: body.centre_id,
      previous_values: { name: existing.name, code: existing.code },
      new_values: updates,
    });

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
