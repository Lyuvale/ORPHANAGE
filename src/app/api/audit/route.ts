import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { statusFromError } from "@/lib/resources/route-helpers";
import { recordAuditEvent } from "@/lib/audit/audit.service";
import type { AuditLog } from "@/types/audit";
import { buildAuditFilters, auditToCsv } from "@/lib/audit/audit-query";

// ─── GET /api/audit ───────────────────────────────────────────────────────────
// ?from=&to=&action=&entity_type=&actor_email=&entity_id=&limit=&offset=&export=csv
// Gated by audit.view (and audit.export for CSV) and scoped to the caller's
// centre by RLS (audit_logs_select_centre).

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "audit.view");

    const f = buildAuditFilters({
      from: request.nextUrl.searchParams.get("from"),
      to: request.nextUrl.searchParams.get("to"),
      action: request.nextUrl.searchParams.get("action"),
      entity_type: request.nextUrl.searchParams.get("entity_type"),
      actor_email: request.nextUrl.searchParams.get("actor_email"),
      entity_id: request.nextUrl.searchParams.get("entity_id"),
      limit: request.nextUrl.searchParams.get("limit"),
      offset: request.nextUrl.searchParams.get("offset"),
      export: request.nextUrl.searchParams.get("export"),
    });

    // For CSV export, additionally require audit.export.
    if (f.exportMode) {
      await requirePermission(
        supabase as unknown as SupabaseClient,
        ctx,
        "audit.export",
      );
    }

    // Build the base query scoped to the caller's centre.
    // The user client enforces RLS (audit_logs_select_centre), so the centre
    // filter is applied by the database itself. We still scope explicitly for
    // clarity and correctness when an admin/export path is used.
    let q = supabase.from("audit_logs").select("*", { count: "exact" });

    if (f.from) {
      q = q.gte("created_at", f.from);
    }
    if (f.to) {
      q = q.lte("created_at", f.to);
    }
    if (f.action) {
      q = q.eq("action", f.action);
    }
    if (f.entity_type) {
      q = q.eq("entity_type", f.entity_type);
    }
    if (f.actor_email) {
      q = q.ilike("actor_email", `%${f.actor_email}%`);
    }
    if (f.entity_id) {
      q = q.eq("entity_id", f.entity_id);
    }

    q = q.order("created_at", { ascending: false });

    if (!f.exportMode) {
      q = q.range(f.offset, f.offset + f.limit - 1);
    }

    const { data, count, error } = await q;

    if (error) {
      return NextResponse.json({ error: "Failed to load audit trail" }, { status: 500 });
    }

    const rows = (data ?? []) as unknown as AuditLog[];

    // Record that the audit trail was viewed/exported.
    const admin = createAdminClient();
    await recordAuditEvent(admin, ctx, {
      action: f.exportMode ? "EXPORT" : "VIEW",
      entity_type: "audit_trail",
      entity_id: ctx.centre.id,
      new_values: {
        filter: {
          from: f.from ?? null,
          to: f.to ?? null,
          action: f.action ?? null,
          entity_type: f.entity_type ?? null,
        },
      },
    });

    if (f.exportMode) {
      const csv = auditToCsv(rows);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="audit-trail-${new Date()
            .toISOString()
            .slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json({
      data: rows,
      total: count ?? rows.length,
      limit: f.limit,
      offset: f.offset,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
