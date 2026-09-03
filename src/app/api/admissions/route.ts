import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import {
  listAdmissions,
  createAdmission,
} from "@/lib/admissions/admission.service";
import {
  createAdmissionSchema,
  admissionSearchSchema,
  cleanAdmissionInput,
} from "@/lib/admissions/admission.validation";
import type { CreateAdmissionInput } from "@/types/admission";

// ─── GET /api/admissions ─────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "admissions.view");

    const { searchParams } = new URL(request.url);
    const parsed = admissionSearchSchema.safeParse({
      status: searchParams.get("status") ?? undefined,
      referral_id: searchParams.get("referral_id") ?? undefined,
      search: searchParams.get("search") ?? undefined,
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
    const { data, count } = await listAdmissions(adminSupabase, {
      centre_id: ctx.centre.id,
      status: parsed.data.status,
      referral_id: parsed.data.referral_id,
      search: parsed.data.search,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });

    return NextResponse.json({ data, count });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("NOT_AUTHENTICATED")
      ? 401
      : message.includes("PERMISSION_DENIED")
        ? 403
        : message.includes("USER_DEACTIVATED") ||
            message.includes("CENTRE_NOT_ACTIVE")
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// ─── POST /api/admissions ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "admissions.create");

    const body = await request.json();
    // Tenant default: UI forms never send centre_id — attribute the record to
    // the caller's own centre. An explicit different centre is still rejected
    // below, so cross-centre creation stays impossible.
    if (!body.centre_id) body.centre_id = ctx.centre.id;
    const cleaned = cleanAdmissionInput(body);
    const parsed = createAdmissionSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    if (data.centre_id !== ctx.centre.id) {
      return NextResponse.json(
        { error: "Cannot create admission for another centre" },
        { status: 403 },
      );
    }

    const adminSupabase = createAdminClient();
    const admission = await createAdmission(adminSupabase, data as CreateAdmissionInput);

    await auditCreate(adminSupabase, ctx, "admission", admission.id, {
      reference_number: admission.reference_number,
      referral_id: admission.referral_id,
      status: admission.status,
    });

    return NextResponse.json({ data: admission }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("NOT_AUTHENTICATED")
      ? 401
      : message.includes("PERMISSION_DENIED")
        ? 403
        : message.includes("USER_DEACTIVATED") ||
            message.includes("CENTRE_NOT_ACTIVE")
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
