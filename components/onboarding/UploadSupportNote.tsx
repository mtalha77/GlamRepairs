import { ChatIcon, PhoneIcon } from "@/components/ui/ContactIcons";
import { SITE } from "@/lib/seo/site";

/**
 * HOTFIX-9 §4 — help, at the point where people actually get stuck.
 *
 * Step 23 is the highest-friction moment in the funnel: 22 steps in, being
 * asked to photograph your own face, with camera permissions, file size and
 * "is this good enough?" all able to go wrong at once. Anyone stuck here is
 * minutes from paying, so this sits directly beneath the upload control —
 * not in a footer, not behind a "need help?" toggle.
 *
 * HOTFIX-8 folded the old separate support number into SITE.phone — there
 * is one business number now, shared with the Google Business Profile.
 *
 * Both actions are one tap because in Pakistan plenty of people will prefer
 * WhatsApp to a call. The digits are not printed (Talha, 30 October 2026):
 * the links are the contact.
 *
 * Tone is deliberately "help is here if you want it", not "this step is
 * hard" — telling someone a step is difficult right before they attempt it
 * is its own kind of abandonment.
 *
 * When /how-we-protect-your-photos ships (HOTFIX-6 §3) its link belongs in
 * this same block, for the same reason: put the reassurance where the
 * hesitation actually happens.
 */
export default function UploadSupportNote() {
  return (
    <div className="mt-4 rounded-2xl border border-brand-border-light/60 bg-white px-3.5 py-3 text-center shadow-sm sm:mt-5 sm:px-4 sm:py-3.5">
      <p className="text-xs leading-relaxed text-brand-gray sm:text-[0.8125rem]">
        Trouble uploading? Call or WhatsApp us and we&apos;ll help you get it done.
      </p>
      <div className="mt-2.5 flex items-center justify-center gap-2">
        <a
          href={`tel:${SITE.phone.e164}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-brand-border-light bg-white px-3.5 py-1.5 text-xs font-medium text-brand-primary transition-colors hover:border-brand-lavender sm:text-[0.8125rem]"
        >
          <PhoneIcon className="h-3.5 w-3.5" />
          Call
        </a>
        <a
          href={`https://wa.me/${SITE.phone.digits}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-brand-border-light bg-white px-3.5 py-1.5 text-xs font-medium text-brand-primary transition-colors hover:border-brand-lavender sm:text-[0.8125rem]"
        >
          <ChatIcon className="h-3.5 w-3.5" />
          WhatsApp
        </a>
      </div>
    </div>
  );
}
