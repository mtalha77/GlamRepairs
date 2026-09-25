import { parseDataUrl } from "@/lib/leads/parseDataUrl";
import { createPhotoPackId } from "@/lib/leads/photoShortLink";

const DEFAULT_BUCKET = "assessment-photos";

export function getPhotosBucket() {
  return process.env.SUPABASE_PHOTOS_BUCKET?.trim() || DEFAULT_BUCKET;
}

export type UploadedAssessmentPhotos = {
  packId: string | null;
  imageUrls: string[];
  photoPaths: string[];
};

/**
 * Upload assessment photo data-URLs to Supabase Storage (public bucket).
 * Paths: leads/{packId}/01.jpg — shared via short /p/{packId}/01.jpg links.
 */
export async function uploadAssessmentPhotos(
  sessionId: string,
  photoDataUrls: string[],
): Promise<UploadedAssessmentPhotos> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = getPhotosBucket();

  if (!base || !key || photoDataUrls.length === 0) {
    return { packId: null, imageUrls: [], photoPaths: [] };
  }

  const packId = createPhotoPackId();
  const imageUrls: string[] = [];
  const photoPaths: string[] = [];

  for (let index = 0; index < photoDataUrls.length; index += 1) {
    const parsed = parseDataUrl(photoDataUrls[index]);
    if (!parsed) continue;

    const ext = parsed.contentType.includes("png") ? "png" : "jpg";
    const slot = String(index + 1).padStart(2, "0");
    const path = `leads/${packId}/${slot}.${ext}`;
    const endpoint = `${base}/storage/v1/object/${bucket}/${path}`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          apikey: key,
          "Content-Type": parsed.contentType,
          "x-upsert": "true",
        },
        body: new Uint8Array(parsed.bytes),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        console.error(
          `[uploadAssessmentPhotos] Failed photo ${index + 1}:`,
          response.status,
          detail,
        );
        continue;
      }

      photoPaths.push(path);
      // Never a public Storage URL (HOTFIX-43 §1): the bucket is private, and
      // the route turns these paths into auth-gated /p/ links.
      imageUrls.push(`/p/${packId}/${slot}.${ext}`);
    } catch (error) {
      console.error(`[uploadAssessmentPhotos] Error photo ${index + 1}:`, error);
    }
  }

  // Pack id names the Storage folder; session stays on the lead row.
  void sessionId;

  return { packId: photoPaths.length > 0 ? packId : null, imageUrls, photoPaths };
}
