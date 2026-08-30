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
  recordAssetHistory,
} from "@/lib/resources/resources.service";
import { assetStatusSchema, coerceCreate } from "@/lib/resources/resources.validation";
import { statusFromError, ensureOwnCentre } from "@/lib/resources/route-helpers";

// ─── PATCH /api/resources/assets/[id]/status ─────────────────
// Updates asset status / condition / location (each authorisable, history kept).
// Enforces the resources.assets.status permission.

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "resources.assets.status");

    const adminSupabase = createAdminClient();
    const existing = await getAssetById(adminSupabase, id);
    if (!existing || !ensureOwnCentre(existing.centre_id, ctx.centre.id)) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const body = await request.json();
    const cleaned = coerceCreate(body);
    const parsed = assetStatusSchema.safeParse(cleaned);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { asset_status, asset_condition, location, reason } = parsed.data;

    if (asset_status === "DISPOSED") {
      return NextResponse.json(
        { error: "Use the dispose action to dispose of an asset" },
        { status: 400 },
      );
    }

    const changes: Record<string, unknown> = {};
    if (asset_status !== undefined && asset_status !== existing.asset_status) {
      changes.asset_status = asset_status;
    }
    if (asset_condition !== undefined && asset_condition !== existing.asset_condition) {
      changes.asset_condition = asset_condition;
    }
    if (location !== undefined && location !== (existing.location ?? null)) {
      changes.location = location;
    }

    if (Object.keys(changes).length > 0) {
      await updateAsset(adminSupabase, id, changes);
    }

    // Record dedicated history events for each changed attribute.
    if (changes.asset_status !== undefined) {
      await recordAssetHistory(adminSupabase, id, ctx.centre.id, "STATUS_CHANGED", ctx.authUserId, {
        description: reason || "Status changed",
        previousValue: existing.asset_status,
        newValue: asset_status,
      });
    }
    if (changes.asset_condition !== undefined) {
      await recordAssetHistory(adminSupabase, id, ctx.centre.id, "CONDITION_CHANGED", ctx.authUserId, {
        previousValue: existing.asset_condition,
        newValue: asset_condition,
      });
    }
    if (changes.location !== undefined) {
      await recordAssetHistory(adminSupabase, id, ctx.centre.id, "LOCATION_CHANGED", ctx.authUserId, {
        previousValue: existing.location ?? null,
        newValue: location ?? null,
      });
    }

    const detail = await getAssetDetail(adminSupabase, id, ctx.centre.id);

    await auditUpdate(
      adminSupabase,
      ctx,
      "support_asset",
      id,
      { asset_status: existing.asset_status, asset_condition: existing.asset_condition, location: existing.location },
      {
        asset_status: detail?.asset_status ?? existing.asset_status,
        asset_condition: detail?.asset_condition ?? existing.asset_condition,
        location: detail?.location ?? existing.location,
      },
    );

    return NextResponse.json({ data: detail });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
