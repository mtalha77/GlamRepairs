/**
 * Refunds, cancellations, complaints: Handover 75, 25 November 2026.
 *
 * ── Policy, approved by Talha on 25 November 2026 ────────────────────────
 * This replaces "no refunds, credit instead" (13 November) in two places
 * only, both before any work exists:
 *   • cancel before a practitioner starts  → full refund, 7 working days
 *   • we decline (needs a doctor) or cannot complete → refund OR credit,
 *     the client chooses
 * A DELIVERED assessment stays non-refundable; free revision within 14
 * days is the remedy. Safepay's checklist rejects a services business whose
 * policy does not cover dissatisfaction, and a pre-work refund costs less
 * than the chargeback it prevents.
 *
 * ── One source, two pages ────────────────────────────────────────────────
 * /terms and /refunds must never disagree (Handover 75 Part 4). Every
 * number and every sentence the two share is defined once here and
 * interpolated into both. Change a timeline here and both pages move.
 */
import { BUSINESS, SITE } from "@/lib/seo/site";

export const REFUNDS_LAST_UPDATED = "2026-11-25";

/** Working days to process a refund, from the request. */
export const REFUND_WORKING_DAYS = 7;
/** Days after delivery in which a client can ask for a free revision. */
export const REVISION_DAYS = 14;
/** Complaint timelines, in working days. */
export const COMPLAINT_ACK_DAYS = 2;
export const COMPLAINT_RESOLVE_DAYS = 10;

const PHONE = SITE.phone.displayInternational;
const EMAIL = BUSINESS.email;

/** Shared sentences. Both pages render these exact strings. */
export const POLICY = {
  revision:
    `If your assessment does not address what you asked about, tell us within ${REVISION_DAYS} days of ` +
    `delivery and we will revise it at no cost. There is no charge and no limit on what you can tell us is wrong.`,
  notRefundable:
    "Because each assessment is written by hand for one person and cannot be reused once delivered, " +
    "a delivered assessment is not refundable. Revision is the remedy.",
  cancelBeforeStart:
    "If you cancel before a practitioner has begun work, you receive a full refund, processed within " +
    `${REFUND_WORKING_DAYS} working days to the method you paid with.`,
  declined:
    "If we decline your case because it needs a doctor, or we are unable to complete your assessment " +
    `for any other reason, you may choose a full refund within ${REFUND_WORKING_DAYS} working days or a ` +
    "credit towards a future assessment.",
  legalRights:
    "Nothing in these terms takes away any right you have under the consumer law of the country you live in.",
} as const;

/**
 * The short form for every other surface (FAQ, consent, /compare, practitioner
 * pages): what happens to the fee when a case needs a doctor.
 */
export const DECLINED_FEE_SHORT = "refund your fee or hold it as a credit, whichever you choose";

/** The complaints block, identical on /terms and /refunds. */
export const COMPLAINTS_MARKDOWN = `If something has gone wrong, write to **${EMAIL}** or message **${PHONE}** on WhatsApp.
- We will **acknowledge your complaint within ${COMPLAINT_ACK_DAYS} working days**.
- We will **give you a decision or a resolution within ${COMPLAINT_RESOLVE_DAYS} working days**.
- If a complaint concerns the work of a particular practitioner, it is reviewed by the managing director, not by that practitioner.
Our hours are ${SITE.hours.displayDays}, 12:00 to 22:00 Pakistan Standard Time. Messages outside those hours are answered the next working day.`;

/** /terms, "Refunds, cancellations and revisions" (Handover 75 Part 4.2). */
export const TERMS_REFUNDS_SECTION = `## Refunds, cancellations and revisions
${POLICY.revision}
${POLICY.notRefundable}
${POLICY.cancelBeforeStart}
${POLICY.declined}
Full detail is on our [Refunds, Cancellations and Delivery](/refunds) page. ${POLICY.legalRights}
## Complaints
${COMPLAINTS_MARKDOWN}`;

export const REFUNDS_TITLE = "Refunds, Cancellations and Delivery";

export const REFUNDS_INTRO =
  "This page explains what happens if you change your mind, if something goes wrong, or if you are not " +
  "happy with your assessment. It applies alongside our Terms and Conditions.";

/** /refunds, as written in Handover 75 Part 3. */
export const REFUNDS_MARKDOWN = `## What you are buying
A skin assessment is a written document prepared individually for you by a qualified aesthetics practitioner, based on your questionnaire and your photographs. It is a service, not a physical product, so there is nothing to return or exchange.
## Delivery
Your assessment is delivered **within 24 hours** of two things being complete: your payment being confirmed, and your questionnaire and usable photographs being received.
If your photographs cannot be read, because they are too dark, blurred, filtered, or do not show the area of concern, we will ask you to retake them. The 24 hour window restarts when we receive usable photographs.
Reports are sent to the email address you give us, and are available in your account.
## Cancelling before we start
You may cancel at any time before a practitioner has begun work on your assessment.
**You will receive a full refund.** We will process it within **${REFUND_WORKING_DAYS} working days** of your request, back to the method you paid with. Depending on your bank it may take a few days after that to appear on your statement.
To cancel, email **${EMAIL}** or message us on WhatsApp at **${PHONE}** with the name and email you used.
## If you are not satisfied with your assessment
Tell us within **${REVISION_DAYS} days** of delivery and **we will revise it at no cost**. If your assessment did not address what you asked about, or the routine is not workable for you, your practitioner will rewrite it. There is no limit on how much you can tell us is wrong, and there is no charge.
Because each assessment is written by hand for one person, and cannot be returned or reused once delivered, **a delivered assessment is not refundable**. Revision is the remedy, and we would rather fix your assessment than leave you without a routine you trust.
## If we cannot help you
If your practitioner believes your concern needs a doctor rather than cosmetic guidance, they will tell you and we will not write a routine. In that case **you may choose a full refund, processed within ${REFUND_WORKING_DAYS} working days, or a credit towards a future assessment.** The choice is yours.
The same applies if we are unable to complete your assessment for any other reason.
## Appointments and video consultations
If your plan includes a video consultation, please give us reasonable notice if you need to cancel or reschedule so the slot can be offered to someone else. There is no charge for rescheduling.
If we cancel and cannot offer you a suitable alternative time, you may choose a refund for that appointment or a credit.
## Complaints
${COMPLAINTS_MARKDOWN}
## Nothing here removes your legal rights
Nothing on this page takes away any right you have under the consumer law of the country you live in.`;
