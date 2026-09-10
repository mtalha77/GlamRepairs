import { CLIENT_NOTES_ANSWER_KEY } from "@/lib/funnel/clientNotes";

/**
 * Keep quiz answers for the lead row, but drop heavy data-URL blobs.
 * Photos live in Storage and expire separately after 30 days.
 */
export function sanitizeLeadAnswers(
  answers: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!answers) return {};

  const next: Record<string, unknown> = { ...answers };

  if (Array.isArray(next["onboarding.photos"])) {
    const count = (next["onboarding.photos"] as unknown[]).filter(
      (item) => typeof item === "string" && item.length > 0,
    ).length;
    next["onboarding.photos"] = { uploaded: true, count };
  }

  if (
    typeof next["booking.selfie"] === "string" &&
    next["booking.selfie"].startsWith("data:")
  ) {
    next["booking.selfie"] = "uploaded";
  }

  /**
   * HANDOVER-18 §2 — the client's free-text note must NOT survive in
   * `answers`.
   *
   * It travels through the funnel as an ordinary step answer, but it is
   * persisted to its own `client_notes` column, and only that column is
   * redacted for practitioners by `leads_for_practitioner`. The view strips
   * the known contact keys out of `answers` — email, phone, whatsapp,
   * full_name, contact — but not this one, so leaving a copy here would
   * hand practitioners the raw, unredacted text through the answer list
   * while the column beside it showed "[removed]".
   *
   * Deleting rather than redacting: two copies of the same sentence with
   * different redaction rules is a leak waiting to be reintroduced by
   * whoever next adds a column to that view.
   */
  delete next[CLIENT_NOTES_ANSWER_KEY];

  return next;
}
