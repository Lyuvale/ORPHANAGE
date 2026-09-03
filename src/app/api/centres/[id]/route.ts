import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import {
  requirePermission,
  getUserRoleName,
} from "@/lib/auth/authorization.service";
import { auditUpdate } from "@/lib/audit/audit.service";
import {
  getCentreById,
  updateCentre,
  centreCodeExists,
} from "@/lib/centres/centre.service";
import {
  updateCentreSchema,
  cleanCentreInput,
} from "@/lib/centres/centre.validation";
import type { UpdateCentreInput, CentreStatus } from "@/types/centre";

function statusFromError(message: string): number {
  if (message.includes("NOT_AUTHENTICATED")) return 401;
  if (message.includes("PERMISSION_DENIED")) return 403;
  if (message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE")) return 403;
  return 500;
}

/**
 * Centre management is a platform-level operation.
 * Mutations (update / deactivate) require the CENTRE_MANAGER role so
 * ordinary staff cannot modify platform structure.
 */
async function requireCentreManager(
  supabase: SupabaseClient,
  ctx: Awaited<ReturnType<typeof requireAppAccess>>,
): Promise<void> {
  const roleName = await getUserRoleName(supabase, ctx);
  if (roleName !== "CENTRE_MANAGER") {
    throw new Error("[PERMISSION_DENIED] Centre management requires the CENTRE_MANAGER role.");
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "centres.view");

    const { id } = await params;
    const centre = await getCentreById(id);

    if (!centre) {
      return NextResponse.json({ error: "Centre not found" }, { status: 404 });
    }

    // Tenant isolation: a centre caller may only view their OWN centre.
    if (id !== ctx.centre.id) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    return NextResponse.json({ data: centre });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "centres.manage");
    await requireCentreManager(supabase as unknown as SupabaseClient, ctx);

    // Tenant isolation: a centre manager may only modify their OWN centre.
    if (id !== ctx.centre.id) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const body = await request.json();
    const cleaned = cleanCentreInput(body);

    const parsed = updateCentreSchema.safeParse(cleaned);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const existing = await getCentreById(id);
    if (!existing) {
      return NextResponse.json({ error: "Centre not found" }, { status: 404 });
    }

    const status: CentreStatus | undefined =
      parsed.data.status as CentreStatus | undefined;

    const input: UpdateCentreInput = {
      name: parsed.data.name,
      code: parsed.data.code,
      contact_email: parsed.data.contact_email || undefined,
      contact_phone: parsed.data.contact_phone || undefined,
      address_line1: parsed.data.address_line1 || undefined,
      address_line2: parsed.data.address_line2 || undefined,
      city: parsed.data.city || undefined,
      state: parsed.data.state || undefined,
      postal_code: parsed.data.postal_code || undefined,
      country: parsed.data.country,
      status,
    };

    if (input.code) {
      const codeTaken = await centreCodeExists(input.code, id);
      if (codeTaken) {
        return NextResponse.json(
          { error: "A centre with this code already exists." },
          { status: 409 },
        );
      }
    }

    const adminSupabase = createAdminClient();
    const updated = await updateCentre(id, input);

    await auditUpdate(adminSupabase, ctx, "centre", id,
      { name: existing.name, code: existing.code, status: existing.status },
      { name: updated.name, code: updated.code, status: updated.status },
    );

    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "centres.manage");
    await requireCentreManager(supabase as unknown as SupabaseClient, ctx);

    // Tenant isolation: a centre manager may only modify their OWN centre.
    if (id !== ctx.centre.id) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const existing = await getCentreById(id);
    if (!existing) {
      return NextResponse.json({ error: "Centre not found" }, { status: 404 });
    }

    const adminSupabase = createAdminClient();
    const deactivated = await updateCentre(id, { status: "deactivated" });

    await auditUpdate(adminSupabase, ctx, "centre", id,
      { status: existing.status },
      { status: "deactivated" },
    );

    return NextResponse.json({ data: deactivated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
