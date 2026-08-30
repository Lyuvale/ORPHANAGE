import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import {
  getAssetById,
  createAssetCost,
  recordAssetHistory,
  getExpenseById,
} from "@/lib/resources/resources.service";
import { createAssetCostSchema, coerceCreate } from "@/lib/resources/resources.validation";
import type { CreateSupportAssetCostInput } from "@/types/resources";
import { statusFromError, ensureOwnCentre } from "@/lib/resources/route-helpers";

// ─── POST /api/resources/assets/[id]/costs ───────────────────
// Records a Repair or Maintenance cost. May reference an EXISTING Expense
// so the real transaction is never duplicated. amount null = Unknown.

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "resources.assets.costs");

    const adminSupabase = createAdminClient();
    const asset = await getAssetById(adminSupabase, id);
    if (!asset || !ensureOwnCentre(asset.centre_id, ctx.centre.id)) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const body = await request.json();
    const cleaned = coerceCreate(body);
    const parsed = createAssetCostSchema.safeParse(cleaned);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    if (parsed.data.asset_id !== id) {
      return NextResponse.json({ error: "Asset mismatch" }, { status: 400 });
    }
    if (parsed.data.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Cannot record a cost for another centre" }, { status: 403 });
    }

    // If linking to an existing Expense, it must belong to this centre.
    if (parsed.data.expense_id) {
      const expense = await getExpenseById(adminSupabase, parsed.data.expense_id);
      if (!expense || expense.centre_id !== ctx.centre.id) {
        return NextResponse.json({ error: "Selected expense does not exist in this centre" }, { status: 403 });
      }
    }

    const cost = await createAssetCost(
      adminSupabase,
      parsed.data as CreateSupportAssetCostInput,
      ctx.authUserId,
    );

    await recordAssetHistory(
      adminSupabase,
      id,
      ctx.centre.id,
      "COST_RECORDED",
      ctx.authUserId,
      {
        description: `${cost.cost_type === "REPAIR" ? "Repair" : "Maintenance"} cost recorded`,
        newValue: cost.amount === null ? "Unknown" : String(cost.amount),
      },
    );

    await auditCreate(adminSupabase, ctx, "support_asset_cost", cost.id, {
      asset_id: id,
      cost_type: cost.cost_type,
      amount: cost.amount,
      expense_id: cost.expense_id,
    });

    return NextResponse.json({ data: cost }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
