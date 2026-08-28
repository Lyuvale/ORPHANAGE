import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import { amendDailyNote, getDailyNoteById } from "@/lib/daily-care/daily-care.service";
import {
  amendDailyNoteSchema,
  cleanDailyCareInput,
} from "@/lib/daily-care/daily-care.validation";

// ─── POST /api/daily-care/notes/[id]/amend ──────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "daily_care.notes.amend");

    const adminSupabase = createAdminClient();
    const existing = await getDailyNoteById(adminSupabase, id);

    if (!existing) {
      return NextResponse.json({ error: "Daily note not found" }, { status: 404 });
    }

    if (existing.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Daily note not found" }, { status: 404 });
    }

    const body = await request.json();
    const cleaned = cleanDailyCareInput(body);
    const parsed = amendDailyNoteSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const amendedNote = await amendDailyNote(
      adminSupabase,
      id,
      parsed.data,
      ctx.authUserId,
    );

    await auditCreate(adminSupabase, ctx, "daily_note_amendment", amendedNote.id, {
      parent_note_id: id,
      child_id: amendedNote.child_id,
      version: amendedNote.version,
      amendment_reason: parsed.data.amendment_reason,
    });

    return NextResponse.json({ data: amendedNote }, { status: 201 });
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
