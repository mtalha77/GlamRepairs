/**
 * HANDOVER-9 §1 — the client-facing reference, e.g. "GR-8DDFA7".
 *
 * ── Why this is derived and not a column ─────────────────────────────────
 * The handover specifies `leads.display_ref`. That column does not exist in
 * production (checked directly: the leads table has no display_ref), so
 * rather than block §1 on a schema migration this derives the same shape
 * deterministically from the session id, which is already stored on every
 * lead and is already the de-facto reference — the WhatsApp summary has
 * been sending `Ref: <first 8 of session id>` since before this change.
 *
 * Deterministic matters more than pretty here: Ayma has to be able to take
 * "GR-8DDFA7" out of a bank transfer note and find the matching lead, so
 * the studio derives the identical string from the same stored session id
 * (see the customer list and detail pages). If a real display_ref column is
 * added later it can be backfilled with exactly this formula without
 * invalidating any reference already given to a client.
 */
const PREFIX = "GR-";
const REF_LENGTH = 6;

export function leadDisplayRef(
  sessionId: string | null | undefined,
): string | null {
  if (!sessionId) return null;
  // Session ids are UUIDs, but studio-created leads use `studio_<uuid>` and
  // older local fallbacks use `sess_<ts>_<rand>` — stripping to hex first
  // keeps every one of them to the same alphabet and length.
  const hex = sessionId.replace(/[^0-9a-f]/gi, "").slice(0, REF_LENGTH);
  if (hex.length < REF_LENGTH) return null;
  return `${PREFIX}${hex.toUpperCase()}`;
}
