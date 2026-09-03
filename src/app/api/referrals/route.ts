import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import {
  listReferrals,
  createReferral,
} from "@/lib/referrals/referral.service";
import {
  createReferralSchema,
  referralSearchSchema,
  cleanReferralInput,
} from "@/lib/referrals/referral.validation";
import type { CreateReferralInput } from "@/types/referral";

// ─── GET /api/referrals ──────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "referrals.view");

    const { searchParams } = new URL(request.url);
    const parsed = referralSearchSchema.safeParse({
      status: searchParams.get("status") ?? undefined,
      source: searchParams.get("source") ?? undefined,
      priority: searchParams.get("priority") ?? undefined,
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
    const { data, count } = await listReferrals(adminSupabase, {
      centre_id: ctx.centre.id,
      status: parsed.data.status,
      source: parsed.data.source,
      priority: parsed.data.priority,
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

// ─── POST /api/referrals ─────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "referrals.create");

    const body = await request.json();
    // Tenant default: UI forms never send centre_id — attribute the record to
    // the caller's own centre. An explicit different centre is still rejected
    // below, so cross-centre creation stays impossible.
    if (!body.centre_id) body.centre_id = ctx.centre.id;
    const cleaned = cleanReferralInput(body);
    const parsed = createReferralSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    if (data.centre_id !== ctx.centre.id) {
      return NextResponse.json(
        { error: "Cannot create referral for another centre" },
        { status: 403 },
      );
    }

    const adminSupabase = createAdminClient();
    const referral = await createReferral(adminSupabase, data as CreateReferralInput);

    await auditCreate(adminSupabase, ctx, "referral", referral.id, {
      reference_number: referral.reference_number,
      child_first_name: referral.child_first_name,
      child_last_name: referral.child_last_name,
      source: referral.source,
      priority: referral.priority,
      status: referral.status,
    });

    return NextResponse.json({ data: referral }, { status: 201 });
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
