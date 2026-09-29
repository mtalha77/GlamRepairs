/**
 * The page_seo rules, mirrored from the database CHECK constraints so the
 * studio can show them live and disable Save before Postgres ever has to
 * refuse — HANDOVER-45 §3.4. The database remains the enforcement; this is
 * the courtesy that stops an editor meeting a raw constraint error.
 */

export const TITLE_MIN = 35;
export const TITLE_MAX = 45;
export const DESC_MIN = 140;
export const DESC_MAX = 160;
const EM_DASH = "—";

/** Organisation types the studio offers. The DB also blocks the medical ones. */
export const ORGANIZATION_TYPES = [
  "HealthAndBeautyBusiness",
  "BeautySalon",
  "ProfessionalService",
  "LocalBusiness",
  "Organization",
] as const;

export const BLOCKED_ORGANIZATION_TYPES = ["MedicalBusiness", "Physician", "MedicalClinic"];

export type FieldCheck = { ok: boolean; message: string | null };

export function checkTitle(title: string): FieldCheck {
  const n = title.length;
  if (title.includes(EM_DASH)) return { ok: false, message: "No em dashes in titles." };
  if (n < TITLE_MIN) return { ok: false, message: `${TITLE_MIN - n} more characters needed.` };
  if (n > TITLE_MAX) return { ok: false, message: `${n - TITLE_MAX} characters too long.` };
  return { ok: true, message: null };
}

export function checkDescription(desc: string): FieldCheck {
  const n = desc.length;
  if (desc.includes(EM_DASH)) return { ok: false, message: "No em dashes in descriptions." };
  if (n < DESC_MIN) return { ok: false, message: `${DESC_MIN - n} more characters needed.` };
  if (n > DESC_MAX) return { ok: false, message: `${n - DESC_MAX} characters too long.` };
  return { ok: true, message: null };
}

export function checkCanonical(value: string): FieldCheck {
  const v = value.trim();
  if (!v) return { ok: true, message: null };
  if (/^\/([a-z0-9-]+(\/[a-z0-9-]+)*)?$/.test(v)) return { ok: true, message: null };
  if (/^https:\/\/(www\.)?glamrepairs\.com(\/[a-z0-9-/]*)?$/.test(v)) return { ok: true, message: null };
  return { ok: false, message: "Use a path like /pricing, or a glamrepairs.com URL." };
}

export function checkSameAs(urls: string[]): FieldCheck {
  const bad = urls.find((u) => !/^https:\/\/[^\s]+$/.test(u));
  return bad
    ? { ok: false, message: `Not a full https:// link: ${bad}` }
    : { ok: true, message: null };
}
