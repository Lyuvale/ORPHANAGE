import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import {
  listBenefits,
  createBenefit,
  getExpenseById,
  setBenefitChildren,
} from "@/lib/resources/resources.service";
import { createBenefitSchema, coerceCreate } from "@/lib/resources/resources.validation";
import type { CreateSupportBenefitInput } from "@/types/resources";
import { statusFromError } from "@/lib/resources/route-helpers";

// ─── GET /api/resources/benefits ─────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "resources.view");

    const expenseId = request.nextUrl.searchParams.get("expense_id") || undefined;

    const adminSupabase = createAdminClient();
    const result = await listBenefits(adminSupabase, ctx.centre.id, expenseId);
    return NextResponse.json({ data: result.data, count: result.count });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

// ─── POST /api/resources/benefits ────────────────────────────
// Creates the Benefit, then (optionally) links the existing children
// (child_ids) who benefited. Child records are never duplicated.

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "resources.manage");

    const body = await request.json();
    const cleaned = coerceCreate(body);
    const parsed = createBenefitSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    if (parsed.data.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Cannot create a benefit for another centre" }, { status: 403 });
    }

    const adminSupabase = createAdminClient();
    // Verify the referenced Expense belongs to this centre.
    const expense = await getExpenseById(adminSupabase, parsed.data.expense_id);
    if (!expense || expense.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Selected expense does not exist in this centre" }, { status: 403 });
    }

    const benefit = await createBenefit(
      adminSupabase,
      parsed.data as CreateSupportBenefitInput,
      ctx.authUserId,
    );

    // Link existing children (validated for centre ownership inside the service).
    if (parsed.data.child_ids.length > 0) {
      await setBenefitChildren(adminSupabase, benefit.id, ctx.centre.id, parsed.data.child_ids, ctx.authUserId);
    }

    await auditCreate(adminSupabase, ctx, "support_benefit", benefit.id, {
      expense_id: benefit.expense_id,
      benefit_type: benefit.benefit_type,
      child_count: parsed.data.child_ids.length,
    });

    return NextResponse.json({ data: benefit }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
