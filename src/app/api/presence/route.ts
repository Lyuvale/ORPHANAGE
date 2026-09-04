import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { caregiverAssignmentScope } from "@/lib/caregivers/caregiver.service";
import { auditCreate } from "@/lib/audit/audit.service";
import {
  listPresenceRecords,
  createPresenceRecord,
  getDailyPresenceSummary,
} from "@/lib/daily-care/presence.service";
import {
  createPresenceSchema,
  presenceSearchSchema,
  cleanDailyCareInput,
} from "@/lib/daily-care/daily-care.validation";
import type { CreatePresenceInput } from "@/types/presence";

// ─── GET /api/presence ──────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "presence.view");

    const { searchParams } = new URL(request.url);
    const parsed = presenceSearchSchema.safeParse({
      child_id: searchParams.get("child_id") ?? undefined,
      presence_date: searchParams.get("presence_date") ?? undefined,
      status: searchParams.get("status") ?? undefined,
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

    // Spec: a caregiver sees/records ASSIGNED CHILDREN ONLY.
    const { assignedIds } = await caregiverAssignmentScope(
      adminSupabase,
      supabase as unknown as SupabaseClient,
      ctx,
    );
    const requestedChildId = parsed.data.child_id || undefined;
    if (assignedIds && requestedChildId && !assignedIds.includes(requestedChildId)) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }

    if (searchParams.get("summary") === "true" && searchParams.get("date")) {
      const summary = await getDailyPresenceSummary(
        adminSupabase,
        ctx.centre.id,
        searchParams.get("date")!,
        assignedIds ?? undefined,
      );
      return NextResponse.json({ data: summary });
    }

    const { data, count } = await listPresenceRecords(adminSupabase, {
      centre_id: ctx.centre.id,
      child_id: requestedChildId,
      child_ids: assignedIds ?? undefined,
      presence_date: parsed.data.presence_date || undefined,
      status: parsed.data.status,
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

// ─── POST /api/presence ─────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "presence.create");

    const body = await request.json();
    const cleaned = cleanDailyCareInput(body);
    const parsed = createPresenceSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    if (data.centre_id !== ctx.centre.id) {
      return NextResponse.json(
        { error: "Cannot create presence record for another centre" },
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

    const presence = await createPresenceRecord(
      adminSupabase,
      data as CreatePresenceInput,
      ctx.authUserId,
    );

    await auditCreate(adminSupabase, ctx, "child_presence", presence.id, {
      child_id: presence.child_id,
      presence_date: presence.presence_date,
      status: presence.status,
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
