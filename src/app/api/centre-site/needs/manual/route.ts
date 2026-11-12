import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import { createManualContribution } from "@/lib/centre-site/centre-needs.service";
import { manualContributionSchema } from "@/lib/centre-site/centre-needs.validation";
import { statusFromError } from "@/lib/resources/route-helpers";

// ─── POST /api/centre-site/needs/manual ──────────────────────
// Manager logs a contribution received offline (cash / bank / M-Pesa).
// Created as VERIFIED immediately because a trusted staff member recorded it.

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(
      supabase as unknown as SupabaseClient,
      ctx,
      "site.needs.manage",
    );

    const body = await request.json();
    const parsed = manualContributionSchema.safeParse(body);
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
    const contribution = await createManualContribution(
      admin,
      ctx.centre.id,
      {
        needId: parsed.data.needId,
        amount: parsed.data.amount,
        transactionReference: parsed.data.transaction_reference,
        contributorName: parsed.data.contributor_name,
        note: parsed.data.note,
      },
      ctx.authUserId,
    );

    await auditCreate(admin, ctx, "centre_need_contribution", contribution.id, {
      need_id: contribution.need_id,
      amount: contribution.amount,
      source: contribution.source,
      status: contribution.status,
      transaction_reference: contribution.transaction_reference,
      contributor_name: contribution.contributor_name,
    });

    return NextResponse.json({ data: contribution }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Need not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
