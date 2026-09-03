import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import {
  listRelationships,
  createRelationship,
} from "@/lib/guardians/guardian.service";
import {
  createRelationshipSchema,
  cleanGuardianInput,
} from "@/lib/guardians/guardian.validation";
import type { CreateRelationshipInput } from "@/types/guardian";

// ─── GET /api/guardians/relationships ────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "guardians.view");

    const { searchParams } = new URL(request.url);
    const childId = searchParams.get("child_id") ?? undefined;
    const guardianId = searchParams.get("guardian_id") ?? undefined;
    const isActive = searchParams.get("is_active");

    const adminSupabase = createAdminClient();
    const { data, count } = await listRelationships(adminSupabase, {
      centre_id: ctx.centre.id,
      child_id: childId,
      guardian_id: guardianId,
      is_active: isActive !== null ? isActive === "true" : undefined,
      limit: parseInt(searchParams.get("limit") ?? "50", 10),
      offset: parseInt(searchParams.get("offset") ?? "0", 10),
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

// ─── POST /api/guardians/relationships ───────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "guardians.relationship.manage");

    const body = await request.json();
    // Tenant default: callers never send centre_id — attribute the record to
    // the caller's own centre. An explicit different centre is still rejected
    // below, so cross-centre creation stays impossible.
    if (!body.centre_id) body.centre_id = ctx.centre.id;
    const cleaned = cleanGuardianInput(body);
    const parsed = createRelationshipSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    if (data.centre_id !== ctx.centre.id) {
      return NextResponse.json(
        { error: "Cannot create relationship for another centre" },
        { status: 403 },
      );
    }

    const adminSupabase = createAdminClient();
    const relationship = await createRelationship(
      adminSupabase,
      data as CreateRelationshipInput,
    );

    await auditCreate(adminSupabase, ctx, "child_guardian", relationship.id, {
      child_id: relationship.child_id,
      guardian_id: relationship.guardian_id,
      relationship_type: relationship.relationship_type,
      is_primary: relationship.is_primary,
    });

    return NextResponse.json({ data: relationship }, { status: 201 });
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
