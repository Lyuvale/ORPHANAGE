import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { listPreferences, setPreference } from "@/lib/notifications/notifications.service";
import { setPreferenceSchema } from "@/lib/notifications/notifications.validation";
import { statusFromError } from "@/lib/resources/route-helpers";

// ─── GET /api/notifications/preferences ─────────────────────
// List the CURRENT user's notification preferences.

export async function GET() {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "notifications.view");

    const adminSupabase = createAdminClient();
    const data = await listPreferences(adminSupabase, ctx.profile.id);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

// ─── PATCH /api/notifications/preferences ────────────────────
// Enable/disable delivery of an optional event for the CURRENT user.

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "notifications.view");

    const body = await request.json();
    const parsed = setPreferenceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const data = await setPreference(
      adminSupabase,
      ctx.profile.id,
      parsed.data.event_type,
      parsed.data.enabled,
    );
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
