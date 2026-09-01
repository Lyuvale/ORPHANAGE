import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import type { SupabaseClient } from "@supabase/supabase-js";

// ─── GET /api/platform/plans ─────────────────────────────────

export async function GET() {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "platform.view");

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("plans")
      .select("*")
      .order("price", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── POST /api/platform/plans ────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "platform.view");

    const body = (await request.json()) as {
      name?: string;
      description?: string;
      price?: number;
      billing_period?: string;
      is_active?: boolean;
    };

    if (!body.name || body.price === undefined) {
      return NextResponse.json(
        { error: "name and price are required" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("plans")
      .insert({
        name: body.name,
        description: body.description ?? null,
        price: body.price,
        billing_period: body.billing_period ?? "MONTHLY",
        is_active: body.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── PATCH /api/platform/plans ───────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "platform.view");

    const body = (await request.json()) as {
      id?: string;
      name?: string;
      description?: string;
      price?: number;
      billing_period?: string;
      is_active?: boolean;
    };

    if (!body.id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.price !== undefined) updates.price = body.price;
    if (body.billing_period !== undefined) updates.billing_period = body.billing_period;
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("plans")
      .update(updates)
      .eq("id", body.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
