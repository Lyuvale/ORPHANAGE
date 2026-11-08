import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import {
  createNeed,
  listNeedsWithProgress,
} from "@/lib/centre-site/centre-needs.service";
import { createCentreNeedSchema } from "@/lib/centre-site/centre-needs.validation";
import { statusFromError } from "@/lib/resources/route-helpers";
import { formatValidationDetails } from "@/lib/money";

// ─── GET /api/centre-site/needs ──────────────────────────────

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
    const needs = await listNeedsWithProgress(admin, ctx.centre.id);
    return NextResponse.json({ data: needs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

// ─── POST /api/centre-site/needs ─────────────────────────────

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
    const parsed = createCentreNeedSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: formatValidationDetails(parsed.error.flatten()),
        },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const need = await createNeed(admin, ctx.centre.id, parsed.data, ctx.authUserId);

    await auditCreate(admin, ctx, "centre_need", need.id, {
      title: need.title,
      target_amount: need.target_amount,
      status: need.status,
      is_public: need.is_public,
    });

    return NextResponse.json({ data: need }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
