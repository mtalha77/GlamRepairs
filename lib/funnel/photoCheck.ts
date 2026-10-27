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
 *
 * HANDOVER-59 Part 8 adds two more, both warnings only:
 *   - the same photograph in two slots, by perceptual hash (dHash), which
 *     survives resaving and resizing where a checksum would not;
 *   - too little skin in frame, by chrominance only. Luminance is ignored so
 *     the test works on dark skin as well as light. The range was widened
 *     from the handover's Cr 133 because Monk Skin Tone 10 measured Cr 130.8
 *     and failed it; with Cr >= 130 and Cr - Cb >= 3 all ten Monk tones
 *     pass while neutral grey, white, black, sky and grass do not. A close
 *     up of a cheek passes: no face is needed. Validate on real photographs
 *     across tones before tightening anything.
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
  /** Share of pixels with skin chrominance. Deliberately low. */
  skinBelow: 0.08,
  /** Hamming distance of 64 at or below which two photos are "the same". */
  duplicateWithin: 8,
} as const;

export type PhotoHintCode =
  | "duplicate"
  | "screenshot"
  | "dark"
  | "not_skin"
  | "soft"
  | "bright"
  | "compressed"
  | "cast"
  | "flat";

export const PHOTO_HINTS: Record<PhotoHintCode, string> = {
  duplicate: "This looks like the same photo as another one. Could you add a different one?",
  not_skin: "We could not see much skin in this one. It should be your face, or a close-up of the area you are asking about.",
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
  /** dHash, 16 hex characters. */
  phash: string | null;
  /** Share of pixels with skin chrominance, 0 to 1. */
  skin: number | null;
  hint: PhotoHintCode | null;
  /** The client chose "Use this one" despite the hint. */
  override: boolean;
};

export const PHOTO_CHECKS_ANSWER_KEY = "onboarding.photoChecks";

const SAMPLE_WIDTH = 512;

/** One message, most important first. Null means it is fine. */
export function photoHint(r: Omit<PhotoCheck, "hint" | "override" | "phash">): PhotoHintCode | null {
  const t = PHOTO_THRESHOLDS;
  if (r.w < t.minW) return "screenshot";
  // Dark before skin: an underexposed photo of dark skin loses its colour,
  // and "a bit dark" is the true and useful message for it.
  if (r.lum < t.darkBelow) return "dark";
  if (r.skin !== null && r.skin < t.skinBelow) return "not_skin";
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

  // Skin chrominance (YCbCr, full range). Luminance plays no part.
  let skinPixels = 0;
  for (let p = 0; p < d.length; p += 4) {
    const R = d[p];
    const G = d[p + 1];
    const B = d[p + 2];
    const cb = 128 - 0.168736 * R - 0.331264 * G + 0.5 * B;
    const cr = 128 + 0.5 * R - 0.418688 * G - 0.081312 * B;
    if (cb >= 77 && cb <= 127 && cr >= 130 && cr <= 173 && cr - cb >= 3) skinPixels += 1;
  }

  const measured = {
    w: naturalW,
    h: naturalH,
    lum: round(mL),
    sharp: round(sharp),
    contrast: round(contrast),
    cast: round(Math.max(Math.abs(mR - mG), Math.abs(mG - mB), Math.abs(mR - mB))),
    bpp: round(bytes / (naturalW * naturalH), 3),
    skin: round(skinPixels / n, 3),
  };
  return { ...measured, phash: dHash(canvas), hint: photoHint(measured), override: false };
}

/** dHash: 9x8 greyscale, each pixel against its right neighbour, 64 bits. */
function dHash(source: HTMLCanvasElement): string | null {
  const c = document.createElement("canvas");
  c.width = 9;
  c.height = 8;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, 9, 8);
  const d = ctx.getImageData(0, 0, 9, 8).data;
  let hex = "";
  let nibble = 0;
  let bitsInNibble = 0;
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const a = (y * 9 + x) * 4;
      const b = a + 4;
      const left = 0.2126 * d[a] + 0.7152 * d[a + 1] + 0.0722 * d[a + 2];
      const right = 0.2126 * d[b] + 0.7152 * d[b + 1] + 0.0722 * d[b + 2];
      nibble = (nibble << 1) | (left > right ? 1 : 0);
      bitsInNibble += 1;
      if (bitsInNibble === 4) {
        hex += nibble.toString(16);
        nibble = 0;
        bitsInNibble = 0;
      }
    }
  }
  return hex;
}

export function hammingDistance(a: string, b: string): number {
  let d = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      d += x & 1;
      x >>= 1;
    }
  }
  return d;
}

/**
 * The slot whose photo this one duplicates, among the same client's own
 * photos only, or null. Compared against earlier slots, so the second copy
 * is the one flagged.
 */
export function duplicateOf(slot: number, checks: (PhotoCheck | null)[]): number | null {
  const mine = checks[slot]?.phash;
  if (!mine) return null;
  for (let i = 0; i < checks.length; i += 1) {
    const other = checks[i]?.phash;
    if (i === slot || !other) continue;
    if (i < slot && hammingDistance(mine, other) <= PHOTO_THRESHOLDS.duplicateWithin) return i;
  }
  return null;
}

/** The hint to show for a slot now, counting duplicates across slots. */
export function slotHint(slot: number, checks: (PhotoCheck | null)[] | undefined): PhotoHintCode | null {
  const check = checks?.[slot];
  if (!check || check.override) return null;
  if (duplicateOf(slot, checks ?? []) !== null) return "duplicate";
  return check.hint;
}
