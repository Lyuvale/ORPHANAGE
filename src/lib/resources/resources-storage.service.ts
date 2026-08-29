import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { SUPPORT_DOCUMENTS_BUCKET } from "@/types/resources";

type AdminClient = SupabaseClient<any, "public", any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export { SUPPORT_DOCUMENTS_BUCKET };
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB, matches bucket file_size_limit

/**
 * Build a tenant-aware, entity-scoped storage path.
 * e.g. support/{centre_id}/{entityType}/{entityId}/{uuid}
 */
export function buildSupportStoragePath(
  centreId: string,
  entityType: string,
  entityId: string,
  fileName: string,
): string {
  const safeName = fileName.replace(/[^\w.\-]+/g, "_");
  const ext = safeName.includes(".")
    ? safeName.substring(safeName.lastIndexOf("."))
    : "";
  const type = entityType.toLowerCase();
  return `support/${centreId}/${type}/${entityId}/${randomUUID()}${ext}`;
}

/**
 * Upload a file to the private support-documents bucket.
 * Returns the storage_path to persist in support_documents.
 */
export async function uploadSupportDocument(
  adminSupabase: AdminClient,
  centreId: string,
  entityType: string,
  entityId: string,
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

  const storagePath = buildSupportStoragePath(centreId, entityType, entityId, fileName);
  const fileType = (file as File).type || null;

  const { error } = await adminSupabase.storage
    .from(SUPPORT_DOCUMENTS_BUCKET)
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
export async function createSupportDownloadUrl(
  adminSupabase: AdminClient,
  storagePath: string,
  expiresInSeconds = 900, // 15 minutes
): Promise<string> {
  const { data, error } = await adminSupabase.storage
    .from(SUPPORT_DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) {
    throw new Error(`Failed to create download URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Remove an object from private storage. Used during cleanup only.
 */
export async function deleteSupportDocument(
  adminSupabase: AdminClient,
  storagePath: string,
): Promise<void> {
  const { error } = await adminSupabase.storage
    .from(SUPPORT_DOCUMENTS_BUCKET)
    .remove([storagePath]);

  if (error) {
    throw new Error(`Failed to delete document: ${error.message}`);
  }
}
