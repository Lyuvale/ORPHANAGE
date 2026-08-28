import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import { checkInChild } from "@/lib/daily-care/presence.service";
import {
  presenceCheckInSchema,
  cleanDailyCareInput,
} from "@/lib/daily-care/daily-care.validation";

// ─── POST /api/presence/[id]/checkin ────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "presence.check_in");

    const body = await request.json();
    const cleaned = cleanDailyCareInput(body);
    const parsed = presenceCheckInSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const adminSupabase = createAdminClient();
    const presence = await checkInChild(
      adminSupabase,
      ctx.centre.id,
      id,
      new Date().toISOString().split("T")[0],
      ctx.authUserId,
      parsed.data,
    );

    await auditCreate(adminSupabase, ctx, "child_presence_checkin", presence.id, {
      child_id: presence.child_id,
      presence_date: presence.presence_date,
      check_in_time: presence.check_in_time,
    });

    return NextResponse.json({ data: presence }, { status: 201 });
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
