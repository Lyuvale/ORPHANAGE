import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import { listExpenses, createExpense, getFundById } from "@/lib/resources/resources.service";
import { createExpenseSchema, coerceCreate } from "@/lib/resources/resources.validation";
import type { CreateSupportExpenseInput } from "@/types/resources";
import { statusFromError } from "@/lib/resources/route-helpers";

// ─── GET /api/resources/expenses ─────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "resources.view");

    const fundId = request.nextUrl.searchParams.get("fund_id") || undefined;
    const status = request.nextUrl.searchParams.get("status") || undefined;

    const adminSupabase = createAdminClient();
    const result = await listExpenses(adminSupabase, ctx.centre.id, fundId, status);
    return NextResponse.json({ data: result.data, count: result.count });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

// ─── POST /api/resources/expenses ────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "resources.manage");

    const body = await request.json();
    const cleaned = coerceCreate(body);
    const parsed = createExpenseSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    if (parsed.data.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Cannot create an expense for another centre" }, { status: 403 });
    }

    const adminSupabase = createAdminClient();
    // Verify the referenced Fund belongs to this centre.
    const fund = await getFundById(adminSupabase, parsed.data.fund_id);
    if (!fund || fund.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Selected fund does not exist in this centre" }, { status: 403 });
    }

    const expense = await createExpense(
      adminSupabase,
      parsed.data as CreateSupportExpenseInput,
      ctx.authUserId,
    );

    await auditCreate(adminSupabase, ctx, "support_expense", expense.id, {
      fund_id: expense.fund_id,
      description: expense.description,
      amount: expense.amount,
      approval_status: expense.approval_status,
    });

    return NextResponse.json({ data: expense }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
