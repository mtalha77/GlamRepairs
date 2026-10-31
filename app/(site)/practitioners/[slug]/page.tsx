import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import ProfileSlots from "@/components/practitioners/ProfileSlots";
import JsonLd from "@/components/seo/JsonLd";
import { countryName, timezoneLabel } from "@/lib/countries/timezones";
import { firstName, RECOMMENDED_SLUG, showRecommendedBadge } from "@/lib/practitioners/card";
import {
  directoryIsOpen,
  getPublicPractitioner,
  listPublicPractitioners,
  nextOpenSlots,
  visitorPrice,
} from "@/lib/practitioners/directory";
import { getPlanSettings } from "@/lib/plans/planSettings";
import { getServerPricingRegion } from "@/lib/pricing/geo";
import { REVIEWS } from "@/lib/reviews";
import { AUTHORS } from "@/lib/seo/authors";
import { breadcrumbSchema, graph, practitionerPersonSchema } from "@/lib/seo/schema";
import { canonicalOg, CREDENTIALS, credentialStatus } from "@/lib/seo/site";

/**
 * /practitioners/[slug]: the full profile (Handover 63 Part 2, laid out to
 * the profile design of 30 October 2026). It answers one question, should
 * this person read my skin, in nine parts: hero, their own words,
 * credentials with reference numbers, what they read most, what they will
 * not do, how it works, reviews, languages and hours, and the booking rail.
 *
 * Every claim is either the practitioner's own (from their profile row) or
 * the site's stated terms. Nothing illustrative from the design survives:
 * the turnaround is the FAQ's 24 hours, the revision window is the Terms'
 * 14 days, the slots are their real open times, and a part with nothing
 * true to say is left out rather than filled.
 *
 * Indexed only while the directory is open (three or more practitioners),
 * because below that there is no directory to link back to. Below it the
 * page still renders, unindexed, so a practitioner's own link to their
 * clients (/with/[slug]) has somewhere to land.
 */

type Props = { params: Promise<{ slug: string }> };

/** The owner, whose credentials are the site's published set. Also the recommended practitioner. */
const OWNER_SLUG = RECOMMENDED_SLUG;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [found, open] = await Promise.all([getPublicPractitioner(slug, null), directoryIsOpen()]);
  if (!found) return {};
  const p = found.card;
  const title = `${p.name}, ${p.role}${p.countryName ? ` in ${p.countryName}` : ""}`;
  const description =
    `${p.name} reads skin photographs online in ${p.languages.join(" and ") || "English"}.` +
    (p.focus.length ? ` Reads most often: ${p.focus.join(", ").toLowerCase()}.` : "") +
    (p.credentialTitle ? ` ${p.credentialTitle}.` : "");
  return {
    title,
    description,
    ...canonicalOg(`/practitioners/${p.slug}`, { type: "profile", title, description }),
    ...(open ? {} : { robots: { index: false, follow: true } }),
  };
}

function Section({ kicker, title, children }: { kicker: string; title: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-11">
      <h2 className="text-[12px] font-bold uppercase tracking-[0.14em] text-brand-primary">{kicker}</h2>
      <p className="mt-2.5 text-[23px] font-semibold leading-tight tracking-[-0.6px] text-brand-ink sm:text-[27px]">{title}</p>
      {children}
    </section>
  );
}

const Em = ({ children }: { children: ReactNode }) => (
  <span className="font-serif font-medium italic text-brand-primary">{children}</span>
);

function Tick() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="mt-1 h-3.5 w-3.5 shrink-0 text-brand-success-strong">
      <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type CredRow = { label: string; title: string; detail?: string; reference?: string; status?: string };

export default async function PractitionerProfilePage({ params }: Props) {
  const { slug } = await params;
  const region = await getServerPricingRegion();
  const price = visitorPrice(region);
  const [found, open, plans] = await Promise.all([getPublicPractitioner(slug, price), directoryIsOpen(), getPlanSettings()]);
  if (!found) notFound();
  const [slots, all] = await Promise.all([nextOpenSlots(found.id), open ? listPublicPractitioners(price) : Promise.resolve([])]);

  const p = found.card;
  const first = firstName(p.name);
  const owner = p.slug === OWNER_SLUG;
  const plan = plans.transform;
  const others = all.filter((o) => o.slug !== p.slug);
  const chooseHref = `/onboarding?practitioner=${encodeURIComponent(p.slug)}`;

  const stats = [
    p.years != null ? { value: String(p.years), label: "Years practising" } : null,
    p.reads != null ? { value: `${p.reads.toLocaleString("en-GB")}+`, label: "Skins read" } : null,
    p.rating != null ? { value: p.rating.toFixed(1), label: "Rating" } : null,
  ].filter((s): s is { value: string; label: string } => s !== null);

  // The owner's credentials are the site's published, checkable set. Anyone
  // else shows what their own approved profile states, and nothing more.
  const creds: CredRow[] = owner
    ? [
        ...CREDENTIALS.map((c) => ({
          label: c.kind === "degree" ? "Qualification" : c.kind === "membership" ? "Membership" : "Further study",
          title: c.name,
          detail: c.kind === "membership" ? undefined : c.issuer,
          reference: c.reference ? `${c.referenceLabel ?? (c.kind === "membership" ? "Membership No." : "Ref.")} ${c.reference}` : undefined,
          status: c.reference ? credentialStatus(c.kind) : undefined,
        })),
        ...(AUTHORS[OWNER_SLUG]?.experience
          ? [{ label: "Practice", title: AUTHORS[OWNER_SLUG].experience as string, detail: "Face to face assessment before working remotely" }]
          : []),
      ]
    : p.credentialTitle
      ? [{ label: "Qualification", title: p.credentialTitle, reference: p.credentialRef ?? undefined, status: found.degreeVerified ? "Verified" : undefined }]
      : [];

  const reviews = owner ? REVIEWS.slice(0, 3) : [];
  const country = p.countryName ?? (p.countryCode ? countryName(p.countryCode) : null);
  const zone = found.timezone ? timezoneLabel(found.timezone) : null;

  const includes = [
    "Written assessment, yours to keep",
    plan.includesVideoCall ? `${plan.videoMinutes ? `${plan.videoMinutes}-minute v` : "V"}ideo call with ${first}` : null,
    plan.supportDays ? `${plan.supportDays} days of follow-up questions` : null,
    "Revised free if it is not working, within 14 days",
  ].filter((x): x is string => Boolean(x));

  const pill = "rounded-full border border-white/25 bg-white/15 px-3.5 py-[7px] text-[13px] backdrop-blur-md";
  const okPill = "rounded-full border border-brand-success/40 bg-brand-success/20 px-3.5 py-[7px] text-[13px] text-white";

  return (
    <>
      <JsonLd
        data={graph(
          practitionerPersonSchema({ ...p, description: found.bio }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Practitioners", path: "/practitioners" },
            { name: p.name, path: `/practitioners/${p.slug}` },
          ]),
        )}
      />

      {/* Hero */}
      <div className="relative overflow-hidden bg-brand-primary text-white">
        <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-brand-ink/75 via-brand-ink/35 to-transparent" />
        <div aria-hidden className="absolute -right-[120px] -top-[120px] h-[420px] w-[420px] rounded-full bg-white/[0.06]" />
        <div className="relative mx-auto flex max-w-[1120px] flex-wrap items-end gap-6 px-4 pb-[30px] pt-[34px] sm:px-6 lg:gap-[38px] lg:pb-10 lg:pt-[46px]">
          <div className="relative h-[130px] w-[130px] shrink-0 overflow-hidden rounded-[26px] border-4 border-white/90 bg-brand-lavender shadow-2xl lg:h-[190px] lg:w-[190px]">
            {p.photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- same source and handling as the card portrait
              <img src={p.photo} alt={p.name} className="h-full w-full object-cover object-[center_20%]" />
            ) : (
              <span className="flex h-full w-full items-center justify-center font-serif text-5xl italic text-brand-primary">{p.initials}</span>
            )}
          </div>
          <div className="min-w-[260px] flex-1">
            <nav aria-label="Breadcrumb" className="mb-3.5 text-[12.5px] text-white/70">
              {open ? (
                <>
                  <Link href="/practitioners" className="hover:text-white">
                    Practitioners
                  </Link>
                  <span aria-hidden> &nbsp;›&nbsp; </span>
                </>
              ) : (
                <>
                  <Link href="/" className="hover:text-white">
                    Glam Repairs
                  </Link>
                  <span aria-hidden> &nbsp;›&nbsp; </span>
                </>
              )}
              {p.name}
            </nav>
            <h1 className="text-[33px] font-bold leading-[1.08] tracking-[-0.8px] lg:text-[43px] lg:tracking-[-1.2px]">{p.name}</h1>
            <p className="mt-[7px] font-serif text-[19px] italic text-white/85">{p.role}</p>
            <div className="mt-[18px] flex flex-wrap gap-[9px]">
              {p.recommended && showRecommendedBadge(all.length) ? <span className="rounded-full bg-white px-3.5 py-[7px] text-[13px] font-semibold text-brand-primary">Recommended</span> : null}
              {country ? <span className={pill}>{country}</span> : null}
              {p.languages.length ? <span className={pill}>{p.languages.join(", ")}</span> : null}
              {found.degreeVerified ? (
                <span className={okPill}>Degree checked by Glam Repairs</span>
              ) : creds.some((c) => c.reference) ? (
                <span className={okPill}>Reference numbers published</span>
              ) : null}
            </div>
            {stats.length ? (
              <div className="mt-6 flex max-w-[470px] overflow-hidden rounded-[14px] border border-white/20 bg-white/[0.07]">
                {stats.map((s) => (
                  <div key={s.label} className="flex-1 border-r border-white/[0.17] px-2.5 py-3.5 text-center last:border-r-0">
                    <b className="block text-[25px] font-bold tabular-nums tracking-[-0.6px]">{s.value}</b>
                    <span className="mt-[3px] block text-[10px] font-semibold uppercase tracking-[0.1em] text-white/70">{s.label}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1120px] items-start gap-0 px-4 pb-28 sm:px-6 lg:grid-cols-[1fr_352px] lg:gap-[50px] lg:pb-[70px]">
        <div className="min-w-0 pt-11">
          {found.story.length ? (
            <Section kicker={`In ${first}'s words`} title={<>Why a photograph is <Em>readable</Em></>}>
              {found.story.map((para, i) => (
                <p
                  key={i}
                  className={i === 0 ? "mt-4 text-[17px] leading-[1.68] text-brand-ink" : "mt-4 text-[15.5px] leading-relaxed text-brand-gray"}
                >
                  {para}
                </p>
              ))}
            </Section>
          ) : found.bio ? (
            <Section kicker={`About ${first}`} title={<>In {first}&apos;s <Em>own words</Em></>}>
              <p className="mt-4 text-[17px] leading-[1.68] text-brand-ink">{found.bio}</p>
            </Section>
          ) : null}

          {creds.length ? (
            <Section kicker="Credentials" title={<>Every number here is <Em>yours to check.</Em></>}>
              <p className="mt-3 text-[15.5px] leading-relaxed text-brand-gray">
                We publish reference numbers rather than asking you to take our word for it. If you want to check any of this before
                you pay, you can{owner ? (
                  <>
                    , and{" "}
                    <Link href="/credentials" className="font-semibold text-brand-primary underline underline-offset-2">
                      the credentials page
                    </Link>{" "}
                    says how
                  </>
                ) : null}
                .
              </p>
              <div className="mt-[18px] overflow-hidden rounded-2xl border border-brand-lavender/70">
                {creds.map((c) => (
                  <div
                    key={c.title}
                    className="flex flex-col gap-1 border-b border-brand-lavender/70 px-5 py-4 last:border-b-0 odd:bg-brand-surface-alt sm:flex-row sm:gap-4"
                  >
                    <div className="shrink-0 pt-[3px] text-[11px] font-bold uppercase tracking-[0.09em] text-brand-gray/70 sm:w-[146px]">
                      {c.label}
                    </div>
                    <div className="min-w-0 flex-1 text-[14.5px] text-brand-gray">
                      <b className="block font-semibold text-brand-ink">{c.title}</b>
                      {c.detail}
                      {c.reference || c.status ? (
                        <span className="mt-1.5 flex flex-wrap items-center gap-2">
                          {c.reference ? (
                            <span className="break-all rounded-md bg-brand-success/10 px-2.5 py-[3px] font-mono text-[12px] text-brand-success-strong">
                              {c.reference}
                            </span>
                          ) : null}
                          {c.status ? (
                            <span className="rounded-full bg-brand-success/10 px-2.5 py-[3px] text-[11px] font-bold text-brand-success-strong">
                              {c.status}
                            </span>
                          ) : null}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {found.focusNotes.length ? (
            <Section kicker="Reads most often" title={<>What {first} sees <Em>every week.</Em></>}>
              <div className="mt-[18px] grid gap-3.5 sm:grid-cols-[repeat(auto-fit,minmax(248px,1fr))]">
                {found.focusNotes.map((f) => (
                  <div key={f.area} className="rounded-[14px] border border-brand-lavender/70 bg-white px-[19px] py-[18px]">
                    <h3 className="font-serif text-[15.5px] font-semibold italic text-brand-primary">{f.area}</h3>
                    {f.note ? <p className="mt-[7px] text-[13.5px] leading-relaxed text-brand-gray">{f.note}</p> : null}
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          <Section kicker="Boundaries" title={<>What {first} <Em>will not</Em> do.</>}>
            <div className="mt-[18px] rounded-2xl border border-brand-cream bg-brand-cream-card px-[26px] py-6">
              <h3 className="font-serif text-[17px] font-semibold italic text-brand-ink">This is cosmetic guidance, not medical care.</h3>
              <ul className="mt-2.5 list-disc space-y-1.5 pl-5 text-[14.5px] text-brand-gray">
                <li>No diagnosis, no prescription, and no treatment of medical conditions</li>
                <li>
                  Anything painful, spreading or bleeding, or a mole that has changed shape or colour, is referred to a doctor and your
                  fee refunded
                </li>
                <li>No brand recommendations, and no commission from anyone. Ingredients and strengths only</li>
                <li>If a photograph cannot be read properly, {first} will ask for another rather than guess</li>
              </ul>
            </div>
          </Section>

          <Section kicker={`How it works with ${first}`} title={<>Four steps, <Em>written within a day.</Em></>}>
            <ol className="mt-[18px] grid gap-3">
              {[
                ["You answer the questionnaire", "Your history, what you are using now, and what has already failed. The failures are the useful part."],
                [
                  `${plan.photosRequired === 1 ? "One photograph" : `${["", "One", "Two", "Three", "Four", "Five", "Six"][plan.photosRequired] ?? plan.photosRequired} photographs`}`,
                  "Daylight, no makeup, no filter. The uploader checks focus and brightness as you go and tells you straight away if one will not read.",
                ],
                [
                  `${first} writes your assessment`,
                  "Personally, not generated, and sent within 24 hours of your payment being confirmed. It names ingredients, strengths and the order to use them in, with a timeline for what should change and when.",
                ],
                [
                  plan.includesVideoCall ? "A video call, then follow-up" : "Then follow-up",
                  `${plan.includesVideoCall ? "Go through it together, then " : ""}${plan.supportDays ?? 30} days to come back with questions. If it is not working, tell us within 14 days and it is revised at no cost.`,
                ],
              ].map(([title, body], i) => (
                <li key={title} className="flex gap-[15px] rounded-[14px] border border-brand-lavender/70 px-[18px] py-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-brand-purple-soft text-[13px] font-bold text-brand-primary">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="mt-0.5 text-[15px] font-semibold text-brand-ink">{title}</h3>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-brand-gray">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Section>

          {reviews.length ? (
            <Section kicker={`${first}'s clients`} title={<>What people <Em>say.</Em></>}>
              <div className="mt-[18px] grid gap-3">
                {reviews.map((r) => (
                  <figure key={r.name} className="rounded-xl border border-brand-cream bg-brand-cream-light px-[19px] py-[17px]">
                    <blockquote className="font-serif text-[14.5px] italic leading-[1.65] text-brand-gray">&ldquo;{r.quote}&rdquo;</blockquote>
                    <figcaption className="mt-[11px] text-[11.5px] text-brand-gray/80">
                      {r.name}, {countryName(r.country)}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </Section>
          ) : null}

          {p.languages.length || zone ? (
            <Section kicker="Languages and hours" title={<>When {first} is <Em>awake.</Em></>}>
              {p.languages.length ? (
                <div className="mt-3.5 flex flex-wrap gap-2">
                  {p.languages.map((l) => (
                    <span key={l} className="rounded-full bg-brand-purple-soft px-3.5 py-[7px] text-[13.5px] font-semibold text-brand-primary">
                      {l}
                    </span>
                  ))}
                </div>
              ) : null}
              <p className="mt-4 text-[15.5px] leading-relaxed text-brand-gray">
                {country ? `Based in ${country}${zone ? `, on ${zone} time` : ""}. ` : zone ? `On ${zone} time. ` : ""}
                {first} reads photographs for clients anywhere; the timezone affects when your video call can be, not whether {first}{" "}
                can help you.
              </p>
            </Section>
          ) : null}

          {others.length ? (
            <section className="mb-11">
              <h2 className="text-[12px] font-bold uppercase tracking-[0.14em] text-brand-primary">Other practitioners</h2>
              <ul className="mt-4 flex flex-wrap gap-3">
                {others.map((o) => (
                  <li key={o.slug}>
                    <Link
                      href={`/practitioners/${o.slug}`}
                      className="inline-block rounded-full border border-brand-lavender bg-white px-4 py-2 text-[14px] font-semibold text-brand-primary hover:bg-brand-purple-soft"
                    >
                      {o.name}
                      {o.countryName ? <span className="font-normal text-brand-gray">, {o.countryName}</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        {/* Booking rail: sticky beside the content on desktop, in the flow on mobile, with a fixed bar below. */}
        <aside className="mt-2 lg:sticky lg:top-6 lg:-mt-14">
          <div className="overflow-hidden rounded-[18px] border border-brand-lavender/70 bg-white shadow-2xl">
            <div className="px-[22px] pb-[18px] pt-[22px]">
              {price ? (
                <p className="flex flex-wrap items-baseline gap-[9px]">
                  <b className="text-[34px] font-bold tracking-[-1px] text-brand-ink">{price}</b>
                  <span className="text-[13.5px] text-brand-gray/80">once, not a subscription</span>
                </p>
              ) : null}
              <ul className="mt-4 text-[13.5px] text-brand-gray">
                {includes.map((x) => (
                  <li key={x} className="flex gap-[9px] py-[5px]">
                    <Tick />
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
              {plan.includesVideoCall ? <ProfileSlots slots={slots} /> : null}
              <Link
                href={chooseHref}
                className="mt-[18px] block w-full rounded-[11px] bg-brand-primary p-[15px] text-center text-[15.5px] font-semibold text-white transition hover:bg-brand-primary-dark"
              >
                Choose {first} →
              </Link>
              {open ? (
                <Link
                  href="/practitioners"
                  className="mt-[9px] block w-full rounded-[11px] border border-brand-lavender/70 bg-white p-[13px] text-center text-[14.5px] font-semibold text-brand-primary transition hover:bg-brand-purple-soft"
                >
                  Compare practitioners
                </Link>
              ) : null}
            </div>
            <p className="border-t border-brand-lavender/70 bg-brand-surface-alt px-[22px] py-3.5 text-[12.5px] text-brand-gray/80">
              Nothing is charged until you reach the payment step.
            </p>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-brand-lavender/70 bg-white/95 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="min-w-0 flex-1">
          {price ? <b className="block text-[18px] font-bold leading-tight text-brand-ink">{price}</b> : null}
          <span className="block truncate text-[12px] text-brand-gray/80">once, with {first}</span>
        </div>
        <Link href={chooseHref} className="shrink-0 rounded-[11px] bg-brand-primary px-5 py-3 text-[15px] font-semibold text-white">
          Choose {first} →
        </Link>
      </div>
    </>
  );
}
