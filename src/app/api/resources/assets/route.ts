import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import {
  listAssets,
  createAsset,
  recordAssetHistory,
} from "@/lib/resources/resources.service";
import { createAssetSchema, coerceCreate } from "@/lib/resources/resources.validation";
import type { CreateSupportAssetInput } from "@/types/resources";
import { statusFromError } from "@/lib/resources/route-helpers";

// ─── GET /api/resources/assets ───────────────────────────────
// Query: ?category=...&status=...

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "resources.assets.view");

    const category = request.nextUrl.searchParams.get("category") || undefined;
    const status = request.nextUrl.searchParams.get("status") || undefined;

    const adminSupabase = createAdminClient();
    const result = await listAssets(adminSupabase, ctx.centre.id, category, status);
    return NextResponse.json({ data: result.data, count: result.count });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

// ─── POST /api/resources/assets ──────────────────────────────
// Creates an Asset. Optional Source/Fund/Expense/Benefit links; when the
// source is unknown, leave source_id empty and set source_unknown = true
// ("Existing Centre Asset / Unknown" — we never invent a source).

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "resources.assets.manage");

    const body = await request.json();
    // Tenant default: UI forms never send centre_id — attribute the record to
    // the caller's own centre (explicit mismatches are still rejected below).
    if (!body.centre_id) body.centre_id = ctx.centre.id;
    const cleaned = coerceCreate(body);
    const parsed = createAssetSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    if (parsed.data.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Cannot create an asset for another centre" }, { status: 403 });
    }

    const adminSupabase = createAdminClient();
    const asset = await createAsset(
      adminSupabase,
      parsed.data as CreateSupportAssetInput,
      ctx.authUserId,
    );

    await recordAssetHistory(
      adminSupabase,
      asset.id,
      ctx.centre.id,
      "CREATED",
      ctx.authUserId,
      { description: `Asset created: ${asset.asset_name}` },
    );

    await auditCreate(adminSupabase, ctx, "support_asset", asset.id, {
      asset_name: asset.asset_name,
      asset_category: asset.asset_category,
      quantity: asset.quantity,
      source_id: asset.source_id,
      source_unknown: asset.source_unknown,
      purchase_cost: asset.purchase_cost,
    });

    return NextResponse.json({ data: asset }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
