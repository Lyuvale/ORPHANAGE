import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import {
  getStaffById,
  listStaffDocuments,
  createStaffDocumentRecord,
} from "@/lib/staff/staff.service";
import {
  uploadStaffDocument,
  deleteStaffDocument,
} from "@/lib/staff/staff-storage.service";
import { STAFF_DOCUMENT_TYPES } from "@/types/staff";
import type { CreateStaffDocumentInput } from "@/types/staff";

function statusFromError(message: string): number {
  if (message.includes("NOT_AUTHENTICATED")) return 401;
  if (message.includes("PERMISSION_DENIED")) return 403;
  if (message.includes("USER_DEACTIVATED") || message.includes("CENTRE_NOT_ACTIVE")) return 403;
  if (message.includes("V_")) return 400;
  return 500;
}

// ─── GET /api/staff/[id]/documents ──────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "staff.documents.view");

    const adminSupabase = createAdminClient();
    const staff = await getStaffById(adminSupabase, id);
    if (!staff || staff.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Staff profile not found" }, { status: 404 });
    }

    const documents = await listStaffDocuments(adminSupabase, id);
    return NextResponse.json({ data: documents });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

// ─── POST /api/staff/[id]/documents ─────────────────────────
// Accepts multipart/form-data: file + document_type + description.
// The binary goes to private Storage; the reference goes to the DB.

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "staff.documents.manage");

    const adminSupabase = createAdminClient();
    const staff = await getStaffById(adminSupabase, id);
    if (!staff || staff.centre_id !== ctx.centre.id) {
      return NextResponse.json({ error: "Staff profile not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const documentType = formData.get("document_type")?.toString();
    const description = formData.get("description")?.toString() || null;

    if (!documentType) {
      return NextResponse.json({ error: "document_type is required" }, { status: 400 });
    }
    if (!(STAFF_DOCUMENT_TYPES as readonly string[]).includes(documentType)) {
      return NextResponse.json({ error: "Invalid document_type" }, { status: 400 });
    }

    // 1. Upload binary to private storage.
    let uploaded: { storage_path: string; file_type: string | null; file_size: number };
    try {
      uploaded = await uploadStaffDocument(
        adminSupabase,
        ctx.centre.id,
        id,
        file,
        file.name,
      );
    } catch (uploadError) {
      throw new Error(uploadError instanceof Error ? uploadError.message : "Upload failed");
    }

    // 2. Persist the reference record.
    try {
      const input: CreateStaffDocumentInput = {
        centre_id: ctx.centre.id,
        staff_id: id,
        document_type: documentType as CreateStaffDocumentInput["document_type"],
        file_name: file.name,
        file_type: uploaded.file_type,
        file_size: uploaded.file_size,
        storage_path: uploaded.storage_path,
        description,
      };

      const doc = await createStaffDocumentRecord(adminSupabase, input, ctx.authUserId);

      await auditCreate(adminSupabase, ctx, "staff_document", doc.id, {
        staff_id: id,
        document_type: doc.document_type,
        file_name: doc.file_name,
        file_size: doc.file_size,
      });

      return NextResponse.json({ data: doc }, { status: 201 });
    } catch (recordError) {
      await deleteStaffDocument(adminSupabase, uploaded.storage_path).catch(() => {});
      throw recordError;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}