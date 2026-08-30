import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditUpdate } from "@/lib/audit/audit.service";
import { notifyRole, notifyUsers } from "@/lib/notifications/notifications.service";
import { getExpenseById, setExpenseApproval } from "@/lib/resources/resources.service";
import { expenseApprovalSchema } from "@/lib/resources/resources.validation";
import { statusFromError, ensureOwnCentre } from "@/lib/resources/route-helpers";

// ─── POST /api/resources/expenses/[id]/approval ──────────────
// Approve / reject / return-to-pending an expense.
// Only resources.approve is allowed (Accountant/Bursar, Centre Manager).
// Approval is a balance-affecting transaction, so it is audited.

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "resources.approve");

    const adminSupabase = createAdminClient();
    const existing = await getExpenseById(adminSupabase, id);
    if (!existing || !ensureOwnCentre(existing.centre_id, ctx.centre.id)) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = expenseApprovalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updated = await setExpenseApproval(adminSupabase, id, parsed.data.status, ctx.authUserId);

    await auditUpdate(
      adminSupabase,
      ctx,
      "support_expense_approval",
      id,
      { approval_status: existing.approval_status },
      { approval_status: updated.approval_status, amount: updated.amount, fund_id: updated.fund_id },
    );

    if (updated.approval_status === "APPROVED") {
      await notifyUsers(adminSupabase, ctx.centre.id, [existing.created_by], {
        title: "Expense approved",
        message: `Your expense of ${updated.amount} has been approved.`,
        type: "INFORMATION",
        event_type: "EXPENSE_APPROVED",
        entity_type: "EXPENSE",
        entity_id: id,
        route: `/resources/expenses/${id}`,
      }, ctx.authUserId);
      await notifyRole(adminSupabase, ctx.centre.id, ["ACCOUNTANT_BURSAR", "CENTRE_MANAGER"], {
        title: "Expense approved",
        message: `An expense of ${updated.amount} was approved.`,
        type: "INFORMATION",
        event_type: "EXPENSE_APPROVED",
        entity_type: "EXPENSE",
        entity_id: id,
        route: `/resources/expenses/${id}`,
      }, ctx.authUserId);
    } else if (updated.approval_status === "REJECTED") {
      await notifyUsers(adminSupabase, ctx.centre.id, [existing.created_by], {
        title: "Expense rejected",
        message: `Your expense of ${updated.amount} was rejected.`,
        type: "WARNING",
        event_type: "EXPENSE_REJECTED",
        entity_type: "EXPENSE",
        entity_id: id,
        route: `/resources/expenses/${id}`,
      }, ctx.authUserId);
      await notifyRole(adminSupabase, ctx.centre.id, ["ACCOUNTANT_BURSAR", "CENTRE_MANAGER"], {
        title: "Expense rejected",
        message: `An expense of ${updated.amount} was rejected.`,
        type: "WARNING",
        event_type: "EXPENSE_REJECTED",
        entity_type: "EXPENSE",
        entity_id: id,
        route: `/resources/expenses/${id}`,
      }, ctx.authUserId);
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
