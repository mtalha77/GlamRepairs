import { NextResponse } from "next/server";

import { MEDIA_BUCKET } from "@/lib/studio/media";
import {
  ACCEPTED_UPLOAD_TYPES,
  MEDIA_ROLES,
  processImage,
  slugifyFilename,
  type MediaRole,
} from "@/lib/studio/mediaProcess";
import { getStudioMember, getStudioUser } from "@/lib/studio/member";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Upload one image to the media library — HANDOVER-45 §3.1.
 *
 * A route handler rather than a server action: server actions cap request
 * bodies at 1 MB. The browser downscales to 2400px before sending, which
 * keeps even a phone photo well under Vercel's 4.5 MB function limit; the
 * real resize, WebP conversion and size check happen here with sharp.
 *
 * Order matters: everything that can reject the upload (auth, type, alt
 * text, processing, size) runs before anything is written, and the row is
 * inserted only after the file is in Storage. If the insert then fails the
 * file is removed again, so the bucket never holds an image the library
 * cannot see.
 */

/** Hard ceiling for what the browser sends. It resizes first; this is a guard. */
const MAX_INPUT_BYTES = 4_000_000;

function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function storageCredentials() {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return base && key ? { base, key } : null;
}

export async function POST(request: Request) {
  const user = await getStudioUser();
  if (!user) return fail("Not signed in.", 401);
  const member = await getStudioMember(user.id);
  if (!member) return fail("Not a studio member.", 403);

  const form = await request.formData().catch(() => null);
  if (!form) return fail("Nothing was uploaded.");

  const file = form.get("file");
  if (!(file instanceof File)) return fail("Choose an image to upload.");
  if (!(ACCEPTED_UPLOAD_TYPES as readonly string[]).includes(file.type)) {
    return fail("Only PNG, JPEG and WebP images can be uploaded.");
  }
  if (file.size > MAX_INPUT_BYTES) {
    return fail("That file is too large to upload. Try a smaller photograph.");
  }

  // §3.1.7 — alt text is required, and the database enforces 10 characters.
  const altText = String(form.get("altText") ?? "").trim();
  if (altText.length < 10) {
    return fail("Describe the image in at least 10 characters before saving.");
  }
  const roleRaw = String(form.get("role") ?? "inline");
  const role: MediaRole = (MEDIA_ROLES as readonly string[]).includes(roleRaw)
    ? (roleRaw as MediaRole)
    : "inline";
  const clamp = (v: FormDataEntryValue | null) =>
    Math.min(1, Math.max(0, Number.isFinite(Number(v)) ? Number(v) : 0.5));
  const focal = { x: clamp(form.get("focalX")), y: clamp(form.get("focalY")) };
  const caption = String(form.get("caption") ?? "").trim() || null;
  const credit = String(form.get("credit") ?? "").trim() || null;

  const baseName =
    slugifyFilename(String(form.get("filename") ?? "")) ||
    slugifyFilename(altText) ||
    "image";

  const processed = await processImage(Buffer.from(await file.arrayBuffer()), role, focal);
  if ("error" in processed) return fail(processed.error, 422);

  const creds = storageCredentials();
  if (!creds) return fail("Storage is not configured.", 503);
  const supabase = await createServerSupabaseClient();

  // A unique, readable path: lahore-smog-skin.webp, then -2, -3 on clashes.
  const { data: taken } = await supabase
    .from("studio_media")
    .select("storage_path")
    .like("storage_path", `media/${baseName}%`);
  const used = new Set((taken ?? []).map((t) => t.storage_path));
  let filename = `${baseName}.webp`;
  for (let n = 2; used.has(`media/${filename}`); n++) filename = `${baseName}-${n}.webp`;
  const storagePath = `media/${filename}`;

  const put = await fetch(
    `${creds.base}/storage/v1/object/${MEDIA_BUCKET}/${storagePath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.key}`,
        apikey: creds.key,
        "Content-Type": "image/webp",
        // A year: every upload gets a new path, so a file never changes in place.
        "cache-control": "31536000",
        "x-upsert": "false",
      },
      body: new Uint8Array(processed.data),
    },
  );
  if (!put.ok) {
    const detail = await put.text().catch(() => "");
    console.error("[media upload] storage", put.status, detail);
    return fail("The image could not be stored. Try again.", 502);
  }

  const publicUrl = `${creds.base}/storage/v1/object/public/${MEDIA_BUCKET}/${storagePath}`;
  const { data: row, error } = await supabase
    .from("studio_media")
    .insert({
      storage_path: storagePath,
      public_url: publicUrl,
      filename,
      alt_text: altText,
      caption,
      credit,
      mime_type: "image/webp",
      width: processed.width,
      height: processed.height,
      bytes: processed.bytes,
      role,
      focal_x: focal.x,
      focal_y: focal.y,
      uploaded_by: user.id,
    })
    .select("id")
    .single();

  if (error || !row) {
    console.error("[media upload] insert", error?.message);
    // Do not leave a file the library cannot see.
    await fetch(`${creds.base}/storage/v1/object/${MEDIA_BUCKET}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${creds.key}`,
        apikey: creds.key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prefixes: [storagePath] }),
    }).catch(() => {});
    return fail(error?.message ?? "The image could not be saved.", 500);
  }

  return NextResponse.json({
    ok: true,
    id: row.id,
    publicUrl,
    filename,
    width: processed.width,
    height: processed.height,
    bytes: processed.bytes,
    quality: processed.quality,
  });
}
