import { getPhotosBucket } from "@/lib/leads/uploadAssessmentPhotos";

/**
 * Short-lived signed URL for an object in a Supabase Storage bucket.
 *
 * Works whether the target bucket is currently public or private — Supabase
 * issues signed URLs either way. That's what lets the storage lockdown ship
 * in the right order: this helper (and the auth-gated /p/ route built on it)
 * goes out first, verified working against the still-public bucket, and only
 * then does `storage.buckets.public` flip to false. Flipping first would
 * blank every photo in the studio until the code caught up.
 *
 * Raw fetch against the Storage REST API, matching the style already used in
 * uploadAssessmentPhotos.ts and cleanupExpiredPhotos.ts, rather than a
 * supabase-js client — this repo's leads/storage code is consistently
 * fetch-based, and adding a second calling convention here would be its own
 * source of drift.
 */
export async function createSignedStorageUrl(
  bucket: string,
  storagePath: string,
  expiresInSeconds = 300,
): Promise<string | null> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return null;

  const res = await fetch(
    `${base}/storage/v1/object/sign/${bucket}/${storagePath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn: expiresInSeconds }),
      cache: "no-store",
    },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[createSignedStorageUrl] Sign failed:", res.status, detail);
    return null;
  }

  const { signedURL } = (await res.json()) as { signedURL?: string };
  return signedURL ? `${base}/storage/v1${signedURL}` : null;
}

/** Signed URL for an `assessment-photos` object specifically. */
export function createSignedPhotoUrl(
  storagePath: string,
  expiresInSeconds = 300,
): Promise<string | null> {
  return createSignedStorageUrl(getPhotosBucket(), storagePath, expiresInSeconds);
}
