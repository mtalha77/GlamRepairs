/**
 * Browser-side photograph check. HANDOVER-58 Parts 1.3 and 13, tuned to
 * Talha's "easy version" prototype of 23 October 2026.
 *
 *   - Deliberately loose. It only speaks up when a photograph is genuinely
 *     unusable: a screenshot, one taken in the dark, one properly out of
 *     focus. Slightly dim or slightly soft passes, because the practitioner
 *     can still read it.
 *   - One message, never a list. If several checks trip, the client hears
 *     about the most important one only.
 *   - Never blocks. The hint is advice; the client can always use the photo,
 *     and the override is recorded so a failed assessment can be traced back
 *     to photo quality if that was the cause.
 *
 * Runs on a 512px-wide copy so the sharpness threshold means the same thing
 * for a 12MP phone photo and a small upload, and so it stays fast. Nothing
 * leaves the browser here: photographs upload only after consent.
 *
 * Beauty filters are not detected on purpose (unreliable, and a false
 * positive is insulting). The upload step asks for them to be turned off.
 */

/** Tune against Ayma's real rejects. */
export const PHOTO_THRESHOLDS = {
  /** Below this width it is a screenshot or a heavily resized copy. */
  minW: 700,
  /** Mean luminance, 0 to 255. */
  darkBelow: 38,
  brightAbove: 232,
  /** Variance of the Laplacian on the 512px copy. */
  sharpBelow: 28,
  /** Standard deviation of luminance. */
  flatBelow: 12,
  /** Largest difference between mean R, G and B. */
  castAbove: 58,
  /** File bytes per original pixel. */
  bppBelow: 0.035,
} as const;

export type PhotoHintCode = "screenshot" | "dark" | "soft" | "bright" | "compressed" | "cast" | "flat";

export const PHOTO_HINTS: Record<PhotoHintCode, string> = {
  screenshot: "This looks like a screenshot. Could you send the original photo?",
  dark: "A bit dark. Try again facing a window if you can.",
  soft: "Slightly out of focus. Tap the screen on your face, then take it again.",
  bright: "Very bright. Move out of direct sun if you can.",
  compressed: "This has been compressed, probably by a chat app. The original would be clearer.",
  cast: "The lighting has a strong colour to it. Daylight would read better.",
  flat: "Quite flat lighting. Near a window would help.",
};

/** What is stored per photograph. The client never sees the numbers. */
export type PhotoCheck = {
  w: number;
  h: number;
  lum: number;
  sharp: number;
  contrast: number;
  cast: number;
  bpp: number;
  hint: PhotoHintCode | null;
  /** The client chose "Use this one" despite the hint. */
  override: boolean;
};

export const PHOTO_CHECKS_ANSWER_KEY = "onboarding.photoChecks";

const SAMPLE_WIDTH = 512;

/** One message, most important first. Null means it is fine. */
export function photoHint(r: Omit<PhotoCheck, "hint" | "override">): PhotoHintCode | null {
  const t = PHOTO_THRESHOLDS;
  if (r.w < t.minW) return "screenshot";
  if (r.lum < t.darkBelow) return "dark";
  if (r.sharp < t.sharpBelow) return "soft";
  if (r.lum > t.brightAbove) return "bright";
  if (r.bpp < t.bppBelow) return "compressed";
  if (r.cast > t.castAbove) return "cast";
  if (r.contrast < t.flatBelow) return "flat";
  return null;
}

const round = (n: number, places = 0) => {
  const f = 10 ** places;
  return Math.round(n * f) / f;
};

/** Measure an already decoded image. Returns null if no canvas is available. */
export function measurePhoto(image: HTMLImageElement, bytes: number): PhotoCheck | null {
  const naturalW = image.naturalWidth;
  const naturalH = image.naturalHeight;
  if (!naturalW || !naturalH) return null;

  const W = Math.min(SAMPLE_WIDTH, naturalW);
  const H = Math.max(1, Math.round(naturalH * (W / naturalW)));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0, W, H);
  const d = ctx.getImageData(0, 0, W, H).data;
  const n = W * H;

  const lum = new Float32Array(n);
  let sR = 0;
  let sG = 0;
  let sB = 0;
  let sL = 0;
  for (let i = 0, p = 0; i < n; i += 1, p += 4) {
    const R = d[p];
    const G = d[p + 1];
    const B = d[p + 2];
    sR += R;
    sG += G;
    sB += B;
    const L = 0.2126 * R + 0.7152 * G + 0.0722 * B;
    lum[i] = L;
    sL += L;
  }
  const mR = sR / n;
  const mG = sG / n;
  const mB = sB / n;
  const mL = sL / n;

  let v = 0;
  for (let i = 0; i < n; i += 1) {
    const t = lum[i] - mL;
    v += t * t;
  }
  const contrast = Math.sqrt(v / n);

  // Variance of the Laplacian, kernel [0,1,0; 1,-4,1; 0,1,0].
  let s = 0;
  let s2 = 0;
  let k = 0;
  for (let y = 1; y < H - 1; y += 1) {
    for (let x = 1; x < W - 1; x += 1) {
      const i = y * W + x;
      const L = lum[i - W] + lum[i + W] + lum[i - 1] + lum[i + 1] - 4 * lum[i];
      s += L;
      s2 += L * L;
      k += 1;
    }
  }
  const sharp = k > 0 ? s2 / k - (s / k) ** 2 : 0;

  const measured = {
    w: naturalW,
    h: naturalH,
    lum: round(mL),
    sharp: round(sharp),
    contrast: round(contrast),
    cast: round(Math.max(Math.abs(mR - mG), Math.abs(mG - mB), Math.abs(mR - mB))),
    bpp: round(bytes / (naturalW * naturalH), 3),
  };
  return { ...measured, hint: photoHint(measured), override: false };
}
