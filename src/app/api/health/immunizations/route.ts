import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import { listImmunizations, createImmunization } from "@/lib/health/health.service";
import { createImmunizationSchema, immunizationSearchSchema, cleanHealthInput } from "@/lib/health/health.validation";
import type { CreateImmunizationInput } from "@/types/health";

function statusFromError(message: string): number {
  if (message.includes("NOT_AUTHENTICATED")) return 401;
  if (message.includes("PERMISSION_DENIED")) return 403;
  if (message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE")) return 403;
  return 500;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "health.immunizations.view");

    const { searchParams } = new URL(request.url);
    const parsed = immunizationSearchSchema.safeParse({
      child_id: searchParams.get("child_id") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const { data, count } = await listImmunizations(adminSupabase, {
      centre_id: ctx.centre.id,
      child_id: parsed.data.child_id || undefined,
      status: parsed.data.status,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });

    return NextResponse.json({ data, count });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "health.immunizations.manage");

    const body = await request.json();
    const cleaned = cleanHealthInput(body);
    const parsed = createImmunizationSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    if (parsed.data.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Cannot create an immunization for another centre" }, { status: 403 });
    }

    const adminSupabase = createAdminClient();
    const immunization = await createImmunization(
      adminSupabase,
      parsed.data as CreateImmunizationInput,
      ctx.authUserId,
    );

    await auditCreate(adminSupabase, ctx, "health_immunization", immunization.id, {
      child_id: immunization.child_id,
      vaccine: immunization.vaccine,
      status: immunization.status,
    });

    return NextResponse.json({ data: immunization }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
