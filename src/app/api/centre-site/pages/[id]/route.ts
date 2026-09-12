import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { getSitePageById, updateSitePage, deleteSitePage } from "@/lib/centre-site/centre-site.service";
import { sitePagePatchSchema } from "@/lib/centre-site/centre-site.validation";
import { statusFromError } from "@/lib/resources/route-helpers";
import { formatValidationDetails } from "@/lib/money";

// ─── GET /api/centre-site/pages/[id] ─────────────────────────

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "site.view");

    const admin = createAdminClient();
    const page = await getSitePageById(admin, ctx.centre.id, id);
    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }
    return NextResponse.json({ data: page });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

// ─── PATCH /api/centre-site/pages/[id] ───────────────────────

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "site.pages.manage");

    const body = await request.json();
    const parsed = sitePagePatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: formatValidationDetails(parsed.error.flatten()) },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const page = await updateSitePage(admin, ctx.centre.id, id, parsed.data, ctx.authUserId);
    return NextResponse.json({ data: page });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

// ─── DELETE /api/centre-site/pages/[id] ──────────────────────

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "site.pages.manage");

    const admin = createAdminClient();
    const existing = await getSitePageById(admin, ctx.centre.id, id);
    if (!existing) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }
    await deleteSitePage(admin, ctx.centre.id, id);
    return NextResponse.json({ data: { id } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}