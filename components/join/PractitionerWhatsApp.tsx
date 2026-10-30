import { ChatIcon } from "@/components/ui/ContactIcons";
import { PRACTITIONER_WHATSAPP, practitionerWhatsAppLink, PRACTITIONER_WHATSAPP_TEXT } from "@/lib/seo/site";

/**
 * WhatsApp help for applicants, on /join and the pages under it only (the hiring
 * number; clients use SITE.phone). A link they choose to press, never an
 * automatic redirect. The digits are not printed (Talha, 30 October 2026),
 * only the link; the hours carry "PKT" because applicants write from other
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
        <ChatIcon className="mr-1.5 h-3.5 w-3.5" />
        Message us on WhatsApp
      </a>
      , {PRACTITIONER_WHATSAPP.hours}.
    </p>
  );
}

/** A heading, a line and a button-sized WhatsApp link. */
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
        className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-xl border border-brand-primary px-5 font-semibold text-brand-primary hover:bg-brand-primary hover:text-white"
      >
        <ChatIcon />
        WhatsApp us
      </a>
    </div>
  );
}
