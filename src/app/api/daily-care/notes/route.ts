import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { caregiverAssignmentScope } from "@/lib/caregivers/caregiver.service";
import { auditCreate } from "@/lib/audit/audit.service";
import { listDailyNotes, createDailyNote } from "@/lib/daily-care/daily-care.service";
import {
  createDailyNoteSchema,
  dailyNoteSearchSchema,
  cleanDailyCareInput,
} from "@/lib/daily-care/daily-care.validation";
import type { CreateDailyNoteInput } from "@/types/daily-care";

// ─── GET /api/daily-care/notes ──────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "daily_care.view");

    const { searchParams } = new URL(request.url);
    const parsed = dailyNoteSearchSchema.safeParse({
      child_id: searchParams.get("child_id") ?? undefined,
      note_date: searchParams.get("note_date") ?? undefined,
      note_type: searchParams.get("note_type") ?? undefined,
      date_from: searchParams.get("date_from") ?? undefined,
      date_to: searchParams.get("date_to") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const adminSupabase = createAdminClient();

    // Spec: a caregiver sees ASSIGNED CHILDREN ONLY.
    const { assignedIds } = await caregiverAssignmentScope(
      adminSupabase,
      supabase as unknown as SupabaseClient,
      ctx,
    );
    const requestedChildId = parsed.data.child_id || undefined;
    if (assignedIds && requestedChildId && !assignedIds.includes(requestedChildId)) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }

    const { data, count } = await listDailyNotes(adminSupabase, {
      centre_id: ctx.centre.id,
      child_id: requestedChildId,
      child_ids: assignedIds ?? undefined,
      note_date: parsed.data.note_date || undefined,
      note_type: parsed.data.note_type,
      date_from: parsed.data.date_from || undefined,
      date_to: parsed.data.date_to || undefined,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });

    return NextResponse.json({ data, count });
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

// ─── POST /api/daily-care/notes ─────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "daily_care.notes.create");

    const body = await request.json();
    const cleaned = cleanDailyCareInput(body);
    const parsed = createDailyNoteSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    if (data.centre_id !== ctx.centre.id) {
      return NextResponse.json(
        { error: "Cannot create daily note for another centre" },
        { status: 403 },
      );
    }

    const adminSupabase = createAdminClient();

    // Spec: a caregiver records ASSIGNED CHILDREN ONLY.
    const { assignedIds: writeIds } = await caregiverAssignmentScope(
      adminSupabase,
      supabase as unknown as SupabaseClient,
      ctx,
    );
    if (writeIds && !writeIds.includes(data.child_id)) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }

    const note = await createDailyNote(
      adminSupabase,
      data as CreateDailyNoteInput,
      ctx.authUserId,
    );

    await auditCreate(adminSupabase, ctx, "daily_note", note.id, {
      child_id: note.child_id,
      note_date: note.note_date,
      note_type: note.note_type,
    });

    return NextResponse.json({ data: note }, { status: 201 });
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
