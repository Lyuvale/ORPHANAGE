import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import { listDocuments, createDocumentRecord } from "@/lib/resources/resources.service";
import { uploadSupportDocument, deleteSupportDocument } from "@/lib/resources/resources-storage.service";
import { SUPPORT_DOCUMENT_ENTITIES } from "@/types/resources";
import type { CreateSupportDocumentInput } from "@/types/resources";
import { statusFromError } from "@/lib/resources/route-helpers";

// Validates the caller's entity is in the current centre (tenant isolation).
async function verifyEntity(
  adminSupabase: ReturnType<typeof createAdminClient>,
  entityType: string,
  entityId: string,
  centreId: string,
): Promise<{ ok: boolean; message?: string }> {
  const tableMap: Record<string, string> = {
    SOURCE: "support_sources",
    EXPENSE: "support_expenses",
    BENEFIT: "support_benefits",
  };
  const table = tableMap[entityType];
  if (!table) return { ok: false, message: "Invalid entity type" };

  const { data, error } = await adminSupabase
    .from(table)
    .select("id, centre_id")
    .eq("id", entityId)
    .single();
  if (error || !data) return { ok: false, message: "Entity not found" };
  if (data.centre_id !== centreId) return { ok: false, message: "Entity does not belong to this centre" };
  return { ok: true };
}

// ─── GET /api/resources/[entityType]/[entityId]/documents ────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entityType: string; entityId: string }> },
) {
  try {
    const { entityType, entityId } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "resources.documents.view");

    if (!(SUPPORT_DOCUMENT_ENTITIES as readonly string[]).includes(entityType)) {
      return NextResponse.json({ error: "Invalid entity type" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const check = await verifyEntity(adminSupabase, entityType, entityId, ctx.centre.id);
    if (!check.ok) {
      return NextResponse.json({ error: check.message }, { status: 404 });
    }

    const documents = await listDocuments(adminSupabase, entityType, entityId, ctx.centre.id);
    return NextResponse.json({ data: documents });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

// ─── POST /api/resources/[entityType]/[entityId]/documents ───
// Accepts multipart/form-data: file + description.
// The binary goes to private Storage; the reference goes to the DB.

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entityType: string; entityId: string }> },
) {
  try {
    const { entityType, entityId } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "resources.documents.upload");

    if (!(SUPPORT_DOCUMENT_ENTITIES as readonly string[]).includes(entityType)) {
      return NextResponse.json({ error: "Invalid entity type" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const check = await verifyEntity(adminSupabase, entityType, entityId, ctx.centre.id);
    if (!check.ok) {
      return NextResponse.json({ error: check.message }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const description = formData.get("description")?.toString() || null;

    // 1. Upload binary to private storage.
    let uploaded: { storage_path: string; file_type: string | null; file_size: number };
    try {
      uploaded = await uploadSupportDocument(
        adminSupabase,
        ctx.centre.id,
        entityType,
        entityId,
        file,
        file.name,
      );
    } catch (uploadError) {
      throw new Error(uploadError instanceof Error ? uploadError.message : "Upload failed");
    }

    // 2. Persist the reference record; roll back the upload if the DB fails.
    try {
      const input: CreateSupportDocumentInput = {
        centre_id: ctx.centre.id,
        entity_type: entityType as CreateSupportDocumentInput["entity_type"],
        entity_id: entityId,
        file_name: file.name,
        file_type: uploaded.file_type,
        file_size: uploaded.file_size,
        storage_path: uploaded.storage_path,
        description,
      };

      const doc = await createDocumentRecord(adminSupabase, input, ctx.authUserId);

      await auditCreate(adminSupabase, ctx, "support_document", doc.id, {
        entity_type: doc.entity_type,
        entity_id: doc.entity_id,
        file_name: doc.file_name,
        file_size: doc.file_size,
      });

      return NextResponse.json({ data: doc }, { status: 201 });
    } catch (recordError) {
      await deleteSupportDocument(adminSupabase, uploaded.storage_path).catch(() => {});
      throw recordError;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
