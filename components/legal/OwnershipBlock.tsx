import { BUSINESS, SITE } from "@/lib/seo/site";

/**
 * Handover 75 Part 2: the ownership sentence and the registered address, as
 * their own block rather than inside a paragraph, because Safepay's
 * reviewers match the sentence literally. Rendered on /terms (directly
 * under the date), /refunds and /contact, always from BUSINESS.
 */
export default function OwnershipBlock({ className = "" }: { className?: string }) {
  return (
    <section
      aria-label="Business owner and address"
      className={`rounded-xl border border-brand-primary/15 px-5 py-4 text-sm leading-relaxed text-brand-ink ${className}`}
    >
      <p className="font-semibold">{BUSINESS.ownershipSentence}</p>
      <address className="mt-3 not-italic">
        <span className="block font-semibold">{BUSINESS.tradingName}</span>
        <span className="block">Owned and operated by {BUSINESS.owner}</span>
        <span className="block">{BUSINESS.addressLine}</span>
        <span className="block">
          <a href={`mailto:${BUSINESS.email}`} className="underline underline-offset-2 hover:text-brand-primary">
            {BUSINESS.email}
          </a>
          <span aria-hidden> · </span>
          <a href={`tel:${SITE.phone.e164}`} className="underline underline-offset-2 hover:text-brand-primary">
            {SITE.phone.displayInternational}
          </a>
        </span>
      </address>
    </section>
  );
}
