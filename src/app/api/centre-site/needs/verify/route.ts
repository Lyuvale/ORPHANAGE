import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditUpdate } from "@/lib/audit/audit.service";
import {
  getContribution,
  listContributionsByStatus,
  rejectContribution,
  verifyContribution,
} from "@/lib/centre-site/centre-needs.service";
import { verifyContributionSchema } from "@/lib/centre-site/centre-needs.validation";
import { statusFromError } from "@/lib/resources/route-helpers";

// ─── GET /api/centre-site/needs/verify ───────────────────────
// Pending contribution queue for the accountant / centre manager.

export async function GET() {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(
      supabase as unknown as SupabaseClient,
      ctx,
      "site.needs.view",
    );

    const admin = createAdminClient();
    const pending = await listContributionsByStatus(
      admin,
      ctx.centre.id,
      "pending",
    );
    return NextResponse.json({ data: pending });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

// ─── PATCH /api/centre-site/needs/verify ─────────────────────
// Verify or reject ONE pending contribution.

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(
      supabase as unknown as SupabaseClient,
      ctx,
      "site.needs.verify",
    );

    const body = await request.json();
    const parsed = verifyContributionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.issues.map((issue) => issue.message).join("; "),
        },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const existing = await getContribution(
      admin,
      ctx.centre.id,
      parsed.data.contributionId,
    );
    if (!existing) {
      return NextResponse.json(
        { error: "Contribution not found" },
        { status: 404 },
      );
    }
    if (existing.status !== "pending") {
      return NextResponse.json(
        { error: "Contribution has already been reviewed" },
        { status: 409 },
      );
    }

    const updated =
      parsed.data.action === "verify"
        ? await verifyContribution(
            admin,
            ctx.centre.id,
            existing.id,
            ctx.authUserId,
          )
        : await rejectContribution(
            admin,
            ctx.centre.id,
            existing.id,
            ctx.authUserId,
            parsed.data.note ?? null,
          );

    if (!updated) {
      return NextResponse.json(
        { error: "Contribution has already been reviewed" },
        { status: 409 },
      );
    }

    await auditUpdate(
      admin,
      ctx,
      "centre_need_contribution",
      updated.id,
      { status: existing.status },
      { status: updated.status },
      { action: parsed.data.action },
    );

    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
