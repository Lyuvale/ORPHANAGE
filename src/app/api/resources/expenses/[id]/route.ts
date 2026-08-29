import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditUpdate } from "@/lib/audit/audit.service";
import { getExpenseById, getExpenseDetail, updateExpense } from "@/lib/resources/resources.service";
import { updateExpenseSchema, coerceCreate } from "@/lib/resources/resources.validation";
import { statusFromError, ensureOwnCentre } from "@/lib/resources/route-helpers";

// ─── GET /api/resources/expenses/[id] ────────────────────────
// Returns the Expense with full relationship view
// (Fund -> Source -> Benefits -> Children).

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
    const detail = await getExpenseDetail(adminSupabase, id, ctx.centre.id);
    if (!detail) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    return NextResponse.json({ data: detail });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

// ─── PATCH /api/resources/expenses/[id] ──────────────────────

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
    const existing = await getExpenseById(adminSupabase, id);
    if (!existing || !ensureOwnCentre(existing.centre_id, ctx.centre.id)) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const body = await request.json();
    const cleaned = coerceCreate(body);
    const parsed = updateExpenseSchema.safeParse(cleaned);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updated = await updateExpense(adminSupabase, id, parsed.data);

    await auditUpdate(
      adminSupabase,
      ctx,
      "support_expense",
      id,
      { description: existing.description, amount: existing.amount },
      { description: updated.description, amount: updated.amount },
    );

    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
