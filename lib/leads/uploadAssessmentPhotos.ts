import { parseDataUrl } from "@/lib/leads/parseDataUrl";
import { createPhotoPackId } from "@/lib/leads/photoShortLink";
import { inspectUpload, type Inspection } from "@/lib/uploads/inspect";

const PHOTO_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
/** The bucket's own limit. */
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
/** The largest plan takes six. */
const MAX_PHOTOS = 6;

const DEFAULT_BUCKET = "assessment-photos";

export function getPhotosBucket() {
  return process.env.SUPABASE_PHOTOS_BUCKET?.trim() || DEFAULT_BUCKET;
}

export type PhotoScan = {
  /** Position in the submitted list. */
  index: number;
  path: string;
  declaredMime: string;
  inspection: Inspection;
  /** False when the file was refused and never reached storage. */
  stored: boolean;
};

export type UploadedAssessmentPhotos = {
  packId: string | null;
  imageUrls: string[];
  photoPaths: string[];
  /** HANDOVER-59 — one per photo, written to upload_scans once the lead exists. */
  scans: PhotoScan[];
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
    return { packId: null, imageUrls: [], photoPaths: [], scans: [] };
  }

  const packId = createPhotoPackId();
  const imageUrls: string[] = [];
  const photoPaths: string[] = [];
  const scans: PhotoScan[] = [];

  for (let index = 0; index < Math.min(photoDataUrls.length, MAX_PHOTOS); index += 1) {
    const parsed = parseDataUrl(photoDataUrls[index]);
    if (!parsed) continue;

    /*
     * HANDOVER-59 Parts 4.1 and 4.2 — the bytes decide what this is, not
     * the data URL's declared type, and the header's dimensions are checked
     * before anything decodes it. A refused photo never reaches storage.
     */
    const inspection = inspectUpload({
      bytes: parsed.bytes,
      declaredMime: parsed.contentType,
      allowed: PHOTO_MIME,
      maxBytes: MAX_PHOTO_BYTES,
    });
    const detected = inspection.detectedMime;
    const ext = detected === "image/png" ? "png" : detected === "image/webp" ? "webp" : "jpg";
    const slot = String(index + 1).padStart(2, "0");
    const path = `leads/${packId}/${slot}.${ext}`;
    if (inspection.status === "rejected") {
      console.error(`[uploadAssessmentPhotos] Refused photo ${index + 1}:`, inspection.failedChecks.join(", "));
      scans.push({ index, path, declaredMime: parsed.contentType, inspection, stored: false });
      continue;
    }
    const endpoint = `${base}/storage/v1/object/${bucket}/${path}`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          apikey: key,
          // The detected type, never the declared one.
          "Content-Type": detected ?? "image/jpeg",
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
      scans.push({ index, path, declaredMime: parsed.contentType, inspection, stored: true });
      // Never a public Storage URL (HOTFIX-43 §1): the bucket is private, and
      // the route turns these paths into auth-gated /p/ links.
      imageUrls.push(`/p/${packId}/${slot}.${ext}`);
    } catch (error) {
      console.error(`[uploadAssessmentPhotos] Error photo ${index + 1}:`, error);
    }
  }

  // Pack id names the Storage folder; session stays on the lead row.
  void sessionId;

  return { packId: photoPaths.length > 0 ? packId : null, imageUrls, photoPaths, scans };
}
