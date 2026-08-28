import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditUpdate } from "@/lib/audit/audit.service";
import { getFollowupById, updateFollowup } from "@/lib/daily-care/daily-care.service";
import {
  updateFollowupSchema,
  cleanDailyCareInput,
} from "@/lib/daily-care/daily-care.validation";

// ─── GET /api/daily-care/followups/[id] ─────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "daily_care.view");

    const adminSupabase = createAdminClient();
    const followup = await getFollowupById(adminSupabase, id);

    if (!followup) {
      return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });
    }

    if (followup.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });
    }

    return NextResponse.json({ data: followup });
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

// ─── PATCH /api/daily-care/followups/[id] ───────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(
      supabase as unknown as SupabaseClient,
      ctx,
      "daily_care.followups.update",
    );

    const adminSupabase = createAdminClient();
    const existing = await getFollowupById(adminSupabase, id);

    if (!existing) {
      return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });
    }

    if (existing.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });
    }

    const body = await request.json();
    const cleaned = cleanDailyCareInput(body);
    const parsed = updateFollowupSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updated = await updateFollowup(adminSupabase, id, parsed.data);

    await auditUpdate(
      adminSupabase,
      ctx,
      "care_followup_status",
      id,
      existing as unknown as Record<string, unknown>,
      { status: updated.status },
    );

    return NextResponse.json({ data: updated });
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
