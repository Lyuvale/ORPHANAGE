import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditUpdate } from "@/lib/audit/audit.service";
import {
  getBenefitById,
  getBenefitDetail,
  updateBenefit,
  setBenefitChildren,
} from "@/lib/resources/resources.service";
import { updateBenefitSchema, coerceCreate } from "@/lib/resources/resources.validation";
import { statusFromError, ensureOwnCentre } from "@/lib/resources/route-helpers";

// ─── GET /api/resources/benefits/[id] ────────────────────────
// Returns the Benefit with full relationship view
// (Expense -> Fund -> Source -> Children).

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
    const detail = await getBenefitDetail(adminSupabase, id, ctx.centre.id);
    if (!detail) {
      return NextResponse.json({ error: "Benefit not found" }, { status: 404 });
    }

    return NextResponse.json({ data: detail });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

// ─── PATCH /api/resources/benefits/[id] ──────────────────────
// Updates benefit fields and, if child_ids is provided, replaces the
// set of linked children (existing child records only).

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
    const existing = await getBenefitById(adminSupabase, id);
    if (!existing || !ensureOwnCentre(existing.centre_id, ctx.centre.id)) {
      return NextResponse.json({ error: "Benefit not found" }, { status: 404 });
    }

    const body = await request.json();
    const cleaned = coerceCreate(body);
    const parsed = updateBenefitSchema.safeParse(cleaned);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { child_ids, ...fields } = parsed.data;
    if (Object.keys(fields).length > 0) {
      await updateBenefit(adminSupabase, id, fields);
    }
    if (child_ids !== undefined) {
      await setBenefitChildren(adminSupabase, id, ctx.centre.id, child_ids, ctx.authUserId);
    }

    const detail = await getBenefitDetail(adminSupabase, id, ctx.centre.id);

    await auditUpdate(
      adminSupabase,
      ctx,
      "support_benefit",
      id,
      { benefit_type: existing.benefit_type },
      { benefit_type: detail?.benefit_type ?? existing.benefit_type, child_count: detail?.children.length ?? 0 },
    );

    return NextResponse.json({ data: detail });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
