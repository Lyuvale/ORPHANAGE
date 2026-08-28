import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate, auditUpdate } from "@/lib/audit/audit.service";
import {
  checkInVisit,
  checkOutVisit,
  completeVisit,
  getVisitById,
  getVisitStatusHistory,
} from "@/lib/visits/visit.service";
import {
  checkInSchema,
  checkOutSchema,
  visitOutcomeSchema,
  cleanVisitInput,
} from "@/lib/visits/visit.validation";

// ─── GET /api/visits/[id]/check ─────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "visits.view");

    const adminSupabase = createAdminClient();
    const visit = await getVisitById(adminSupabase, id);

    if (!visit) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    if (visit.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    const history = await getVisitStatusHistory(adminSupabase, id);

    return NextResponse.json({ data: { visit, history } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("NOT_AUTHENTICATED")
      ? 401
      : message.includes("PERMISSION_DENIED")
        ? 403
        : message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE")
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// ─── POST /api/visits/[id]/check ──────────────────────────── (check-in / check-out / complete)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);

    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    const adminSupabase = createAdminClient();
    const existing = await getVisitById(adminSupabase, id);

    if (!existing) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    if (existing.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    if (action === "checkin") {
      await requirePermission(supabase as unknown as SupabaseClient, ctx, "visits.checkin");

      const body = await request.json();
      const cleaned = cleanVisitInput(body);
      const parsed = checkInSchema.safeParse(cleaned);

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten() },
          { status: 400 },
        );
      }

      const updated = await checkInVisit(adminSupabase, id, ctx.centre.id, ctx.authUserId, parsed.data);

      await auditCreate(adminSupabase, ctx, "visit_checkin", id, {
        reference_number: updated.reference_number,
        actual_check_in_time: updated.actual_check_in_time,
      });

      return NextResponse.json({ data: updated });
    }

    if (action === "checkout") {
      await requirePermission(supabase as unknown as SupabaseClient, ctx, "visits.checkout");

      const body = await request.json();
      const cleaned = cleanVisitInput(body);
      const parsed = checkOutSchema.safeParse(cleaned);

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten() },
          { status: 400 },
        );
      }

      const updated = await checkOutVisit(adminSupabase, id, ctx.centre.id, ctx.authUserId, parsed.data);

      await auditUpdate(adminSupabase, ctx, "visit_checkout", id, existing as unknown as Record<string, unknown>, {
        actual_check_out_time: updated.actual_check_out_time,
      });

      return NextResponse.json({ data: updated });
    }

    if (action === "complete") {
      await requirePermission(supabase as unknown as SupabaseClient, ctx, "visits.complete");

      const body = await request.json();
      const cleaned = cleanVisitInput(body);
      const parsed = visitOutcomeSchema.safeParse(cleaned);

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten() },
          { status: 400 },
        );
      }

      const updated = await completeVisit(adminSupabase, id, ctx.centre.id, ctx.authUserId, parsed.data);

      await auditUpdate(adminSupabase, ctx, "visit_complete", id, existing as unknown as Record<string, unknown>, {
        outcome: updated.outcome,
        status: updated.status,
      });

      return NextResponse.json({ data: updated });
    }

    return NextResponse.json(
      { error: "Invalid action. Use ?action=checkin, ?action=checkout, or ?action=complete" },
      { status: 400 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("NOT_AUTHENTICATED")
      ? 401
      : message.includes("PERMISSION_DENIED")
        ? 403
        : message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE")
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
