import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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
import { statusFromError, ensureOwnCentre } from "@/lib/resources/route-helpers";

const disposeSchema = z.object({
  reason: z.string().max(1000).trim().optional().nullable(),
});

// ─── POST /api/resources/assets/[id]/dispose ─────────────────
// Disposes of an asset (sets status to DISPOSED + keeps history).
// Enforces the resources.assets.dispose permission separately.

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "resources.assets.dispose");

    const adminSupabase = createAdminClient();
    const existing = await getAssetById(adminSupabase, id);
    if (!existing || !ensureOwnCentre(existing.centre_id, ctx.centre.id)) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = disposeSchema.safeParse(body);
    const reason = parsed.success ? (parsed.data.reason ?? undefined) : undefined;

    await updateAsset(adminSupabase, id, { asset_status: "DISPOSED" });

    await recordAssetHistory(adminSupabase, id, ctx.centre.id, "STATUS_CHANGED", ctx.authUserId, {
      description: reason || "Asset disposed",
      previousValue: existing.asset_status,
      newValue: "DISPOSED",
    });
    await recordAssetHistory(adminSupabase, id, ctx.centre.id, "DISPOSED", ctx.authUserId, {
      description: reason || "Asset disposed",
    });

    const detail = await getAssetDetail(adminSupabase, id, ctx.centre.id);

    await auditUpdate(
      adminSupabase,
      ctx,
      "support_asset",
      id,
      { asset_status: existing.asset_status },
      { asset_status: "DISPOSED", reason: reason ?? null },
    );

    return NextResponse.json({ data: detail });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
