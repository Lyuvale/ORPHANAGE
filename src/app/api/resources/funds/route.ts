import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import {
  listFunds,
  createFund,
  getSourceById,
} from "@/lib/resources/resources.service";
import { createFundSchema, coerceCreate } from "@/lib/resources/resources.validation";
import type { CreateSupportFundInput } from "@/types/resources";
import { statusFromError } from "@/lib/resources/route-helpers";

// ─── GET /api/resources/funds ────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "resources.view");

    const sourceId = request.nextUrl.searchParams.get("source_id") || undefined;

    const adminSupabase = createAdminClient();
    const result = await listFunds(adminSupabase, ctx.centre.id, sourceId);
    return NextResponse.json({ data: result.data, count: result.count });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

// ─── POST /api/resources/funds ───────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "resources.manage");

    const body = await request.json();
    const cleaned = coerceCreate(body);
    const parsed = createFundSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    if (parsed.data.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Cannot create a fund for another centre" }, { status: 403 });
    }

    const adminSupabase = createAdminClient();
    // Verify the referenced Source belongs to this centre (tenant isolation).
    const source = await getSourceById(adminSupabase, parsed.data.source_id);
    if (!source || source.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Selected source does not exist in this centre" }, { status: 403 });
    }

    const fund = await createFund(
      adminSupabase,
      parsed.data as CreateSupportFundInput,
      ctx.authUserId,
    );

    await auditCreate(adminSupabase, ctx, "support_fund", fund.id, {
      fund_name: fund.fund_name,
      source_id: fund.source_id,
      amount_allocated: fund.amount_allocated,
    });

    return NextResponse.json({ data: fund }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
