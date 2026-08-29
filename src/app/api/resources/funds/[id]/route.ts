import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditUpdate } from "@/lib/audit/audit.service";
import { getFundById, getFundDetail, updateFund } from "@/lib/resources/resources.service";
import { updateFundSchema, coerceCreate } from "@/lib/resources/resources.validation";
import { statusFromError, ensureOwnCentre } from "@/lib/resources/route-helpers";

// ─── GET /api/resources/funds/[id] ───────────────────────────
// Returns the Fund with computed balance and full relationship view
// (Source -> Expenses -> Benefits -> Children).

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "resources.view");

    const adminSupabase = createAdminClient();
    const detail = await getFundDetail(adminSupabase, id, ctx.centre.id);
    if (!detail) {
      return NextResponse.json({ error: "Fund not found" }, { status: 404 });
    }

    return NextResponse.json({ data: detail });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

// ─── PATCH /api/resources/funds/[id] ─────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "resources.manage");

    const adminSupabase = createAdminClient();
    const existing = await getFundById(adminSupabase, id);
    if (!existing || !ensureOwnCentre(existing.centre_id, ctx.centre.id)) {
      return NextResponse.json({ error: "Fund not found" }, { status: 404 });
    }

    const body = await request.json();
    const cleaned = coerceCreate(body);
    const parsed = updateFundSchema.safeParse(cleaned);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // If the source is being changed, validate ownership.
    if (parsed.data.source_id) {
      const { getSourceById } = await import("@/lib/resources/resources.service");
      const source = await getSourceById(adminSupabase, parsed.data.source_id);
      if (!source || source.centre_id !== ctx.centre.id) {
        return NextResponse.json({ error: "Selected source does not exist in this centre" }, { status: 403 });
      }
    }

    const updated = await updateFund(adminSupabase, id, parsed.data);

    await auditUpdate(
      adminSupabase,
      ctx,
      "support_fund",
      id,
      { fund_name: existing.fund_name, amount_allocated: existing.amount_allocated },
      { fund_name: updated.fund_name, amount_allocated: updated.amount_allocated },
    );

    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
