import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import {
  listHealthDocuments,
  createHealthDocumentRecord,
} from "@/lib/health/health.service";
import {
  uploadHealthDocument,
  deleteHealthDocument,
} from "@/lib/health/health-storage.service";
import { documentSearchSchema } from "@/lib/health/health.validation";
import type { CreateHealthDocumentInput } from "@/types/health";

function statusFromError(message: string): number {
  if (message.includes("NOT_AUTHENTICATED")) return 401;
  if (message.includes("PERMISSION_DENIED")) return 403;
  if (message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE")) return 403;
  if (message.includes("V_")) return 400;
  return 500;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "health.documents.view");

    const { searchParams } = new URL(request.url);
    const parsed = documentSearchSchema.safeParse({
      child_id: searchParams.get("child_id") ?? undefined,
      document_type: searchParams.get("document_type") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const { data, count } = await listHealthDocuments(adminSupabase, {
      centre_id: ctx.centre.id,
      child_id: parsed.data.child_id || undefined,
      document_type: parsed.data.document_type,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });

    return NextResponse.json({ data, count });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

// ─── POST /api/health/documents ─────────────────────────────
// Accepts multipart/form-data: file + metadata fields.
// The binary goes to private Storage; the reference goes to the DB.

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "health.documents.upload");

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const centreId = formData.get("centre_id")?.toString();
    const childId = formData.get("child_id")?.toString();
    const documentType = formData.get("document_type")?.toString();
    const description = formData.get("description")?.toString() || null;

    if (!centreId || !childId || !documentType) {
      return NextResponse.json(
        { error: "centre_id, child_id and document_type are required" },
        { status: 400 },
      );
    }

    if (centreId !== ctx.centre.id) {
      return NextResponse.json(
        { error: "Cannot upload a document for another centre" },
        { status: 403 },
      );
    }

    const adminSupabase = createAdminClient();

    // 1. Upload binary to private storage.
    let uploaded: { storage_path: string; file_type: string | null; file_size: number };
    try {
      uploaded = await uploadHealthDocument(
        adminSupabase,
        ctx.centre.id,
        childId,
        file,
        file.name,
      );
    } catch (uploadError) {
      throw new Error(uploadError instanceof Error ? uploadError.message : "Upload failed");
    }

    // 2. Persist the reference record.
    try {
      const input: CreateHealthDocumentInput = {
        centre_id: ctx.centre.id,
        child_id: childId,
        document_type: documentType as CreateHealthDocumentInput["document_type"],
        file_name: file.name,
        file_type: uploaded.file_type,
        file_size: uploaded.file_size,
        storage_path: uploaded.storage_path,
        description,
      };

      const doc = await createHealthDocumentRecord(adminSupabase, input, ctx.authUserId);

      await auditCreate(adminSupabase, ctx, "health_document", doc.id, {
        child_id: doc.child_id,
        document_type: doc.document_type,
        file_name: doc.file_name,
        file_size: doc.file_size,
      });

      return NextResponse.json({ data: doc }, { status: 201 });
    } catch (recordError) {
      // Roll back the uploaded object so we don't leak orphan files.
      await deleteHealthDocument(adminSupabase, uploaded.storage_path).catch(() => {});
      throw recordError;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
