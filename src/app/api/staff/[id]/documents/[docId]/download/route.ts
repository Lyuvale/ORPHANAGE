import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import { getStaffDocumentById, getStaffById } from "@/lib/staff/staff.service";
import { createStaffDownloadUrl } from "@/lib/staff/staff-storage.service";

function statusFromError(message: string): number {
  if (message.includes("NOT_AUTHENTICATED")) return 401;
  if (message.includes("PERMISSION_DENIED")) return 403;
  if (message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE")) return 403;
  return 500;
}

// ─── POST /api/staff/[id]/documents/[docId]/download ────────
// Returns a short-lived signed URL. Every download is audited.

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  try {
    const { id, docId } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "staff.documents.view");

    const adminSupabase = createAdminClient();
    const staff = await getStaffById(adminSupabase, id);
    if (!staff || staff.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Staff profile not found" }, { status: 404 });
    }

    const doc = await getStaffDocumentById(adminSupabase, docId);
    if (!doc || doc.staff_id !== id) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const signedUrl = await createStaffDownloadUrl(adminSupabase, doc.storage_path);

    await auditCreate(adminSupabase, ctx, "staff_document_download", doc.id, {
      staff_id: id,
      file_name: doc.file_name,
      storage_path: doc.storage_path,
    });

    return NextResponse.json({
      data: {
        signedUrl,
        file_name: doc.file_name,
        file_type: doc.file_type,
        file_size: doc.file_size,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}