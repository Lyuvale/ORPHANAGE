import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import {
  listGuardians,
  createGuardian,
  findDuplicateGuardians,
} from "@/lib/guardians/guardian.service";
import {
  createGuardianSchema,
  guardianSearchSchema,
  cleanGuardianInput,
} from "@/lib/guardians/guardian.validation";
import type { CreateGuardianInput } from "@/types/guardian";

// ─── GET /api/guardians ──────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "guardians.view");

    const { searchParams } = new URL(request.url);
    const parsed = guardianSearchSchema.safeParse({
      status: searchParams.get("status") ?? undefined,
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
    const { data, count } = await listGuardians(adminSupabase, {
      centre_id: ctx.centre.id,
      status: parsed.data.status,
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

// ─── POST /api/guardians ─────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "guardians.create");

    const body = await request.json();
    const cleaned = cleanGuardianInput(body);
    const parsed = createGuardianSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    if (data.centre_id !== ctx.centre.id) {
      return NextResponse.json(
        { error: "Cannot create guardian for another centre" },
        { status: 403 },
      );
    }

    const adminSupabase = createAdminClient();

    // Duplicate check
    const duplicates = await findDuplicateGuardians(
      adminSupabase,
      ctx.centre.id,
      data.first_name,
      data.last_name,
      data.phone,
      data.email,
    );

    if (duplicates.length > 0) {
      return NextResponse.json(
        {
          error: "Possible duplicate guardian found",
          duplicates: duplicates.map((d) => ({
            id: d.id,
            first_name: d.first_name,
            last_name: d.last_name,
            phone: d.phone,
            email: d.email,
            status: d.status,
          })),
        },
        { status: 409 },
      );
    }

    const guardian = await createGuardian(adminSupabase, data as CreateGuardianInput);

    await auditCreate(adminSupabase, ctx, "guardian", guardian.id, {
      first_name: guardian.first_name,
      last_name: guardian.last_name,
      status: guardian.status,
    });

    return NextResponse.json({ data: guardian }, { status: 201 });
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
