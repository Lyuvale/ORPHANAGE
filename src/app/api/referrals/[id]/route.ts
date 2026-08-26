import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditUpdate } from "@/lib/audit/audit.service";
import {
  getReferralById,
  updateReferral,
  updateReferralStatus,
} from "@/lib/referrals/referral.service";
import {
  updateReferralSchema,
  updateReferralStatusSchema,
  cleanReferralInput,
} from "@/lib/referrals/referral.validation";
import type { UpdateReferralInput } from "@/types/referral";

// ─── GET /api/referrals/[id] ─────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "referrals.view");

    const adminSupabase = createAdminClient();
    const referral = await getReferralById(adminSupabase, id);

    if (!referral) {
      return NextResponse.json({ error: "Referral not found" }, { status: 404 });
    }

    if (referral.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Referral not found" }, { status: 404 });
    }

    return NextResponse.json({ data: referral });
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

// ─── PATCH /api/referrals/[id] ───────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "referrals.update");

    const body = await request.json();

    if ("new_status" in body) {
      const requiredPerm =
        body.new_status === "admitted" || body.new_status === "under_review"
          ? "referrals.review"
          : body.new_status === "rejected"
            ? "referrals.reject"
            : "referrals.update";

      await requirePermission(supabase as unknown as SupabaseClient, ctx, requiredPerm);

      const parsed = updateReferralStatusSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten() },
          { status: 400 },
        );
      }

      const adminSupabase = createAdminClient();
      const existing = await getReferralById(adminSupabase, id);

      if (!existing) {
        return NextResponse.json({ error: "Referral not found" }, { status: 404 });
      }

      if (existing.centre_id !== ctx.centre.id) {
        return NextResponse.json({ error: "Referral not found" }, { status: 404 });
      }

      const previousStatus = existing.status;
      const updated = await updateReferralStatus(
        adminSupabase,
        id,
        ctx.centre.id,
        parsed.data,
        ctx.authUserId,
      );

      await auditUpdate(adminSupabase, ctx, "referral", existing.id, {
        status: previousStatus,
      }, {
        status: updated.status,
        reason: parsed.data.reason ?? null,
      });

      return NextResponse.json({ data: updated });
    }

    const cleaned = cleanReferralInput(body);
    const parsed = updateReferralSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const adminSupabase = createAdminClient();
    const existing = await getReferralById(adminSupabase, id);

    if (!existing) {
      return NextResponse.json({ error: "Referral not found" }, { status: 404 });
    }

    if (existing.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Referral not found" }, { status: 404 });
    }

    const updated = await updateReferral(adminSupabase, id, parsed.data as UpdateReferralInput);

    await auditUpdate(adminSupabase, ctx, "referral", existing.id,
      { child_first_name: existing.child_first_name, child_last_name: existing.child_last_name },
      { child_first_name: updated.child_first_name, child_last_name: updated.child_last_name },
    );

    return NextResponse.json({ data: updated });
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
