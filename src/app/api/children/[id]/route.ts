import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditUpdate, auditDelete } from "@/lib/audit/audit.service";
import {
  getChildById,
  updateChild,
  updateChildStatus,
  getChildStatusHistory,
} from "@/lib/children/child.service";
import {
  updateChildSchema,
  updateChildStatusSchema,
  cleanChildInput,
} from "@/lib/children/child.validation";
import type { UpdateChildInput, ChildStatus } from "@/types/child";

// ─── GET /api/children/[id] ──────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "children.view");

    const adminSupabase = createAdminClient();
    const child = await getChildById(adminSupabase, id);

    if (!child) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }

    if (child.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }

    const history = await getChildStatusHistory(adminSupabase, id);

    return NextResponse.json({ data: { ...child, status_history: history } });
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

// ─── PATCH /api/children/[id] ────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "children.update");

    const body = await request.json();

    if ("new_status" in body) {
      await requirePermission(supabase as unknown as SupabaseClient, ctx, "children.status.update");

      const parsed = updateChildStatusSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten() },
          { status: 400 },
        );
      }

      const adminSupabase = createAdminClient();
      const child = await getChildById(adminSupabase, id);

      if (!child) {
        return NextResponse.json(
          { error: "Child not found" },
          { status: 404 },
        );
      }

      if (child.centre_id !== ctx.centre.id) {
        return NextResponse.json(
          { error: "Child not found" },
          { status: 404 },
        );
      }

      const previousStatus = child.status;
      const updated = await updateChildStatus(
        adminSupabase,
        id,
        ctx.centre.id,
        parsed.data,
        ctx.authUserId,
      );

      await auditUpdate(adminSupabase, ctx, "child", child.id, {
        status: previousStatus,
      }, {
        status: updated.status,
        reason: parsed.data.reason ?? null,
      });

      return NextResponse.json({ data: updated });
    }

    const cleaned = cleanChildInput(body);
    const parsed = updateChildSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const adminSupabase = createAdminClient();
    const existing = await getChildById(adminSupabase, id);

    if (!existing) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }

    if (existing.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }

    const updated = await updateChild(adminSupabase, id, parsed.data as UpdateChildInput);

    await auditUpdate(adminSupabase, ctx, "child", existing.id,
      { first_name: existing.first_name, last_name: existing.last_name },
      { first_name: updated.first_name, last_name: updated.last_name },
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

// ─── DELETE /api/children/[id] ───────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "children.archive");

    const adminSupabase = createAdminClient();
    const child = await getChildById(adminSupabase, id);

    if (!child) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }

    if (child.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }

    const updated = await updateChildStatus(
      adminSupabase,
      id,
      ctx.centre.id,
      { new_status: "deactivated" as ChildStatus, reason: "Record archived" },
      ctx.authUserId,
    );

    await auditDelete(adminSupabase, ctx, "child", child.id, {
      reference_number: child.reference_number,
      first_name: child.first_name,
      last_name: child.last_name,
      status: child.status,
    });

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
