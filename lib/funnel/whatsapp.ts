import {
  formatBookingWhatsAppMessage,
  type BookingWhatsAppSummaryInput,
} from "@/lib/funnel/formatBookingSummary";

// Business WhatsApp — override via NEXT_PUBLIC_WHATSAPP_NUMBER if needed.
// International digits only (no "+", spaces, or dashes).
const FALLBACK_WHATSAPP_NUMBER = "923355880333";

/** wa.me URLs break past ~2k chars; leave room for photo links. */
const MAX_WHATSAPP_MESSAGE_LENGTH = 2500;

export function getWhatsAppNumber() {
  return (
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/[^\d]/g, "") ||
    FALLBACK_WHATSAPP_NUMBER
  );
}

/** Local-style display, e.g. 0335-5880333 */
export function getWhatsAppDisplayNumber() {
  const digits = getWhatsAppNumber();
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

/** Prefill text for the assessment WhatsApp message. */
export function buildWhatsAppBookingSummaryText(
  input: BookingWhatsAppSummaryInput,
) {
  return truncateWhatsAppMessage(formatBookingWhatsAppMessage(input));
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
