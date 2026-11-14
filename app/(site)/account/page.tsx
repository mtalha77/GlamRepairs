import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";

import { getClientLead, getClientReport, getPortal, viewablePhotoPaths } from "@/lib/clients/portal";
import PayWithCredit from "@/components/account/PayWithCredit";
import { currentClientAccount } from "@/lib/clients/signIn";
import { clientCreditView } from "@/lib/credits/client";
import { formatCredit } from "@/lib/credits/credits";
import { getWhatsAppChatLink } from "@/lib/funnel/whatsapp";

/**
 * The client's own page. HANDOVER-60 Part 7.1: the report behind a sign-in,
 * their photographs, and a way to book a follow-up. Also the ATA "patient
 * access to their records" requirement, and the place a data request
 * starts.
 */

export const metadata: Metadata = {
  title: "Your assessment",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const card = "rounded-2xl border border-brand-lavender/70 bg-white p-5 sm:p-6";

function day(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function Section({ title, text }: { title: string; text: string | null | undefined }) {
  if (!text?.trim()) return null;
  return (
    <div className="mt-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-accent">{title}</h3>
      <p className="mt-1.5 whitespace-pre-line text-[0.9375rem] leading-relaxed text-brand-ink">{text}</p>
    </div>
  );
}

export default async function AccountPage() {
  const account = await currentClientAccount();
  if (!account) redirect("/account/login");

  const portal = await getPortal(account.id);
  const [lead, report] = account.lead_id
    ? await Promise.all([getClientLead(account.lead_id), getClientReport(account.lead_id)])
    : [null, null];
  const [photos, creditView] = await Promise.all([lead ? viewablePhotoPaths(lead) : Promise.resolve([]), clientCreditView(account.email)]);
  const { credit, pending: awaiting, canPay } = creditView;
  const first = account.full_name?.trim().split(/\s+/)[0];
  const ref = lead?.ref ? ` (reference ${lead.ref})` : "";
  const followUp = getWhatsAppChatLink(`Hi, I would like to book a follow-up for my skin assessment${ref}.`);

  const stage = report
    ? `Delivered on ${day(report.sent_at!)}.`
    : portal?.payment_status === "verified"
      ? "Your payment is confirmed and your assessment is being written. It arrives within 24 hours of confirmation."
      : "We are waiting to confirm your payment.";

  return (
    <main className="mx-auto max-w-2xl px-6 pb-20 pt-28 sm:pt-32">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-serif text-3xl text-brand-primary">{first ? `Hello, ${first}` : "Your assessment"}</h1>
        <form action="/account/signout" method="post">
          <button type="submit" className="text-sm text-brand-gray underline underline-offset-2">
            Sign out
          </button>
        </form>
      </div>

      <section className={`${card} mt-6`}>
        <h2 className="font-serif text-xl text-brand-primary">Where it is</h2>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-brand-ink">{stage}</p>
        {portal?.next_consultation_at ? (
          <p className="mt-2 text-[0.9375rem] text-brand-ink">
            Your video consultation: {new Date(portal.next_consultation_at).toLocaleString("en-GB", {
              dateStyle: "full",
              timeStyle: "short",
              timeZone: portal.timezone || "Asia/Karachi",
            })}
            . The joining link is in your booking email.
          </p>
        ) : null}
        {portal?.practitioner_name ? (
          <div className="mt-4 flex items-center gap-3">
            {portal.practitioner_photo ? (
              <Image
                src={portal.practitioner_photo}
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 rounded-full object-cover"
                unoptimized
              />
            ) : null}
            <p className="text-sm text-brand-gray">
              Read by <span className="font-medium text-brand-ink">{portal.practitioner_name}</span>
              {portal.practitioner_title ? `, ${portal.practitioner_title}` : ""}
              {portal.practitioner_country ? `, practising in ${portal.practitioner_country}` : ""}
            </p>
          </div>
        ) : null}
      </section>

      {report ? (
        <section className={`${card} mt-5`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-xl text-brand-primary">Your report</h2>
            <a
              href="/account/report"
              className="inline-flex min-h-11 items-center rounded-full bg-brand-primary px-5 text-sm font-medium text-white"
            >
              Download PDF
            </a>
          </div>
          <Section title="Start here" text={report.start_here} />
          <Section title="What we noticed" text={report.noticed} />
          <Section title="Morning routine" text={report.morning_routine} />
          <Section title="Night routine" text={report.night_routine} />
          <Section title="What to avoid" text={report.avoid_items} />
          <Section title="What to expect, week by week" text={report.timeline} />
          <Section title="Good signs" text={report.good_signs} />
          <Section title="Stop and see a doctor if" text={report.warning_signs} />
          <Section title="Extra notes" text={report.extra_notes} />
          <p className="mt-6 text-xs text-brand-gray">Written by {report.author_name}.</p>
        </section>
      ) : null}

      {photos.length ? (
        <section className={`${card} mt-5`}>
          <h2 className="font-serif text-xl text-brand-primary">Your photographs</h2>
          <p className="mt-1 text-sm text-brand-gray">
            Kept for 30 days after your assessment, then deleted
            {lead?.photos_expire_at ? ` on ${day(lead.photos_expire_at)}` : ""}.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            {photos.map((_, i) => (
              <a key={i} href={`/account/photo/${i}`} target="_blank" rel="noopener noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element -- a 302 to a short-lived signed URL; next/image would cache it */}
                <img
                  src={`/account/photo/${i}`}
                  alt={`Your photograph ${i + 1}`}
                  className="aspect-[3/4] w-full rounded-xl object-cover"
                />
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {/* 13 November 2026: credit held instead of a refund, and spent from here. */}
      {credit.balances.length || credit.rows.length ? (
        <section className={`${card} mt-5`}>
          <h2 className="font-serif text-xl text-brand-primary">Your credit</h2>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-brand-ink">
            {credit.balances.length
              ? `You have ${credit.balances.map((b) => formatCredit(b.balance, b.currency)).join(" and ")} in credit. It does not expire, and it pays for a future assessment.`
              : "You have no credit left."}
          </p>
          {canPay && awaiting ? (
            <PayWithCredit label={`Pay ${formatCredit(awaiting.finalPrice, awaiting.currency)} for your new assessment from credit`} />
          ) : awaiting ? (
            <p className="mt-2 text-sm text-brand-gray">
              Your new assessment is {formatCredit(awaiting.finalPrice, awaiting.currency)}, which is more than your credit in that currency, so
              it is paid the usual way. Message us if you would like to put your credit towards it.
            </p>
          ) : credit.balances.length ? (
            <p className="mt-2 text-sm text-brand-gray">
              To use it, start a new assessment with this email address, then come back here to pay with credit.
            </p>
          ) : null}
          <ul className="mt-4 space-y-1.5 border-t border-brand-lavender/60 pt-3 text-sm">
            {credit.rows.map((r) => (
              <li key={r.id} className="flex justify-between gap-3">
                <span className="text-brand-gray">
                  {day(r.createdAt)}, {r.reason === "applied" ? "used for an assessment" : "held as credit"}
                </span>
                <span className="shrink-0 text-brand-ink">
                  {r.amount > 0 ? "+" : ""}
                  {formatCredit(r.amount, r.currency)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={`${card} mt-5`}>
        <h2 className="font-serif text-xl text-brand-primary">Next</h2>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-brand-ink">
          Most people see a change at six to eight weeks. If you want your routine adjusted, or a review with new photographs, book a
          follow-up.
        </p>
        <a
          href={followUp}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex min-h-11 items-center rounded-full border border-brand-primary px-5 text-sm font-medium text-brand-primary"
        >
          Book a follow-up on WhatsApp
        </a>
        <p className="mt-5 text-sm leading-relaxed text-brand-gray">
          <span className="font-medium text-brand-ink">If something is urgent, do not wait for us.</span> If your skin is painful,
          rapidly spreading or blistering, or you feel unwell with it, contact a doctor or your local emergency service now.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-brand-gray">
          Want a copy of everything we hold about you, or want it deleted? Reply to any of our emails and we will do it.
        </p>
      </section>
    </main>
  );
}
