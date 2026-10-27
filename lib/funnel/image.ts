import { measurePhoto, type PhotoCheck } from "@/lib/funnel/photoCheck";

async function loadImage(objectUrl: string): Promise<HTMLImageElement> {
  const img = new window.Image();
  img.src = objectUrl;
  // decode() decodes off the main thread where the browser supports it, so
  // a 12MP phone photo does not stall the page.
  if (typeof img.decode === "function") {
    await img.decode();
    return img;
  }
  return new Promise<HTMLImageElement>((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = reject;
  });
}

function compress(image: HTMLImageElement, maxSize: number, quality: number): string | null {
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

// Compress an uploaded image into a small JPEG data URL so it can be persisted
// in the funnel store (localStorage) and reused on later steps / the report.
export async function fileToCompressedDataUrl(
  file: File,
  maxSize = 640,
  quality = 0.72,
): Promise<string> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    return compress(image, maxSize, quality) ?? objectUrl;
  } catch {
    return objectUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * The compressed copy plus the quality check, from one decode of the
 * original. The check reads the original file (its real resolution and
 * size), not the compressed copy, or every photo would look like a
 * screenshot.
 */
export async function processPhoto(
  file: File,
  maxSize = 640,
  quality = 0.72,
): Promise<{ dataUrl: string; check: PhotoCheck | null }> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    let check: PhotoCheck | null = null;
    try {
      check = measurePhoto(image, file.size);
    } catch {
      // A failed check must never cost the client their photo.
    }
    const dataUrl = compress(image, maxSize, quality);
    if (!dataUrl) throw new Error("no canvas");
    return { dataUrl, check };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
