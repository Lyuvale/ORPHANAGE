import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { listSitePages, createSitePage } from "@/lib/centre-site/centre-site.service";
import { sitePageInputSchema } from "@/lib/centre-site/centre-site.validation";
import type { SitePageInput } from "@/lib/centre-site/centre-site.validation";
import { statusFromError } from "@/lib/resources/route-helpers";
import { formatValidationDetails } from "@/lib/money";

// ─── GET /api/centre-site/pages ──────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "site.view");

    const publishedOnly = request.nextUrl.searchParams.get("published") === "true";

    const admin = createAdminClient();
    const result = await listSitePages(admin, ctx.centre.id, { publishedOnly });
    return NextResponse.json({ data: result.data, count: result.count });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

// ─── POST /api/centre-site/pages ─────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "site.pages.manage");

    const body = await request.json();
    const parsed = sitePageInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: formatValidationDetails(parsed.error.flatten()) },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const page = await createSitePage(admin, ctx.centre.id, parsed.data as SitePageInput, ctx.authUserId);
    return NextResponse.json({ data: page }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}