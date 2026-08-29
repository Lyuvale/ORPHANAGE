import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { STAFF_DOCUMENTS_BUCKET } from "@/types/staff";

type AdminClient = SupabaseClient<any, "public", any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export { STAFF_DOCUMENTS_BUCKET };
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB, matches bucket file_size_limit

/**
 * Build a tenant-aware, staff-scoped storage path.
 * e.g. staff/{centre_id}/{staff_id}/{uuid}
 */
export function buildStaffStoragePath(
  centreId: string,
  staffId: string,
  fileName: string,
): string {
  const safeName = fileName.replace(/[^\w.\-]+/g, "_");
  const ext = safeName.includes(".")
    ? safeName.substring(safeName.lastIndexOf("."))
    : "";
  return `staff/${centreId}/${staffId}/${randomUUID()}${ext}`;
}

/**
 * Upload a file to the private staff-documents bucket.
 * Returns the storage_path to persist in staff_documents.
 */
export async function uploadStaffDocument(
  adminSupabase: AdminClient,
  centreId: string,
  staffId: string,
  file: File | Blob,
  fileName: string,
): Promise<{ storage_path: string; file_type: string | null; file_size: number }> {
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength === 0) {
    throw new Error("V_MANDATORY: File is empty");
  }
  if (buffer.byteLength > MAX_FILE_SIZE) {
    throw new Error("V_MAX_LENGTH: File exceeds the 10MB upload limit");
  }

  const storagePath = buildStaffStoragePath(centreId, staffId, fileName);
  const fileType = (file as File).type || null;

  const { error } = await adminSupabase.storage
    .from(STAFF_DOCUMENTS_BUCKET)
    .upload(storagePath, buffer, {
      contentType: fileType ?? "application/octet-stream",
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload document: ${error.message}`);
  }

  return {
    storage_path: storagePath,
    file_type: fileType,
    file_size: buffer.byteLength,
  };
}

/**
 * Create a short-lived, signed URL for a private object so only the
 * authorised caller can download it (no public bucket exposure).
 */
export async function createStaffDownloadUrl(
  adminSupabase: AdminClient,
  storagePath: string,
  expiresInSeconds = 900, // 15 minutes
): Promise<string> {
  const { data, error } = await adminSupabase.storage
    .from(STAFF_DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) {
    throw new Error(`Failed to create download URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Remove an object from private storage. Used during cleanup only.
 */
export async function deleteStaffDocument(
  adminSupabase: AdminClient,
  storagePath: string,
): Promise<void> {
  const { error } = await adminSupabase.storage
    .from(STAFF_DOCUMENTS_BUCKET)
    .remove([storagePath]);

  if (error) {
    throw new Error(`Failed to delete document: ${error.message}`);
  }
}