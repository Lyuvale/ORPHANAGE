import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import { listContactAttempts, createContactAttempt } from "@/lib/visits/visit.service";
import {
  createContactAttemptSchema,
  contactAttemptSearchSchema,
  cleanVisitInput,
} from "@/lib/visits/visit.validation";
import type { CreateContactAttemptInput } from "@/types/visit";

// ─── GET /api/visits/contact-attempts ───────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "visits.contact_attempts.view");

    const { searchParams } = new URL(request.url);
    const parsed = contactAttemptSearchSchema.safeParse({
      child_id: searchParams.get("child_id") ?? undefined,
      guardian_id: searchParams.get("guardian_id") ?? undefined,
      contact_type: searchParams.get("contact_type") ?? undefined,
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
    const { data, count } = await listContactAttempts(adminSupabase, {
      centre_id: ctx.centre.id,
      child_id: parsed.data.child_id || undefined,
      guardian_id: parsed.data.guardian_id || undefined,
      contact_type: parsed.data.contact_type,
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

// ─── POST /api/visits/contact-attempts ──────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "visits.contact_attempts.create");

    const body = await request.json();
    const cleaned = cleanVisitInput(body);
    const parsed = createContactAttemptSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    if (data.centre_id !== ctx.centre.id) {
      return NextResponse.json(
        { error: "Cannot create contact attempt for another centre" },
        { status: 403 },
      );
    }

    const adminSupabase = createAdminClient();
    const attempt = await createContactAttempt(
      adminSupabase,
      data as CreateContactAttemptInput,
    );

    await auditCreate(adminSupabase, ctx, "contact_attempt", attempt.id, {
      child_id: attempt.child_id,
      guardian_id: attempt.guardian_id,
      contact_type: attempt.contact_type,
      result: attempt.result,
    });

    return NextResponse.json({ data: attempt }, { status: 201 });
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
