import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import {
  listDailyCareRecords,
  createDailyCareRecord,
} from "@/lib/daily-care/daily-care.service";
import {
  createDailyCareSchema,
  dailyCareSearchSchema,
  cleanDailyCareInput,
} from "@/lib/daily-care/daily-care.validation";
import type { CreateDailyCareInput } from "@/types/daily-care";

// ─── GET /api/daily-care ────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "daily_care.view");

    const { searchParams } = new URL(request.url);
    const parsed = dailyCareSearchSchema.safeParse({
      child_id: searchParams.get("child_id") ?? undefined,
      care_date: searchParams.get("care_date") ?? undefined,
      activity_type: searchParams.get("activity_type") ?? undefined,
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
    const { data, count } = await listDailyCareRecords(adminSupabase, {
      centre_id: ctx.centre.id,
      child_id: parsed.data.child_id || undefined,
      care_date: parsed.data.care_date || undefined,
      activity_type: parsed.data.activity_type,
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

// ─── POST /api/daily-care ───────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "daily_care.create");

    const body = await request.json();
    const cleaned = cleanDailyCareInput(body);
    const parsed = createDailyCareSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    if (data.centre_id !== ctx.centre.id) {
      return NextResponse.json(
        { error: "Cannot create daily care record for another centre" },
        { status: 403 },
      );
    }

    const adminSupabase = createAdminClient();
    const record = await createDailyCareRecord(
      adminSupabase,
      data as CreateDailyCareInput,
      ctx.authUserId,
    );

    await auditCreate(adminSupabase, ctx, "daily_care_record", record.id, {
      child_id: record.child_id,
      care_date: record.care_date,
      activity_type: record.activity_type,
    });

    return NextResponse.json({ data: record }, { status: 201 });
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
