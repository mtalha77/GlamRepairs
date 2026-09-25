const PACK_ID_BYTES = 6;
const PACK_ID_PATTERN = /^[A-Za-z0-9_-]{8}$/;
const FILE_PATTERN = /^(\d{2})\.(jpg|png)$/;

function toBase64Url(bytes: Uint8Array) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64url");
  }
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/** Short folder id for a photo upload batch (8 chars). */
export function createPhotoPackId() {
  const bytes = new Uint8Array(PACK_ID_BYTES);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

export function isValidPhotoPackId(packId: string) {
  return PACK_ID_PATTERN.test(packId);
}

export function isValidPhotoFileName(file: string) {
  return FILE_PATTERN.test(file);
}

export function getPublicAppUrl(request?: Request) {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (request) return new URL(request.url).origin;
  return "";
}

export function storagePathFromShortParts(packId: string, file: string) {
  if (!isValidPhotoPackId(packId) || !isValidPhotoFileName(file)) return null;
  return `leads/${packId}/${file}`;
}

/** WhatsApp-friendly short link on our domain. */
export function buildShortPhotoUrl(
  appBase: string,
  packId: string,
  file: string,
) {
  const base = appBase.replace(/\/$/, "");
  return `${base}/p/${packId}/${file}`;
}

/**
 * Photo links for a lead row — always the auth-gated /p/ route.
 *
 * HOTFIX-43 §1: this used to fall back to a public Storage URL when there
 * was no app base or a path did not match the short-link shape. The bucket
 * is private now, so those links would be dead; and while it was public
 * they were the permanent, un-revocable kind. With no base the link is
 * site-relative, which the studio renders the same way. A path that cannot
 * be expressed as a short link is dropped rather than exposed.
 */
export function toShortPhotoUrls(
  appBase: string,
  packId: string,
  photoPaths: string[],
) {
  return photoPaths.flatMap((path) => {
    const file = path.split("/").pop();
    if (!file || !isValidPhotoFileName(file)) return [];
    return [buildShortPhotoUrl(appBase, packId, file)];
  });
}
