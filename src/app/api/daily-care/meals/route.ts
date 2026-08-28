import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import { listMealRecords, createMealRecord } from "@/lib/daily-care/daily-care.service";
import {
  createMealSchema,
  mealSearchSchema,
  cleanDailyCareInput,
} from "@/lib/daily-care/daily-care.validation";
import type { CreateMealInput } from "@/types/daily-care";

// ─── GET /api/daily-care/meals ──────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "daily_care.view");

    const { searchParams } = new URL(request.url);
    const parsed = mealSearchSchema.safeParse({
      child_id: searchParams.get("child_id") ?? undefined,
      meal_date: searchParams.get("meal_date") ?? undefined,
      meal_type: searchParams.get("meal_type") ?? undefined,
      date_from: searchParams.get("date_from") ?? undefined,
      date_to: searchParams.get("date_to") ?? undefined,
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
    const { data, count } = await listMealRecords(adminSupabase, {
      centre_id: ctx.centre.id,
      child_id: parsed.data.child_id || undefined,
      meal_date: parsed.data.meal_date || undefined,
      meal_type: parsed.data.meal_type,
      date_from: parsed.data.date_from || undefined,
      date_to: parsed.data.date_to || undefined,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });

    return NextResponse.json({ data, count });
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

// ─── POST /api/daily-care/meals ─────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "daily_care.meals.create");

    const body = await request.json();
    const cleaned = cleanDailyCareInput(body);
    const parsed = createMealSchema.safeParse(cleaned);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    if (data.centre_id !== ctx.centre.id) {
      return NextResponse.json(
        { error: "Cannot create meal record for another centre" },
        { status: 403 },
      );
    }

    const adminSupabase = createAdminClient();
    const meal = await createMealRecord(
      adminSupabase,
      data as CreateMealInput,
      ctx.authUserId,
    );

    await auditCreate(adminSupabase, ctx, "meal_record", meal.id, {
      child_id: meal.child_id,
      meal_date: meal.meal_date,
      meal_type: meal.meal_type,
    });

    return NextResponse.json({ data: meal }, { status: 201 });
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
