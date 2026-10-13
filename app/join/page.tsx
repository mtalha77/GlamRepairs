import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import Logo from "@/components/home/Logo";

/**
 * /join — the page for a working aesthetician deciding whether to apply
 * (HANDOVER-52 Part 5, to Talha's 13 October design).
 *
 * The five questions she has, in her order, before any form; the bar,
 * said out loud; then the application at /join/apply. noindex, nofollow,
 * and not linked from the main navigation: it is shared, not found.
 *
 * Deliberately no monthly earnings total. "Rs 64,000 a month" is
 * arithmetic, not a promise, and with no booking volume yet it would be an
 * earnings claim the business cannot stand behind. The per-consultation
 * figure is a fact; volume is not, yet.
 */

export const metadata: Metadata = {
  title: "Join as a practitioner",
  description: "Read skin photographs and take short video consultations from home, on your own hours. Rs 2,000 per 15 minute consultation.",
  robots: { index: false, follow: false },
};

const APPLY = "/join/apply";

const ANSWERS: { q: string; a: React.ReactNode; wide?: boolean }[] = [
  {
    q: "What will I earn?",
    a: (
      <>
        <strong className="font-semibold text-brand-primary">Rs 2,000 for every 15 minute consultation.</strong> Paid in full
        whether or not the client turns up.
      </>
    ),
  },
  {
    q: "When do I get paid?",
    a: (
      <>
        Monthly, by the <strong className="font-semibold text-brand-primary">5th</strong>, by bank transfer, with a statement
        listing every consultation.
      </>
    ),
  },
  {
    q: "How much time does it take?",
    a: (
      <>
        You set your own hours and change them whenever you like. <strong className="font-semibold text-brand-primary">Two
        evenings a week</strong> is a good place to start.
      </>
    ),
  },
  {
    q: "Do I need my own clinic?",
    a: (
      <>
        <strong className="font-semibold text-brand-primary">No.</strong> You need a quiet room, a phone or laptop, and a window
        to sit facing.
      </>
    ),
  },
  {
    q: "What do I actually do?",
    wide: true,
    a: (
      <>
        Read the client&apos;s questionnaire and photographs, take the video call if they booked one, and write a short
        structured note afterwards. <strong className="font-semibold text-brand-primary">The note is what releases your
        payment</strong>, so it never gets forgotten.
      </>
    ),
  },
];

const NEED = [
  "A degree or diploma in cosmetology, aesthetics or a related field",
  "A scan or photograph of that certificate",
  "At least two years working with clients",
  "A professional photograph of yourself",
  "A bank account in your own name",
];

const NOT_NEED = [
  "To be a doctor. Ayma is not one either",
  "HEC attestation. Useful, never required",
  "Your own clinic or equipment",
  "To give up your existing work. This is not exclusive",
  "To commit to set hours",
];

const STEPS = [
  { t: "Who you are", d: "Name, phone, city.", m: "30 seconds" },
  { t: "Your qualification", d: "What you studied, where, and how long you have practised.", m: "1 minute" },
  { t: "Your documents", d: "Degree certificate and CNIC. Anything else is optional.", m: "2 minutes" },
  { t: "Your photograph", d: "A clear headshot. We show you an example.", m: "1 minute" },
  { t: "How you are paid", d: "Bank name and account title.", m: "30 seconds" },
];

const FAQ: { q: string; a: React.ReactNode; flag?: string }[] = [
  {
    q: "What if a client does not turn up?",
    flag: "Worth knowing",
    a: "You are paid in full. You held the time and you were there, so the Rs 2,000 is yours. We do not pass that loss to you.",
  },
  {
    q: "What if I cannot make a slot?",
    a: "Cancel with 12 hours notice and there is no penalty. Inside 12 hours we have to find the client another time, so please make it rare.",
  },
  { q: "Is this exclusive?", a: "No. Carry on at your clinic as well." },
  {
    q: "Who sees my documents?",
    a: "Only the studio's administrator, to verify them. They are held in private storage and are never shown on the website or to clients.",
  },
  {
    q: "What appears publicly about me?",
    a: (
      <>
        Your name, photograph, title, qualification and the short bio you write, on your profile page and beside your name.{" "}
        <strong className="font-semibold text-brand-ink">Never your CNIC, your documents, your phone number or your address.</strong>
      </>
    ),
  },
  {
    q: "Am I employed by GlamRepairs?",
    a: "No. You work as an independent practitioner, paid per consultation. We will send you the agreement before you start.",
  },
  {
    q: "What if I see something that worries me?",
    a: "Say so. There is a field in every consultation note for exactly this. We do not diagnose, so telling a client plainly to see a doctor is the right answer, and we would rather you used it too often than too rarely.",
  },
  {
    q: "Can I stop?",
    a: "Yes. Finish the consultations already booked, close your hours, and you are done. Any payment owed still reaches you on the next run.",
  },
];

const eyebrow = "text-xs font-bold uppercase tracking-[0.14em] text-brand-primary";
const lead = "mt-3 max-w-[36ch] text-2xl font-semibold leading-tight tracking-tight text-brand-ink sm:text-[27px]";
const em = "font-serif font-medium italic text-brand-primary";
const band = "border-t border-brand-lavender/60 px-4 py-10 sm:px-8 sm:py-12";

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  // Invites sent before the application moved to /join/apply.
  const { token } = await searchParams;
  if (token) redirect(`${APPLY}?token=${encodeURIComponent(token)}`);

  return (
    <div className="min-h-dvh bg-white text-brand-ink">
      <nav className="flex items-center justify-between border-b border-brand-lavender/60 px-4 py-3 sm:px-8">
        <Link href="/" aria-label="GlamRepairs home">
          <Logo variant="color" className="block h-9" />
        </Link>
        <span className="text-xs text-brand-gray sm:text-sm">For practitioners</span>
      </nav>

      <main>
        <section className="grid items-center gap-10 px-4 py-10 sm:px-8 sm:py-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
          <div>
            <span className="inline-flex rounded-full bg-brand-purple-soft px-3 py-1.5 text-xs font-semibold text-brand-primary">
              Now taking applications, Lahore, Karachi and Islamabad
            </span>
            <h1 className="mt-4 text-[33px] font-semibold leading-[1.1] tracking-tight sm:text-[42px]">
              You already have the skill. Right now it only earns <span className={em}>when somebody walks in.</span>
            </h1>
            <p className="mt-5 max-w-[48ch] text-base leading-relaxed text-brand-gray sm:text-[17px]">
              GlamRepairs is an online skin assessment service. You read photographs and take short video consultations from
              home, in the evening, for clients you would never otherwise reach.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={APPLY} className="inline-flex min-h-12 items-center rounded-xl bg-brand-primary px-6 text-[15px] font-semibold text-white">
                Apply in 5 minutes
              </Link>
              <a href="#how" className="inline-flex min-h-12 items-center rounded-xl border-[1.5px] border-brand-primary px-6 text-[15px] font-semibold text-brand-primary">
                Read how it works
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-brand-lavender/60 bg-brand-cream-card p-6 sm:p-7">
            <p className="text-[40px] font-semibold leading-none tracking-tight text-brand-primary">Rs 2,000</p>
            <p className="mt-2 text-sm text-brand-gray">per 15 minute consultation</p>
            <dl className="mt-5 divide-y divide-brand-lavender/60 text-sm">
              {[
                ["Paid", "Monthly, by the 5th"],
                ["How", "Bank transfer"],
                ["Your hours", "You set them"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-3">
                  <dt className="text-brand-gray">{k}</dt>
                  <dd className="font-semibold text-brand-ink">{v}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-brand-gray">Client does not show</dt>
                <dd className="font-semibold text-brand-success-strong">You are still paid</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className={`${band} bg-brand-purple-tint/50`}>
          <h2 className={eyebrow}>The five questions everyone asks</h2>
          <p className={lead}>
            Answered before the form, <span className={em}>not after it</span>.
          </p>
          <div className="mt-6 grid gap-3.5 md:grid-cols-2">
            {ANSWERS.map((x) => (
              <div key={x.q} className={`rounded-xl border border-brand-lavender/60 bg-white p-5 ${x.wide ? "md:col-span-2" : ""}`}>
                <h3 className="text-[15.5px] font-semibold">{x.q}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-brand-gray">{x.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={band}>
          <h2 className={eyebrow}>Who we take</h2>
          <p className={lead}>
            We are <span className={em}>selective</span>, and it is fairer to say so now.
          </p>
          <div className="mt-6 rounded-2xl border border-brand-lavender bg-brand-purple-soft p-6">
            <p className="max-w-[70ch] text-[15.5px] leading-relaxed">
              We take practitioners with a relevant qualification and real clinic experience. Every new practitioner&apos;s{" "}
              <strong className="font-semibold">first five assessments are reviewed by Ayma Arif before they are sent to the client</strong>.
              If the work is good, the review stops and you carry on independently.
            </p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-brand-lavender/60 bg-white p-6">
              <h3 className="font-serif text-lg italic text-brand-primary">You will need</h3>
              <ul className="mt-3 space-y-1 text-sm leading-relaxed text-brand-gray">
                {NEED.map((x) => (
                  <li key={x} className="flex gap-3 py-1">
                    <span aria-hidden className="font-bold text-brand-success-strong">✓</span>
                    {x}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-brand-lavender/40 bg-brand-purple-tint/40 p-6">
              <h3 className="font-serif text-lg italic text-brand-gray">You will not need</h3>
              <ul className="mt-3 space-y-1 text-sm leading-relaxed text-brand-gray">
                {NOT_NEED.map((x) => (
                  <li key={x} className="flex gap-3 py-1">
                    <span aria-hidden className="font-bold text-brand-gray/60">×</span>
                    {x}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="how" className={`${band} scroll-mt-4 bg-brand-purple-tint/50`}>
          <h2 className={eyebrow}>Applying</h2>
          <p className={lead}>
            Five short steps. You can <span className={em}>stop and come back</span>.
          </p>
          <ol className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((s, i) => (
              <li key={s.t} className="rounded-xl border border-brand-lavender/60 bg-white p-4">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-primary text-xs font-bold text-white">{i + 1}</span>
                <h3 className="mt-3 text-sm font-semibold leading-snug">{s.t}</h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-brand-gray">{s.d}</p>
                <p className="mt-2 text-[11.5px] text-brand-accent">{s.m}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm leading-relaxed text-brand-gray">
            We reply within <strong className="font-semibold text-brand-ink">three working days</strong>, either to approve you, to
            ask for one or two things, or to say no. You will always get a reason.
          </p>
        </section>

        <section className={band}>
          <h2 className={eyebrow}>Questions</h2>
          <div className="mt-4 divide-y divide-brand-lavender/60">
            {FAQ.map((x) => (
              <div key={x.q} className="py-4">
                <h3 className="text-[15.5px] font-semibold">
                  {x.q}
                  {x.flag ? (
                    <span className="ml-2 inline-block rounded-md bg-brand-success/15 px-2 py-0.5 align-[2px] text-[11px] font-bold text-brand-success-strong">
                      {x.flag}
                    </span>
                  ) : null}
                </h3>
                <p className="mt-1.5 max-w-[72ch] text-[14.5px] leading-relaxed text-brand-gray">{x.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-brand-primary px-4 py-12 text-center text-white sm:px-8">
          <p className="text-2xl font-semibold tracking-tight sm:text-[28px]">
            Five minutes now, <span className="font-serif font-medium italic">a reply within three days.</span>
          </p>
          <p className="mt-3 text-[15px] text-white/85">No obligation. You can stop halfway and come back to where you left off.</p>
          <Link href={APPLY} className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-white px-8 text-base font-semibold text-brand-primary">
            Start your application
          </Link>
        </section>
      </main>

      <footer className="border-t border-brand-lavender/60 bg-brand-purple-tint px-4 py-6 text-xs leading-relaxed text-brand-gray sm:px-8">
        GlamRepairs provides cosmetic skincare guidance. It does not diagnose or treat medical conditions. Practitioners work
        independently and are not employees.
      </footer>
    </div>
  );
}
