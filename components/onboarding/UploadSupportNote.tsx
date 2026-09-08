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
 * WhatsApp to a call, and the digits are rendered as readable text rather
 * than hidden behind a button: `tel:` frequently does nothing on desktop,
 * so the number has to be readable and copyable on its own.
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
        Trouble uploading? Call or WhatsApp us on{" "}
        <a
          href={`tel:${SITE.phone.e164}`}
          className="font-semibold text-brand-primary underline underline-offset-2"
        >
          {SITE.phone.display}
        </a>{" "}
        — we&apos;ll help you get it done.
      </p>
      <div className="mt-2.5 flex items-center justify-center gap-2">
        <a
          href={`tel:${SITE.phone.e164}`}
          className="rounded-full border border-brand-border-light bg-white px-3.5 py-1.5 text-xs font-medium text-brand-primary transition-colors hover:border-brand-lavender sm:text-[0.8125rem]"
        >
          Call
        </a>
        <a
          href={`https://wa.me/${SITE.phone.digits}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-brand-border-light bg-white px-3.5 py-1.5 text-xs font-medium text-brand-primary transition-colors hover:border-brand-lavender sm:text-[0.8125rem]"
        >
          WhatsApp
        </a>
      </div>
    </div>
  );
}
