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
import { auditCreate } from "@/lib/audit/audit.service";
import {
  getCentreById,
  createCentre,
  centreCodeExists,
} from "@/lib/centres/centre.service";
import {
  createCentreSchema,
  cleanCentreInput,
} from "@/lib/centres/centre.validation";
import type { CreateCentreInput } from "@/types/centre";

function statusFromError(message: string): number {
  if (message.includes("NOT_AUTHENTICATED")) return 401;
  if (message.includes("PERMISSION_DENIED")) return 403;
  if (message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE")) return 403;
  return 500;
}

/**
 * Centre management is a platform-level operation.
 * All handlers require an authenticated, active user of an active centre.
 * Mutations (create / update / deactivate) additionally require the
 * CENTRE_MANAGER role so ordinary staff cannot modify platform structure.
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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);

    // Tenant isolation: a centre caller may only ever see their OWN centre.
    // Cross-centre listing is a platform operation (/api/platform/centres).
    // Query params are accepted but ignored beyond scoping for compatibility.
    void request;
    const own = await getCentreById(ctx.centre.id);
    return NextResponse.json({ data: own ? [own] : [], count: own ? 1 : 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "centres.manage");
    await requireCentreManager(supabase as unknown as SupabaseClient, ctx);

    const body = await request.json();
    const cleaned = cleanCentreInput(body);

    const parsed = createCentreSchema.safeParse(cleaned);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const input: CreateCentreInput = {
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
      status: parsed.data.status,
    };

    const codeTaken = await centreCodeExists(input.code);
    if (codeTaken) {
      return NextResponse.json(
        { error: "A centre with this code already exists." },
        { status: 409 },
      );
    }

    const adminSupabase = createAdminClient();
    const centre = await createCentre(input);

    await auditCreate(adminSupabase, ctx, "centre", centre.id, {
      name: centre.name,
      code: centre.code,
      status: centre.status,
      country: centre.country,
    });

    return NextResponse.json({ data: centre }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
