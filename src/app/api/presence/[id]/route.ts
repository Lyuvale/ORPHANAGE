import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { getPresenceById, updatePresenceRecord } from "@/lib/daily-care/presence.service";
import {
  updatePresenceSchema,
  cleanDailyCareInput,
} from "@/lib/daily-care/daily-care.validation";

// ─── GET /api/presence/[id] ─────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "presence.view");

    const adminSupabase = createAdminClient();
    const presence = await getPresenceById(adminSupabase, id);

    if (!presence) {
      return NextResponse.json({ error: "Presence record not found" }, { status: 404 });
    }

    if (presence.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Presence record not found" }, { status: 404 });
    }

    return NextResponse.json({ data: presence });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("NOT_AUTHENTICATED")
      ? 401
      : message.includes("PERMISSION_DENIED")
        ? 403
        : message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE")
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// ─── PATCH /api/presence/[id] ───────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "presence.update");

    const adminSupabase = createAdminClient();
    const existing = await getPresenceById(adminSupabase, id);

    if (!existing) {
      return NextResponse.json({ error: "Presence record not found" }, { status: 404 });
    }

    if (existing.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Presence record not found" }, { status: 404 });
    }

    const body = await request.json();
    const cleaned = cleanDailyCareInput(body);
    const parsed = updatePresenceSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updated = await updatePresenceRecord(adminSupabase, id, parsed.data);

    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("NOT_AUTHENTICATED")
      ? 401
      : message.includes("PERMISSION_DENIED")
        ? 403
        : message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE")
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
