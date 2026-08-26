import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditUpdate } from "@/lib/audit/audit.service";
import {
  getGuardianById,
  updateGuardian,
  updateGuardianStatus,
  getGuardianDocuments,
} from "@/lib/guardians/guardian.service";
import {
  updateGuardianSchema,
  updateGuardianStatusSchema,
  cleanGuardianInput,
} from "@/lib/guardians/guardian.validation";
import type { UpdateGuardianInput } from "@/types/guardian";

// ─── GET /api/guardians/[id] ─────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "guardians.view");

    const adminSupabase = createAdminClient();
    const guardian = await getGuardianById(adminSupabase, id);

    if (!guardian) {
      return NextResponse.json({ error: "Guardian not found" }, { status: 404 });
    }

    if (guardian.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Guardian not found" }, { status: 404 });
    }

    // Fetch documents if user has permission
    let documents: Awaited<ReturnType<typeof getGuardianDocuments>> = [];
    const hasDocPerm = await requirePermission(
      supabase as unknown as SupabaseClient,
      ctx,
      "guardians.documents.view",
    ).then(() => true).catch(() => false);

    if (hasDocPerm) {
      documents = await getGuardianDocuments(adminSupabase, id);
    }

    return NextResponse.json({ data: { ...guardian, documents } });
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

// ─── PATCH /api/guardians/[id] ───────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "guardians.update");

    const body = await request.json();

    if ("new_status" in body) {
      await requirePermission(supabase as unknown as SupabaseClient, ctx, "guardians.deactivate");

      const parsed = updateGuardianStatusSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten() },
          { status: 400 },
        );
      }

      const adminSupabase = createAdminClient();
      const existing = await getGuardianById(adminSupabase, id);

      if (!existing) {
        return NextResponse.json({ error: "Guardian not found" }, { status: 404 });
      }

      if (existing.centre_id !== ctx.centre.id) {
        return NextResponse.json({ error: "Guardian not found" }, { status: 404 });
      }

      const previousStatus = existing.status;
      const updated = await updateGuardianStatus(
        adminSupabase,
        id,
        ctx.centre.id,
        parsed.data,
      );

      await auditUpdate(adminSupabase, ctx, "guardian", existing.id, {
        status: previousStatus,
      }, {
        status: updated.status,
        reason: parsed.data.reason ?? null,
      });

      return NextResponse.json({ data: updated });
    }

    const cleaned = cleanGuardianInput(body);
    const parsed = updateGuardianSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const adminSupabase = createAdminClient();
    const existing = await getGuardianById(adminSupabase, id);

    if (!existing) {
      return NextResponse.json({ error: "Guardian not found" }, { status: 404 });
    }

    if (existing.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Guardian not found" }, { status: 404 });
    }

    const updated = await updateGuardian(adminSupabase, id, parsed.data as UpdateGuardianInput);

    await auditUpdate(adminSupabase, ctx, "guardian", existing.id,
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
