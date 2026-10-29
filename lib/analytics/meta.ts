/**
 * Meta conversion events (Handover 64 Part 6.4), from the browser.
 *
 * Each event goes two ways with one shared event id: to the Pixel, and to
 * /api/meta/event, which forwards it to the Conversions API from the
 * server. Meta deduplicates on the id, so blocked pixels still count and
 * nothing counts twice. Every call is a no-op until the Pixel id is set.
 *
 * The funnel events, in order: StartAssessment, Lead (email captured),
 * PhotosUploaded, PlanSelected, InitiateCheckout (payment screen). The
 * Purchase is sent by the server when a payment is marked verified.
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export type MetaEvent = "StartAssessment" | "Lead" | "PhotosUploaded" | "PlanSelected" | "InitiateCheckout";

const STANDARD = new Set(["Lead", "InitiateCheckout"]);
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

/** Not the studio, not the test portal, not a test portal session. */
export function isMetaTrackingAllowed(pathname: string): boolean {
  if (pathname === "/studio" || pathname.startsWith("/studio/")) return false;
  if (pathname === "/test" || pathname.startsWith("/test/")) return false;
  if (typeof document !== "undefined" && document.cookie.includes("gr_test_ui=1")) return false;
  return true;
}

const sent = new Set<string>();

/**
 * Fire once per browser session per key (default: the event name), so a
 * client going back and forth through the funnel is one lead, not five.
 */
export function trackMeta(event: MetaEvent, data: { email?: string; phone?: string; value?: number; currency?: string } = {}, onceKey: string = event) {
  if (!PIXEL_ID || typeof window === "undefined") return;
  if (!isMetaTrackingAllowed(window.location.pathname)) return;
  try {
    if (sent.has(onceKey) || sessionStorage.getItem(`meta:${onceKey}`)) return;
    sent.add(onceKey);
    sessionStorage.setItem(`meta:${onceKey}`, "1");
  } catch {
    if (sent.has(onceKey)) return;
    sent.add(onceKey);
  }

  const eventId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const custom = data.value != null ? { value: data.value, currency: data.currency } : {};
  window.fbq?.(STANDARD.has(event) ? "track" : "trackCustom", event, custom, { eventID: eventId });

  void fetch("/api/meta/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({ event, eventId, url: window.location.href, ...data }),
  }).catch(() => {});
}
