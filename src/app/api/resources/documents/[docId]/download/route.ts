import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import { getDocumentById } from "@/lib/resources/resources.service";
import { createSupportDownloadUrl } from "@/lib/resources/resources-storage.service";
import { statusFromError } from "@/lib/resources/route-helpers";

// ─── POST /api/resources/documents/[docId]/download ──────────
// Returns a short-lived signed URL for a private document so only an
// authorised caller (resources.documents.download) can fetch it.

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ docId: string }> },
) {
  void request;
  try {
    const { docId } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "resources.documents.download");

    const adminSupabase = createAdminClient();
    const doc = await getDocumentById(adminSupabase, docId, ctx.centre.id);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const signedUrl = await createSupportDownloadUrl(adminSupabase, doc.storage_path);

    await auditCreate(adminSupabase, ctx, "support_document_download", doc.id, {
      entity_type: doc.entity_type,
      entity_id: doc.entity_id,
      file_name: doc.file_name,
    });

    return NextResponse.json({ data: { signedUrl, file_name: doc.file_name } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
