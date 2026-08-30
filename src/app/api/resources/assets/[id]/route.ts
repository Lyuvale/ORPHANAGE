import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditUpdate } from "@/lib/audit/audit.service";
import {
  getAssetById,
  getAssetDetail,
  updateAsset,
} from "@/lib/resources/resources.service";
import { updateAssetSchema, coerceCreate } from "@/lib/resources/resources.validation";
import { statusFromError, ensureOwnCentre } from "@/lib/resources/route-helpers";

// ─── GET /api/resources/assets/[id] ──────────────────────────
// Returns the Asset with full relationship view + computed costs + history.

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "resources.assets.view");

    const adminSupabase = createAdminClient();
    const detail = await getAssetDetail(adminSupabase, id, ctx.centre.id);
    if (!detail) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    return NextResponse.json({ data: detail });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

// ─── PATCH /api/resources/assets/[id] ────────────────────────
// General asset edits (name, category, quantity, purchase cost, links).
// Status/location/condition changes go through the dedicated /status route
// (enforces the assets.status permission); this route requires assets.manage.

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "resources.assets.manage");

    const adminSupabase = createAdminClient();
    const existing = await getAssetById(adminSupabase, id);
    if (!existing || !ensureOwnCentre(existing.centre_id, ctx.centre.id)) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const body = await request.json();
    const cleaned = coerceCreate(body);
    const parsed = updateAssetSchema.safeParse(cleaned);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Status/location/condition belong to the dedicated status endpoint.
    const fields = { ...parsed.data };
    delete fields.asset_status;
    delete fields.asset_condition;
    delete fields.location;
    delete fields.status_change_reason;

    if (Object.keys(fields).length > 0) {
      await updateAsset(adminSupabase, id, fields);
    }

    const detail = await getAssetDetail(adminSupabase, id, ctx.centre.id);

    await auditUpdate(
      adminSupabase,
      ctx,
      "support_asset",
      id,
      { asset_name: existing.asset_name, purchase_cost: existing.purchase_cost },
      {
        asset_name: detail?.asset_name ?? existing.asset_name,
        purchase_cost: detail?.purchase_cost ?? existing.purchase_cost,
      },
    );

    return NextResponse.json({ data: detail });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
