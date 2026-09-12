import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { getSiteTheme, updateSiteTheme } from "@/lib/centre-site/centre-site.service";
import { siteThemeInputSchema } from "@/lib/centre-site/centre-site.validation";
import { statusFromError } from "@/lib/resources/route-helpers";
import { formatValidationDetails } from "@/lib/money";

// ─── GET /api/centre-site/theme ──────────────────────────────

export async function GET() {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "site.view");

    const admin = createAdminClient();
    const theme = await getSiteTheme(admin, ctx.centre.id);
    return NextResponse.json({ data: theme });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

// ─── PUT /api/centre-site/theme ──────────────────────────────

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "site.theme.manage");

    const body = await request.json();
    const parsed = siteThemeInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: formatValidationDetails(parsed.error.flatten()) },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const theme = await updateSiteTheme(admin, ctx.centre.id, parsed.data, ctx.authUserId);
    return NextResponse.json({ data: theme });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}