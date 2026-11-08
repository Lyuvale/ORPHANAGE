import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditDelete, auditUpdate } from "@/lib/audit/audit.service";
import {
  deleteNeed,
  getNeed,
  getNeedProgress,
  updateNeed,
} from "@/lib/centre-site/centre-needs.service";
import { updateCentreNeedSchema } from "@/lib/centre-site/centre-needs.validation";
import { statusFromError } from "@/lib/resources/route-helpers";
import { formatValidationDetails } from "@/lib/money";

// ─── GET /api/centre-site/needs/[id] ─────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(
      supabase as unknown as SupabaseClient,
      ctx,
      "site.needs.view",
    );

    const admin = createAdminClient();
    const need = await getNeed(admin, ctx.centre.id, id);
    if (!need) {
      return NextResponse.json({ error: "Need not found" }, { status: 404 });
    }

    const progress = await getNeedProgress(admin, ctx.centre.id, id);
    return NextResponse.json({ data: { need, progress } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

// ─── PATCH /api/centre-site/needs/[id] ───────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(
      supabase as unknown as SupabaseClient,
      ctx,
      "site.needs.manage",
    );

    const body = await request.json();
    const parsed = updateCentreNeedSchema.safeParse(body);

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
    const existing = await getNeed(admin, ctx.centre.id, id);
    if (!existing) {
      return NextResponse.json({ error: "Need not found" }, { status: 404 });
    }

    const need = await updateNeed(
      admin,
      ctx.centre.id,
      id,
      parsed.data,
      ctx.authUserId,
    );
    if (!need) {
      return NextResponse.json({ error: "Need not found" }, { status: 404 });
    }

    await auditUpdate(
      admin,
      ctx,
      "centre_need",
      need.id,
      {
        title: existing.title,
        description: existing.description,
        image_url: existing.image_url,
        target_amount: existing.target_amount,
        status: existing.status,
        is_public: existing.is_public,
        sort_order: existing.sort_order,
      },
      {
        title: need.title,
        description: need.description,
        image_url: need.image_url,
        target_amount: need.target_amount,
        status: need.status,
        is_public: need.is_public,
        sort_order: need.sort_order,
      },
    );

    return NextResponse.json({ data: need });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

// ─── DELETE /api/centre-site/needs/[id] ──────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(
      supabase as unknown as SupabaseClient,
      ctx,
      "site.needs.manage",
    );

    const admin = createAdminClient();
    const existing = await getNeed(admin, ctx.centre.id, id);
    if (!existing) {
      return NextResponse.json({ error: "Need not found" }, { status: 404 });
    }

    await deleteNeed(admin, ctx.centre.id, id);

    await auditDelete(admin, ctx, "centre_need", existing.id, {
      title: existing.title,
      target_amount: existing.target_amount,
      status: existing.status,
      is_public: existing.is_public,
    });

    return NextResponse.json({ data: { id } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
