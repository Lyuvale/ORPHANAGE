import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { can } from "@/lib/auth/authorization.service";
import { statusFromError } from "@/lib/resources/route-helpers";

/**
 * POST /api/centre-site/upload
 *
 * CENTRE SITE STAFF: upload an image used on the centre's website (page image,
 * logo, hero). Files are stored in the public `centre-site` Storage bucket and
 * referenced by URL from site pages/theme.
 *
 * SECURITY: requires app access + at least one site-management permission
 * (`site.pages.manage` for page images, `site.theme.manage` for logo/hero).
 * File type and size are enforced server-side; SVGs are rejected.
 */

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient, {
      allowInactiveSubscription: true,
    });

    const canPages =
      (await can(supabase as unknown as SupabaseClient, ctx, "site.pages.manage").catch(() => false)) ||
      (await can(supabase as unknown as SupabaseClient, ctx, "site.theme.manage").catch(() => false));

    if (!canPages) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const ext = ALLOWED[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: "Only JPG, PNG, WEBP or GIF images are allowed." },
        { status: 400 },
      );
    }
    if (file.size <= 0 || file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Image must be larger than 0 bytes and no larger than 2 MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const admin = createAdminClient();
    const path = `centre-site/${ctx.centre.id}/${randomUUID()}.${ext}`;
    const { error: upErr } = await admin.storage
      .from("centre-site")
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

    const { data: publicUrl } = admin.storage.from("centre-site").getPublicUrl(path);
    return NextResponse.json({ data: { url: publicUrl.publicUrl } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}