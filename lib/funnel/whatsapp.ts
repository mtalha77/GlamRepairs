import {
  formatBookingWhatsAppMessage,
  type BookingWhatsAppSummaryInput,
} from "@/lib/funnel/formatBookingSummary";
import { SITE } from "@/lib/seo/site";

// Business WhatsApp — override via NEXT_PUBLIC_WHATSAPP_NUMBER if needed.
// International digits only (no "+", spaces, or dashes). HOTFIX-8 points
// this at SITE.phone, the single business number shared with the Google
// Business Profile; there is no separate funnel number any more.
const FALLBACK_WHATSAPP_NUMBER = SITE.phone.digits;

/** wa.me URLs break past ~2k chars; leave room for photo links. */
const MAX_WHATSAPP_MESSAGE_LENGTH = 2500;

export function getWhatsAppNumber() {
  return (
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/[^\d]/g, "") ||
    FALLBACK_WHATSAPP_NUMBER
  );
}

/**
 * Local-style display, e.g. "0301 8770506".
 *
 * For the business number this returns SITE.phone.display verbatim, so the
 * site, the emails and the Google Business Profile all show the identical
 * string — NAP consistency is a string match, not a number match. The
 * derivation below only runs when NEXT_PUBLIC_WHATSAPP_NUMBER overrides it
 * with some other number, which has no canonical display form to reuse.
 */
export function getWhatsAppDisplayNumber() {
  const digits = getWhatsAppNumber();
  if (digits === SITE.phone.digits) return SITE.phone.display;
  if (digits.startsWith("92") && digits.length === 12) {
    const local = `0${digits.slice(2)}`;
    return `${local.slice(0, 4)}-${local.slice(4)}`;
  }
  return `+${digits}`;
}

export function getWhatsAppChatLink(prefilledText?: string) {
  const base = `https://wa.me/${getWhatsAppNumber()}`;
  if (!prefilledText) return base;
  return `${base}?text=${encodeURIComponent(prefilledText)}`;
}

export function truncateWhatsAppMessage(text: string) {
  if (text.length <= MAX_WHATSAPP_MESSAGE_LENGTH) return text;
  return `${text.slice(0, MAX_WHATSAPP_MESSAGE_LENGTH - 20).trimEnd()}\n…(truncated)`;
}

/**
 * Prefill text for the assessment WhatsApp message.
 *
 * HANDOVER-9 §1: when payment lines are supplied they are appended AFTER
 * truncation, not before. A long set of answers must never be what pushes
 * the bank details and the reference off the end of the message — that is
 * precisely the content the client needs to keep.
 */
export function buildWhatsAppBookingSummaryText(
  input: BookingWhatsAppSummaryInput & { paymentLines?: string | null },
) {
  const { paymentLines, ...summary } = input;
  const body = formatBookingWhatsAppMessage(summary);

  if (!paymentLines) return truncateWhatsAppMessage(body);

  const separator = "\n\n";
  const room =
    MAX_WHATSAPP_MESSAGE_LENGTH - paymentLines.length - separator.length;
  const trimmedBody =
    body.length <= room
      ? body
      : `${body.slice(0, Math.max(0, room - 20)).trimEnd()}\n…(truncated)`;

  return `${trimmedBody}${separator}${paymentLines}`;
}

/**
 * After the full booking funnel — send every selected field in one WhatsApp message.
 */
export function buildWhatsAppBookingSummaryLink(
  input: BookingWhatsAppSummaryInput,
) {
  return getWhatsAppChatLink(buildWhatsAppBookingSummaryText(input));
}

// `buildWhatsAppOrderLink` / `WhatsAppOrderDetails` used to live here — an
// unused order-summary builder that embedded a photo URL directly into a
// wa.me message ("Selfie: <url>"). It had no call sites, so it was removed
// outright during the storage-lockdown pass rather than left as a dormant
// footgun someone could wire back up later. See the storage-lockdown
// handover for why a photo link in a WhatsApp message is never acceptable.
