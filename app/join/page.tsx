import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import Logo from "@/components/home/Logo";
import { PRACTITIONER_WHATSAPP, practitionerWhatsAppLink } from "@/lib/seo/site";

/**
 * /join — work from home as a skincare practitioner (HANDOVER-52 Part 5,
 * to Talha's second 13 October design).
 *
 * Everything on it is checked against the product: the rate and payment
 * date, no-shows paid in full, nothing deducted, 24 hours' notice on
 * bookings, a five minute gap between calls, her own daily limit and days
 * off (both in her dashboard), the note releasing the fee, and nothing
 * public until she agrees. The earnings figure is a calculator with its
 * working shown and a plain statement that it is not a forecast. No cities
 * (Talha, 13 October).
 *
 * Indexable since HANDOVER-54 §2.2: articles now feed it, so Google has to be
 * able to show it. The application (/join/apply) and its steps stay noindex.
 * Its own share card (§2.3) so a WhatsApp preview pitches the work, not the
 * client service.
 */

/*
 * Talha, 29 October 2026: no amounts and no split on public pages, because
 * clients read this site too. The rate is set out in each practitioner's
 * written agreement, before they start.
 */
const TITLE = "Beautician Jobs From Home: Paid per Consultation";
const SHARE_TITLE = "Beautician Jobs From Home: Paid per Consultation | GlamRepairs";
const DESCRIPTION =
  "For qualified beauticians: read skin photographs and take video consultations from home, in the evening. Paid for every 15 minute consultation, monthly, by bank transfer.";
const SHARE_IMAGE = { url: "/join/opengraph-image", width: 1200, height: 630, alt: "GlamRepairs for practitioners" };

export const metadata: Metadata = {
  // HANDOVER-55 §2.2: "beautician" is what people search; "cosmetology" has
  // no volume as a job term. Absolute, so the brand suffix does not push the
  // title past what a result shows.
  title: { absolute: TITLE },
  description: DESCRIPTION,
  robots: { index: true, follow: true },
  alternates: { canonical: "/join" },
  openGraph: { type: "website", url: "/join", title: SHARE_TITLE, description: DESCRIPTION, images: [SHARE_IMAGE] },
  twitter: { card: "summary_large_image", title: SHARE_TITLE, description: DESCRIPTION, images: [SHARE_IMAGE.url] },
};

const APPLY = "/join/apply";

const em = "font-serif font-medium italic text-brand-primary";
const kicker = "text-[12.5px] font-bold uppercase tracking-[0.15em] text-brand-primary";
const lead = "mt-3 max-w-[30ch] text-[25px] font-semibold leading-tight tracking-tight sm:text-[31px]";
const intro = "mt-4 max-w-[62ch] text-base leading-relaxed text-brand-gray sm:text-[16.5px]";
const wrap = "mx-auto max-w-[1060px] px-4 sm:px-7";
const section = "border-b border-brand-lavender/60 py-12 sm:py-16";
const btnPrimary = "inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-primary px-7 text-base font-semibold text-white";

const STATEMENT = [
  { k: "Consultations completed", d: "15 minutes each", v: "14" },
  { k: "Client did not attend", d: "Paid in full, you held the time", v: "2" },
  { k: "Notes outstanding", d: "Each fee is released when its note is in", v: "0" },
  { k: "Deductions", d: "No joining fee, no equipment charge", v: "None" },
];

const NUMBERS = [
  { b: "15 min", s: "Length of a video consultation" },
  { b: "Per call", s: "Paid for every consultation, no-shows included" },
  { b: "24 hrs", s: "Turnaround we promise clients" },
  { b: "Monthly", s: "Paid by the 5th, by bank transfer" },
];

const WEEK = [
  { d: "MON", s: "Closed" },
  { d: "TUE", s: "6 to 9 pm", on: true },
  { d: "WED", s: "Closed" },
  { d: "THU", s: "6 to 9 pm", on: true },
  { d: "FRI", s: "Closed" },
  { d: "SAT", s: "11 am to 2 pm", on: true },
  { d: "SUN", s: "Closed" },
];

const DAY = [
  { t: "6:00 pm", w: "Client #1043 · acne, 8 months" },
  { t: "6:20 pm", w: "Client #1044 · pigmentation" },
  { t: "7:00 pm", w: "Client #1047 · sensitivity" },
];

const COMPARE = [
  ["Where", "You travel to the clinic", "Your sitting room"],
  ["When", "The clinic's opening hours", "Hours you set yourself"],
  ["Commute", "An hour of your day, often more", "None"],
  ["If a client cancels", "You waited for nothing", "Paid in full if they no-show"],
  ["Equipment", "The clinic's", "A phone or laptop"],
  ["Reach", "People who live nearby", "Anywhere in Pakistan"],
  ["Commitment", "Fixed shifts", "Change your hours any week"],
];

const NEED = [
  "A degree or diploma in cosmetology, aesthetics or a related field",
  "A scan or clear photograph of that certificate",
  "At least two years working with real clients",
  "A professional photograph of yourself",
  "A quiet room, a window to face, and a decent connection",
  "A bank account in your own name",
];

const NOT_NEED = [
  "To be a doctor. Ayma is not one either",
  "HEC attestation. Useful, never required",
  "Your own clinic, products or equipment",
  "To give up your current job. This is not exclusive",
  "To pay anything. There is no joining fee, ever",
  "To commit to fixed hours",
];

const STEPS = [
  { t: "Who you are", d: "Name, email, phone, city.", m: "30 seconds" },
  { t: "Your qualification", d: "What you studied and how long you have practised.", m: "1 minute" },
  { t: "Your documents", d: "Degree certificate and CNIC. Everything else optional.", m: "2 minutes" },
  { t: "Your photograph", d: "A clear headshot. We show you an example.", m: "1 minute" },
  { t: "How you are paid", d: "Bank name and account title.", m: "30 seconds" },
];

const FAQ: { q: string; a: React.ReactNode; flag?: string }[] = [
  {
    q: "What if a client does not turn up?",
    flag: "Worth knowing",
    a: "You are paid in full. You held the time and you were there, so the fee is yours. We do not pass that loss to you.",
  },
  {
    q: "Who can apply?",
    a: "Anyone with a genuine aesthetics qualification. We accept practitioners of every ethnicity, skin tone, nationality, religion, gender, age, disability and background, and we judge an application on verified qualifications and the quality of the work, nothing else. If you believe an application was handled unfairly, tell us and the managing director will review it personally.",
  },
  {
    q: "Is there any fee to join?",
    a: "No. No joining fee, nothing taken from your fee, no charge for training or equipment. If anyone ever asks you for money to work here, it is not us.",
  },
  {
    q: "What if I cannot make a slot?",
    a: "Cancel with 12 hours notice and there is no penalty. Inside 12 hours we have to find that client another time, so please keep it rare.",
  },
  {
    q: "Am I employed by GlamRepairs?",
    a: "No. You work as an independent practitioner. We will send you a short written agreement covering the rate, payment dates and confidentiality before you start. Tax on your earnings is your own responsibility, and we will tell you what we deduct, if anything, before your first payment.",
  },
  {
    q: "What appears about me on the website?",
    a: (
      <>
        Your name, photograph, title, qualification, bio, years of experience, the city you practise in, your specialisms,
        languages and when you are next available.{" "}
        <strong className="font-semibold text-brand-ink">Nothing at all until you agree to it in your dashboard.</strong> Never
        your CNIC, your documents, your phone number or your address.
      </>
    ),
  },
  {
    q: "Who sees my documents?",
    a: "Only the studio's administrator, to verify your qualification. They are held in private storage, never shown to clients, and if your application is unsuccessful they are deleted within 30 days.",
  },
  {
    q: "Do I need to buy or recommend particular products?",
    a: "No, and you must not. GlamRepairs takes no money from any skincare brand, and routines are written around ingredients, not brand names. That independence is the thing clients pay for.",
  },
  {
    q: "What if I see something that worries me?",
    a: "Tick the escalation box in the consultation note and tell the client plainly to see a doctor. We give cosmetic guidance and do not diagnose. You will never be penalised for escalating something.",
  },
  {
    q: "Can I stop?",
    a: "Yes. Finish the consultations already booked, close your hours, and you are done. Anything you are owed still reaches you on the next payment run.",
  },
];

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  // Invites sent before the application moved to /join/apply.
  const { token } = await searchParams;
  if (token) redirect(`${APPLY}?token=${encodeURIComponent(token)}`);
  // The hiring number, not the client one: see PRACTITIONER_WHATSAPP.
  const whatsapp = practitionerWhatsAppLink("question");

  return (
    <div className="min-h-dvh bg-white text-brand-ink">
      <nav className="sticky top-0 z-20 flex items-center justify-between border-b border-brand-lavender/60 bg-white px-4 py-3 sm:px-7">
        <Link href="/" aria-label="GlamRepairs home">
          <Logo variant="color" className="block h-9" />
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-brand-accent sm:inline">For practitioners</span>
          <a href="#apply" className="inline-flex min-h-11 items-center rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white">
            Apply now
          </a>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <div className="border-b border-brand-lavender/60 bg-gradient-to-br from-brand-purple-tint to-brand-cream-card py-12 sm:py-14">
          <div className={`${wrap} grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-12`}>
            <div>
              <span className="inline-flex rounded-full border border-brand-lavender bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-brand-primary">
                Now taking applications
              </span>
              <h1 className="mt-4 text-[34px] font-semibold leading-[1.08] tracking-tight sm:text-[46px]">
                Use your beautician qualification <span className={em}>from home,</span> in the evening.
              </h1>
              <p className="mt-5 max-w-[47ch] text-base leading-relaxed text-brand-gray sm:text-[17.5px]">
                You trained as a beautician or in cosmetology. Right now that only earns when somebody physically walks into a clinic. GlamRepairs lets
                you read skin from your own sitting room, on your own hours, and get paid for every consultation.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <a href="#apply" className={btnPrimary}>
                  Apply in 5 minutes
                </a>
                <span className="text-sm text-brand-accent">Reply within 3 working days</span>
              </div>
            </div>

            <div>
              <div className="overflow-hidden rounded-2xl border border-brand-lavender/60 bg-white shadow-[0_16px_46px_rgba(70,30,110,0.16)]">
                <div className="bg-brand-primary px-5 py-4 text-white">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-75">Monthly statement</p>
                  <p className="mt-1 font-serif text-lg italic">September 2026</p>
                </div>
                <div className="px-5 py-4">
                  {STATEMENT.map((r) => (
                    <div key={r.k} className="flex items-center justify-between gap-3 border-b border-dashed border-brand-lavender/70 py-2.5 text-[13.5px] text-brand-gray">
                      <span>
                        {r.k}
                        {r.d ? <span className="mt-0.5 block text-[11.5px] text-brand-accent">{r.d}</span> : null}
                      </span>
                      <b className="font-semibold text-brand-ink tabular-nums">{r.v}</b>
                    </div>
                  ))}
                  <div className="mt-2 flex items-baseline justify-between border-t-2 border-brand-ink pb-1 pt-4">
                    <span className="text-[13.5px] font-semibold">Transferred 5 October</span>
                    <b className="text-2xl font-semibold tracking-tight text-brand-primary">16 paid</b>
                  </div>
                </div>
                <div className="bg-brand-success/15 px-5 py-3 text-[13px] font-semibold text-brand-success-strong">
                  ✓ Paid to your bank account, with a transfer reference
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-brand-accent">
                Example statement. Every practitioner gets one, itemised, every month.
              </p>
            </div>
          </div>
        </div>

        {/* What it is */}
        <section className={section}>
          <div className={wrap}>
            <p className={kicker}>What GlamRepairs is</p>
            <h2 className={lead}>
              An online skin assessment service, <span className={em}>read by a person.</span>
            </h2>
            <p className={intro}>
              A client fills in a questionnaire about their skin, uploads three photographs, and pays. A qualified practitioner reads
              the whole thing and writes them a routine built around ingredients rather than brands. Clients on the full plan also
              have a 15 minute video call to talk it through.
            </p>
            <p className={intro}>
              That practitioner is you.{" "}
              <strong className="font-semibold text-brand-ink">There is no algorithm, no template and no AI writing the routine.</strong>{" "}
              That is the entire promise of the service, which is why the people doing it have to be properly qualified.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-brand-lavender/60 bg-brand-lavender/60 lg:grid-cols-4">
              {NUMBERS.map((n) => (
                <div key={n.b} className="bg-white p-5">
                  <b className="block text-[29px] font-semibold tracking-tight text-brand-primary">{n.b}</b>
                  <span className="mt-1.5 block text-[13px] leading-snug text-brand-gray">{n.s}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How you are paid. The earnings calculator showed the rate, and
            the rate is not published (Talha, 29 October 2026). */}
        <section className={`${section} bg-brand-purple-tint/40`}>
          <div className={wrap}>
            <p className={kicker}>How you are paid</p>
            <h2 className={lead}>
              Per consultation, <span className={em}>every month.</span>
            </h2>
            <p className={intro}>
              You are paid for every consultation you hold, including the ones where the client does not turn up. The rate is set out
              in your written agreement before you take your first client, and it does not change for consultations already booked.
            </p>
            <p className={intro}>
              Each month runs from the 1st to its last day, and it is paid by bank transfer by the 5th of the next month, with an
              itemised statement. Your dashboard shows what you have earned each month and what has been released.
            </p>
            <p className={intro}>
              <strong className="font-semibold text-brand-ink">Nothing is deducted from your fee.</strong> No joining fee and no
              charge for equipment or training. GlamRepairs is early and booking volume is still growing, so we promise the rate and
              the payment date, not a number of bookings.
            </p>
          </div>
        </section>

        {/* Hours */}
        <section className={section}>
          <div className={wrap}>
            <p className={kicker}>Your hours</p>
            <h2 className={lead}>
              You open the hours. <span className={em}>Nobody assigns them to you.</span>
            </h2>
            <p className={intro}>
              You set a weekly pattern in your dashboard and change it whenever you like. Clients can only book inside it, and only 24
              hours ahead, so nothing lands on you at short notice. Block a week off for a wedding and no slots appear.
            </p>
            <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-7">
              {WEEK.map((d) => (
                <div
                  key={d.d}
                  className={`rounded-xl border p-3 text-center ${d.on ? "border-brand-lavender bg-brand-purple-soft" : "border-brand-lavender/60 bg-white"}`}
                >
                  <p className="text-[11px] font-bold tracking-wider text-brand-accent">{d.d}</p>
                  <p className={`mt-1.5 text-xs leading-snug ${d.on ? "font-semibold text-brand-primary" : "text-brand-gray"}`}>{d.s}</p>
                </div>
              ))}
            </div>
            <p className={`${intro} mt-5`}>
              A common pattern: two weekday evenings and a Saturday morning. Nine hours open, which with a five minute gap between calls
              is up to <strong className="font-semibold text-brand-ink">27 consultations a week</strong> if every slot filled. Most do
              not, and you can set your own daily limit so a busy week never runs away from you.
            </p>
          </div>
        </section>

        {/* The work */}
        <section className={`${section} bg-brand-purple-tint/40`}>
          <div className={wrap}>
            <p className={kicker}>What the work looks like</p>
            <h2 className={lead}>
              Everything happens in <span className={em}>one dashboard.</span>
            </h2>
            <div className="mt-8 grid items-start gap-8 lg:grid-cols-2">
              <div className="overflow-hidden rounded-2xl border border-brand-lavender/60 bg-white shadow-[0_10px_34px_rgba(60,30,90,0.09)]" aria-label="Example of the practitioner dashboard">
                <div className="flex items-center gap-2 border-b border-brand-lavender/60 bg-brand-purple-tint px-4 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-brand-lavender" />
                  <span className="h-2.5 w-2.5 rounded-full bg-brand-lavender" />
                  <span className="h-2.5 w-2.5 rounded-full bg-brand-lavender" />
                  <span className="ml-2 text-xs text-brand-accent">GlamRepairs, your day</span>
                </div>
                <div className="p-5">
                  <p className="text-base font-semibold">Thursday 15 October</p>
                  <p className="mb-4 text-[12.5px] text-brand-accent">3 consultations booked, 1 slot open</p>
                  {DAY.map((a) => (
                    <div key={a.t} className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-brand-lavender/60 px-3.5 py-3">
                      <span className="w-[72px] text-[14.5px] font-semibold tabular-nums">{a.t}</span>
                      <span className="flex-1 text-[13.5px] text-brand-gray">{a.w}</span>
                      <span className="rounded-lg bg-brand-primary px-3 py-2 text-[13px] font-semibold text-white">Join</span>
                    </div>
                  ))}
                  <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-brand-lavender/60 px-3.5 py-3 opacity-50">
                    <span className="w-[72px] text-[14.5px] font-semibold tabular-nums">7:20 pm</span>
                    <span className="flex-1 text-[13.5px] text-brand-gray">Open</span>
                  </div>
                  <div className="mt-3 rounded-xl border border-brand-lavender/60 bg-brand-cream-card px-4 py-3 text-[13px] leading-relaxed text-brand-ink">
                    <strong className="font-semibold">1 consultation note outstanding</strong> from Tuesday. Its fee is held until the note is
                    submitted. It takes about two minutes.
                  </div>
                </div>
              </div>
              <div>
                <p className={`${intro} mt-0`}>
                  <strong className="font-semibold text-brand-ink">Before the call.</strong> You open the client&apos;s questionnaire and
                  photographs. You know what they are worried about before they say a word, which is why 15 minutes is enough.
                </p>
                <p className={intro}>
                  <strong className="font-semibold text-brand-ink">The call.</strong> A video link opens in your browser. Nothing to
                  install and nothing to sign in to. A fresh, private link for every consultation, which stops working afterwards.
                </p>
                <p className={intro}>
                  <strong className="font-semibold text-brand-ink">Afterwards.</strong> You fill in a short note: what they came with,
                  what you observed, what you advised. Five fields, about two minutes.{" "}
                  <strong className="font-semibold text-brand-ink">Submitting the note is what releases your fee</strong>, so it
                  never gets forgotten and nobody has to chase you.
                </p>
                <p className={intro}>
                  There is also a box for the thing that matters most:{" "}
                  <strong className="font-semibold text-brand-ink">
                    if you see something that should be looked at by a doctor, you tick it and say so.
                  </strong>{" "}
                  We do not diagnose. Saying &ldquo;please see a doctor&rdquo; is always the right answer, and we would rather you used it
                  too often than too rarely.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison */}
        <section className={section}>
          <div className={wrap}>
            <p className={kicker}>Why this suits people who already work in clinics</p>
            <h2 className={lead}>
              The skill is the same. <span className={em}>The constraints are not.</span>
            </h2>
            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-[14.5px]">
                <thead>
                  <tr className="text-left text-xs font-bold uppercase tracking-wider">
                    <th className="border-b border-brand-lavender/60 px-4 py-3 text-brand-accent">
                      <span className="sr-only">Compared</span>
                    </th>
                    <th className="border-b border-brand-lavender/60 px-4 py-3 text-brand-accent">Clinic work</th>
                    <th className="border-b border-brand-lavender/60 px-4 py-3 text-brand-primary">GlamRepairs</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE.map(([k, a, b]) => (
                    <tr key={k}>
                      <td className="w-[30%] border-b border-brand-lavender/60 px-4 py-3.5 text-brand-gray">{k}</td>
                      <td className="border-b border-brand-lavender/60 px-4 py-3.5">{a}</td>
                      <td className="border-b border-brand-lavender/60 bg-brand-purple-soft px-4 py-3.5 font-semibold">{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={`${intro} mt-6`}>
              This is not instead of clinic work.{" "}
              <strong className="font-semibold text-brand-ink">It is not exclusive and most practitioners will keep both.</strong> It is
              the evenings that currently earn nothing.
            </p>
          </div>
        </section>

        {/* Who we take */}
        <section className={`${section} bg-brand-cream-card`}>
          <div className={wrap}>
            <p className={kicker}>Who we take</p>
            <h2 className={lead}>
              We are selective, and it is <span className={em}>fairer to say so now.</span>
            </h2>
            <p className={intro}>
              Every new practitioner&apos;s{" "}
              <strong className="font-semibold text-brand-ink">first five assessments are read by Ayma Arif before they go to the client</strong>.
              If the work is good the review stops and you carry on independently. Nobody is paid less during that period.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-brand-lavender/60 bg-white p-6">
                <h3 className="font-serif text-lg italic text-brand-primary">You will need</h3>
                <ul className="mt-3 text-[14.5px] leading-relaxed text-brand-gray">
                  {NEED.map((x) => (
                    <li key={x} className="flex gap-3 py-2">
                      <span aria-hidden className="font-bold text-brand-success-strong">✓</span>
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-brand-lavender/40 bg-brand-purple-tint/50 p-6">
                <h3 className="font-serif text-lg italic text-brand-gray">You will not need</h3>
                <ul className="mt-3 text-[14.5px] leading-relaxed text-brand-gray">
                  {NOT_NEED.map((x) => (
                    <li key={x} className="flex gap-3 py-2">
                      <span aria-hidden className="font-bold text-brand-gray/60">×</span>
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Who runs it */}
        <section className={section}>
          <div className={wrap}>
            <p className={kicker}>Who you would be working with</p>
            <h2 className={lead}>
              Two people, <span className={em}>both named.</span>
            </h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="flex gap-4 rounded-2xl border border-brand-lavender/60 bg-white p-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/ayma-480.webp" alt="Ayma Arif" width={62} height={62} className="h-[62px] w-[62px] shrink-0 rounded-xl object-cover" />
                <div>
                  <p className="text-base font-semibold">Ayma Arif</p>
                  <p className="mt-0.5 text-[13px] font-semibold text-brand-primary">Certified Aesthetics Practitioner</p>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-brand-gray">
                    BS Cosmetology &amp; Dermatology Science, attested by the Higher Education Commission. Member of the International
                    Dermoscopy Society. Five years of practice in aesthetic clinics in Lahore. She reads the first five assessments of
                    every new practitioner.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 rounded-2xl border border-brand-lavender/60 bg-white p-5">
                <span
                  aria-hidden
                  className="flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-xl bg-brand-primary font-serif text-xl italic text-white"
                >
                  MT
                </span>
                <div>
                  <p className="text-base font-semibold">Muhammad Talha</p>
                  <p className="mt-0.5 text-[13px] font-semibold text-brand-primary">Managing Director</p>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-brand-gray">
                    Runs the platform alongside Ayma. Payments are made from his account, and he is the person who answers if something
                    goes wrong with yours.
                  </p>
                </div>
              </div>
            </div>
            <blockquote className="mt-8 rounded-r-2xl border-l-[3px] border-brand-primary bg-white px-6 py-6 sm:px-8">
              <p className="font-serif text-lg italic leading-relaxed sm:text-[19px]">
                &ldquo;I spent five years telling people the same things across a clinic desk. The advice was never the problem. Reaching
                them was. This is the same work, for people I could never have seen.&rdquo;
              </p>
              <cite className="mt-3 block text-[13.5px] not-italic text-brand-accent">Ayma Arif, co-founder</cite>
            </blockquote>
          </div>
        </section>

        {/* Apply */}
        <section id="apply" className={`${section} scroll-mt-16 bg-brand-purple-tint/40`}>
          <div className={wrap}>
            <p className={kicker}>Applying</p>
            <h2 className={lead}>
              Five short steps. <span className={em}>You can stop and come back.</span>
            </h2>
            <ol className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {STEPS.map((s, i) => (
                <li key={s.t} className="rounded-xl border border-brand-lavender/60 bg-white p-4">
                  <span className="flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-brand-primary text-[13px] font-bold text-white">
                    {i + 1}
                  </span>
                  <h3 className="mt-3 text-[14.5px] font-semibold leading-snug">{s.t}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-brand-gray">{s.d}</p>
                  <p className="mt-2 text-[11.5px] font-semibold text-brand-accent">{s.m}</p>
                </li>
              ))}
            </ol>
            <p className={`${intro} mt-6`}>
              Your progress saves after every step, so you can close the page while you find your certificate. We reply within{" "}
              <strong className="font-semibold text-brand-ink">three working days</strong>, either to approve you, to ask for one or two
              things, or to say no. <strong className="font-semibold text-brand-ink">You will always get a reason.</strong>
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2">
              <Link href={APPLY} className={btnPrimary}>
                Start your application
              </Link>
              <p className="text-sm leading-relaxed text-brand-gray">
                A question first?{" "}
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center text-brand-primary underline underline-offset-2">
                  WhatsApp {PRACTITIONER_WHATSAPP.display}
                </a>
                <span className="block text-xs">{PRACTITIONER_WHATSAPP.hours}</span>
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className={section}>
          <div className={wrap}>
            <p className={kicker}>Questions</p>
            <h2 className={lead}>The things people ask us.</h2>
            <div className="mt-6 divide-y divide-brand-lavender/60">
              {FAQ.map((x) => (
                <div key={x.q} className="py-4">
                  <h3 className="text-base font-semibold">
                    {x.q}
                    {x.flag ? (
                      <span className="ml-2 inline-block rounded-md bg-brand-success/15 px-2 py-0.5 align-[2px] text-[11px] font-bold text-brand-success-strong">
                        {x.flag}
                      </span>
                    ) : null}
                  </h3>
                  <p className="mt-1.5 max-w-[74ch] text-[14.5px] leading-relaxed text-brand-gray">{x.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final */}
        <section className="bg-brand-primary py-14 text-center text-white sm:py-16">
          <div className={wrap}>
            <h2 className="text-[27px] font-semibold tracking-tight sm:text-[33px]">
              Your evenings currently <span className="font-serif font-medium italic text-brand-lavender">earn nothing.</span>
            </h2>
            <p className="mx-auto mb-7 mt-3 max-w-[52ch] text-base text-white/85">
              Five minutes to apply. A reply within three working days. No fee, no exclusivity, and no obligation if you change your
              mind.
            </p>
            <Link href={APPLY} className="inline-flex min-h-12 items-center rounded-xl bg-white px-9 text-base font-semibold text-brand-primary">
              Start your application
            </Link>
            <p className="mt-5 text-[13px] text-white/75">
              Questions first?{" "}
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center underline underline-offset-2">
                WhatsApp {PRACTITIONER_WHATSAPP.display}
              </a>
              , {PRACTITIONER_WHATSAPP.hours}.
            </p>
          </div>
        </section>
      </main>

      <footer className="py-8 text-[12.5px] leading-relaxed text-brand-accent">
        <div className={wrap}>
          GlamRepairs provides cosmetic skincare guidance. It does not diagnose or treat medical conditions. Practitioners work
          independently and are not employees of GlamRepairs. Booking volume is not
          guaranteed.
        </div>
      </footer>
    </div>
  );
}
