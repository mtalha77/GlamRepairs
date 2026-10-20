import { PRACTITIONER_WHATSAPP, practitionerWhatsAppLink, PRACTITIONER_WHATSAPP_TEXT } from "@/lib/seo/site";

/**
 * WhatsApp help for applicants, on /join and /join/apply only (the hiring
 * number; clients use SITE.phone). Plain text and a link they choose to
 * press: no logo, no emoji, never an automatic redirect. The digits are
 * shown as text because on a desktop without WhatsApp the link does
 * nothing, and the hours carry "PKT" because applicants write from other
 * time zones.
 */
type Context = keyof typeof PRACTITIONER_WHATSAPP_TEXT;

const link = "inline-flex min-h-12 items-center text-brand-primary underline underline-offset-2 hover:no-underline";

/** "Stuck? Message us on WhatsApp", small, for the foot of every step. */
export function WhatsAppHelpLine({ context = "help" }: { context?: Context }) {
  return (
    <p className="text-xs leading-relaxed text-brand-gray">
      {context === "documents" ? "Trouble with a file? " : "Stuck? "}
      <a href={practitionerWhatsAppLink(context)} target="_blank" rel="noopener noreferrer" className={link}>
        Message us on WhatsApp
      </a>{" "}
      at {PRACTITIONER_WHATSAPP.display}, {PRACTITIONER_WHATSAPP.hours}.
    </p>
  );
}

/** A heading, a line and the number as a button-sized link. */
export function WhatsAppHelpBlock({ context, heading, body }: { context: Context; heading: string; body?: string }) {
  return (
    <div className="rounded-2xl border border-brand-lavender/60 bg-white p-4 text-sm leading-relaxed text-brand-ink">
      <p className="font-semibold">{heading}</p>
      <p className="mt-1 text-brand-gray">
        {body ?? "Message us on WhatsApp."} We answer {PRACTITIONER_WHATSAPP.hours}.
      </p>
      <a
        href={practitionerWhatsAppLink(context)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex min-h-12 items-center rounded-xl border border-brand-primary px-5 font-semibold text-brand-primary hover:bg-brand-primary hover:text-white"
      >
        WhatsApp {PRACTITIONER_WHATSAPP.display}
      </a>
    </div>
  );
}
