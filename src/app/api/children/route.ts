import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AuthError, requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import { notifyRole } from "@/lib/notifications/notifications.service";
import {
  listChildren,
  createChild,
} from "@/lib/children/child.service";
import {
  createChildSchema,
  childSearchSchema,
  cleanChildInput,
} from "@/lib/children/child.validation";
import type { CreateChildInput } from "@/types/child";

// ─── GET /api/children ───────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "children.view");

    const { searchParams } = new URL(request.url);
    const parsed = childSearchSchema.safeParse({
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
    const { data, count } = await listChildren(adminSupabase, {
      centre_id: ctx.centre.id,
      status: parsed.data.status,
      search: parsed.data.search,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });

    return NextResponse.json({ data, count });
  } catch (error) {
    const code = error instanceof AuthError ? error.code : undefined;
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status =
      code === "NOT_AUTHENTICATED"
        ? 401
        : code === "PERMISSION_DENIED" ||
            code === "USER_DEACTIVATED" ||
            code === "CENTRE_NOT_ACTIVE"
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// ─── POST /api/children ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "children.create");

    const body = await request.json();
    const cleaned = cleanChildInput(body);
    const parsed = createChildSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    if (data.centre_id !== ctx.centre.id) {
      return NextResponse.json(
        { error: "Cannot create child for another centre" },
        { status: 403 },
      );
    }

    const adminSupabase = createAdminClient();

    if (new Date(data.admission_date) < new Date(data.date_of_birth)) {
      return NextResponse.json(
        { error: "Admission date cannot be before date of birth" },
        { status: 400 },
      );
    }

    const child = await createChild(adminSupabase, data as CreateChildInput);

    await auditCreate(adminSupabase, ctx, "child", child.id, {
      reference_number: child.reference_number,
      first_name: child.first_name,
      last_name: child.last_name,
      date_of_birth: child.date_of_birth,
      gender: child.gender,
      status: child.status,
    });

    await notifyRole(adminSupabase, ctx.centre.id, ["CENTRE_MANAGER", "RECORDS_OFFICER"], {
      title: "New child admitted",
      message: `${child.first_name} ${child.last_name} was admitted to the centre.`,
      type: "INFORMATION",
      event_type: "CHILD_ADMITTED",
      entity_type: "CHILD",
      entity_id: child.id,
      route: `/children/${child.id}`,
    }, ctx.authUserId);

    return NextResponse.json({ data: child }, { status: 201 });
  } catch (error) {
    const code = error instanceof AuthError ? error.code : undefined;
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status =
      code === "NOT_AUTHENTICATED"
        ? 401
        : code === "PERMISSION_DENIED" ||
            code === "USER_DEACTIVATED" ||
            code === "CENTRE_NOT_ACTIVE"
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
