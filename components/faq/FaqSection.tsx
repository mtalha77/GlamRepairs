"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  FAQ_GROUP_LABEL,
  faqGroupsPresent,
  REVISION_DAYS,
  type FaqGroup,
  type FaqProofData,
  type ResolvedFaq,
} from "@/lib/faq";
import { getWhatsAppChatLink } from "@/lib/funnel/whatsapp";
import { SITE } from "@/lib/seo/site";

/**
 * The FAQ. HANDOVER-13 §4, rebuilt for HANDOVER-61 Part 3.
 *
 * ── Kept from before ─────────────────────────────────────────────────────
 * Every question is always in the DOM, filtered rows only `hidden`, because
 * the FAQPage schema marks all of them up and marking up content that is
 * not on the page is a structured data violation. Deep links (#how-to-pay)
 * still open and scroll to their row. Answers stay plain strings, with
 * `links` naming the substrings to link, so the schema text and the visible
 * text are identical.
 *
 * ── New ──────────────────────────────────────────────────────────────────
 * • Type to search across question, answer and `keywords`. Matches are
 *   wrapped in <mark> as React elements, never as an HTML string, so the
 *   page never parses text a visitor typed; the term is regex-escaped.
 *   "/" focuses the box, Escape clears it.
 * • Native <details>/<summary>, so it works without JavaScript and keyboard
 *   users get the behaviour free. `name` makes them exclusive where the
 *   browser supports it.
 * • An open answer lifts toward the reader (translateZ inside a perspective
 *   container) rather than growing a shadow. No transitions under
 *   prefers-reduced-motion.
 * • Proof blocks under the money answers, from live data passed in by the
 *   page: the fee and what it covers from plans_public, the follow-up
 *   timeline from the same plan. Without that data they are omitted.
 * • A search that finds nothing turns into an invitation to send that exact
 *   question on WhatsApp.
 */

type FilterValue = "all" | FaqGroup;

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function termWords(term: string) {
  return term.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
}

/** Text with each search word wrapped in <mark>. React escapes the rest. */
function highlight(text: string, words: string[]): ReactNode {
  if (!words.length) return text;
  const parts = text.split(new RegExp(`(${words.map(escapeRegExp).join("|")})`, "gi"));
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="rounded-sm bg-brand-lavender/70 px-0.5 text-brand-ink">
        {part}
      </mark>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

function renderAnswer(faq: ResolvedFaq, words: string[]) {
  if (!faq.links?.length) return highlight(faq.a, words);
  const pattern = faq.links.map((link) => escapeRegExp(link.text)).join("|");
  return faq.a.split(new RegExp(`(${pattern})`, "g")).map((part, index) => {
    const link = faq.links?.find((candidate) => candidate.text === part);
    if (!link) return <Fragment key={index}>{highlight(part, words)}</Fragment>;
    return (
      <Link
        key={index}
        href={link.href}
        className="font-medium text-brand-primary underline decoration-brand-lavender underline-offset-2 hover:decoration-brand-primary"
      >
        {highlight(part, words)}
      </Link>
    );
  });
}

function matches(faq: ResolvedFaq, words: string[]) {
  const haystack = [faq.q, faq.a, ...(faq.keywords ?? [])].join(" ").toLowerCase();
  return words.every((w) => haystack.includes(w));
}

function Receipt({ data }: { data: NonNullable<FaqProofData["receipt"]> }) {
  return (
    <div className="mt-4 max-w-[26rem] rounded-xl border border-dashed border-brand-lavender bg-white px-5 py-4 text-[0.8125rem] text-brand-gray">
      <p className="font-serif text-[0.9375rem] font-medium italic text-brand-primary">{data.planLabel}: what the fee covers</p>
      <ul className="mt-2.5 space-y-1.5">
        {data.lines.map((line) => (
          <li key={line} className="flex gap-2">
            <span aria-hidden className="text-brand-success">
              ✓
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex items-baseline justify-between border-t border-dashed border-brand-lavender pt-3 text-brand-ink">
        <span>Total, one payment</span>
        <span className="font-serif text-[1.0625rem] font-semibold tabular-nums text-brand-primary">{data.price}</span>
      </p>
    </div>
  );
}

function Timeline({ data }: { data: NonNullable<FaqProofData["timeline"]> }) {
  const steps = [
    { when: "Day 0", what: "Your report arrives" },
    { when: `Up to day ${REVISION_DAYS}`, what: "Not right for you? We revise it at no cost" },
    ...(data.checkIns
      ? [
          { when: "Week 2", what: "We check in on how it is going" },
          { when: "Week 4", what: "We check in again" },
        ]
      : []),
    ...(data.supportDays ? [{ when: `Days 1 to ${data.supportDays}`, what: "WhatsApp your practitioner with questions" }] : []),
  ];
  return (
    <ol className="mt-4 max-w-[30rem] border-l-2 border-brand-lavender pl-5 text-[0.8125rem]">
      {steps.map((step) => (
        <li key={step.when} className="relative pb-3 last:pb-0">
          <span aria-hidden className="absolute -left-[1.6rem] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-primary" />
          <span className="font-medium text-brand-ink">{step.when}</span>
          <span className="text-brand-gray">: {step.what}</span>
        </li>
      ))}
    </ol>
  );
}

export default function FaqSection({
  faqs,
  proofs,
  heading = "Frequently Asked",
  headingEmphasis = "Questions",
  subheading = "Straight answers to what people ask before they trust us with their skin.",
}: {
  faqs: ResolvedFaq[];
  proofs?: FaqProofData;
  heading?: string;
  headingEmphasis?: string;
  subheading?: string;
}) {
  const groups = useMemo(() => faqGroupsPresent(faqs), [faqs]);
  // Opens on the money questions: the ones that block a purchase.
  const [filter, setFilter] = useState<FilterValue>(() => groups[0] ?? "all");
  const [term, setTerm] = useState("");
  const words = useMemo(() => termWords(term), [term]);
  const searchRef = useRef<HTMLInputElement>(null);
  const rows = useRef(new Map<string, HTMLDetailsElement>());

  const visibleIds = useMemo(() => {
    if (words.length) return new Set(faqs.filter((f) => matches(f, words)).map((f) => f.id));
    return new Set(faqs.filter((f) => filter === "all" || f.group === filter).map((f) => f.id));
  }, [faqs, words, filter]);

  // "/" focuses the search, unless someone is already typing somewhere.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName))) return;
      event.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Deep links: read after mount (the server has no hash), and on hashchange.
  useEffect(() => {
    const openFromHash = () => {
      const id = window.location.hash.slice(1);
      const row = rows.current.get(id);
      if (!row) return;
      setTerm("");
      setFilter("all");
      row.open = true;
      requestAnimationFrame(() => row.scrollIntoView({ block: "center" }));
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);

  // While searching, open the best match so the highlighted answer shows.
  useEffect(() => {
    if (!words.length) return;
    const first = faqs.find((f) => visibleIds.has(f.id));
    const row = first ? rows.current.get(first.id) : null;
    if (row && !row.open) row.open = true;
  }, [words, visibleIds, faqs]);

  if (faqs.length === 0) return null;
  const noMatch = words.length > 0 && visibleIds.size === 0;
  // A. B. C. down whatever is showing, so the letters never skip.
  const letterOf = new Map(faqs.filter((f) => visibleIds.has(f.id)).map((f, i) => [f.id, String.fromCharCode(65 + (i % 26))]));

  return (
    <section className="gr-section-glow px-6 pb-[72px] pt-[60px]">
      {/* HANDOVER-61 §3d: a centred, narrow column. The narrowness is most
          of the calm. */}
      <div className="mx-auto max-w-[720px]">
        <header className="mb-9 text-center">
          <h2 className="font-sans text-[2.1rem] font-light leading-[1.1] tracking-[-0.03em] text-brand-ink sm:text-[2.75rem]">
            {heading} <em className="font-serif font-normal italic text-brand-primary">{headingEmphasis}</em>
          </h2>
          <p className="mx-auto mt-3 max-w-[50ch] font-sans text-[0.9375rem] leading-relaxed text-brand-gray">{subheading}</p>
        </header>

        <div className="relative mx-auto mb-4 max-w-[480px]">
          <label htmlFor="faq-search" className="sr-only">
            Search the questions
          </label>
          <input
            id="faq-search"
            ref={searchRef}
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setTerm("");
                e.currentTarget.blur();
              }
            }}
            placeholder="Search, for example refund, filter, photos"
            autoComplete="off"
            className="min-h-11 w-full rounded-full border border-brand-lavender/70 bg-white/80 px-5 pr-12 font-sans text-[0.875rem] text-brand-ink placeholder:text-brand-gray/60 focus:border-brand-accent focus:outline-none"
          />
          <kbd
            aria-hidden
            className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded border border-brand-lavender px-1.5 font-sans text-xs text-brand-gray sm:block"
          >
            /
          </kbd>
        </div>

        {groups.length > 1 && !words.length ? (
          <div role="group" aria-label="Filter questions by topic" className="mb-7 flex flex-wrap justify-center gap-1.5">
            {(["all", ...groups] as FilterValue[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                aria-pressed={filter === value}
                className={`min-h-11 rounded-full px-4 font-sans text-[0.8125rem] transition-colors motion-reduce:transition-none ${
                  filter === value
                    ? "bg-brand-primary text-white"
                    : "text-brand-gray hover:bg-brand-purple-soft hover:text-brand-primary"
                }`}
              >
                {value === "all" ? "All" : FAQ_GROUP_LABEL[value]}
              </button>
            ))}
          </div>
        ) : null}

        <p className="sr-only" aria-live="polite">
          {words.length ? `${visibleIds.size} ${visibleIds.size === 1 ? "question matches" : "questions match"}` : ""}
        </p>

        <div className="[perspective:1600px]">
          {faqs.map((faq) => {
            const proof =
              faq.proof === "receipt" && proofs?.receipt ? (
                <Receipt data={proofs.receipt} />
              ) : faq.proof === "timeline" && proofs?.timeline ? (
                <Timeline data={proofs.timeline} />
              ) : null;
            return (
              <details
                key={faq.id}
                id={faq.id}
                name="gr-faq"
                // Talha, 29 October 2026: nothing opens by itself. Every row
                // starts closed; a deep link or a search opens one.
                hidden={!visibleIds.has(faq.id)}
                ref={(node) => {
                  if (node) rows.current.set(faq.id, node);
                  else rows.current.delete(faq.id);
                }}
                style={{ scrollMarginTop: "6rem" }}
                /* At rest: flat, borderless, very light. Open: white, a
                   hairline border, lifted on a soft purple shadow. The
                   contrast between one raised card and a column of flat
                   ones is the whole design (HANDOVER-61 §3d). */
                className="group mb-[10px] rounded-2xl border border-transparent bg-brand-purple-soft/55 transition-[transform,background-color,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,0.75,0.28,1)] [transform-style:preserve-3d] open:border-brand-lavender/80 open:bg-white open:shadow-[0_24px_48px_-24px_color-mix(in_srgb,var(--color-brand-primary)_35%,transparent)] open:[transform:translateZ(34px)] motion-reduce:transition-none"
              >
                <summary className="flex min-h-[60px] cursor-pointer list-none items-start gap-4 px-6 py-5 font-sans text-[1rem] font-medium leading-[1.45] text-brand-ink [&::-webkit-details-marker]:hidden">
                  <span aria-hidden className="w-5 shrink-0 text-[0.9375rem] text-brand-gray/60 transition-colors group-open:text-brand-primary motion-reduce:transition-none">
                    {letterOf.get(faq.id)}.
                  </span>
                  <h3 className="flex-1 font-[inherit]">{highlight(faq.q, words)}</h3>
                  {/* A plus that becomes a minus: two 1.6px bars, the
                      vertical one fading as the whole mark turns 180deg. */}
                  <span
                    aria-hidden
                    className="relative mt-1 h-4 w-4 shrink-0 text-brand-gray transition-transform duration-300 group-open:rotate-180 group-open:text-brand-primary motion-reduce:transition-none"
                  >
                    <span className="absolute left-0 top-1/2 h-[1.6px] w-4 -translate-y-1/2 rounded-full bg-current" />
                    <span className="absolute left-1/2 top-0 h-4 w-[1.6px] -translate-x-1/2 rounded-full bg-current transition-opacity duration-300 group-open:opacity-0 motion-reduce:transition-none" />
                  </span>
                </summary>
                <div className="pb-6 pl-[3.75rem] pr-6">
                  <p className="max-w-[60ch] font-sans text-[0.9375rem] leading-[1.72] text-brand-gray">{renderAnswer(faq, words)}</p>
                  {proof}
                </div>
              </details>
            );
          })}
        </div>

        {noMatch ? (
          <div className="rounded-2xl border border-brand-lavender bg-white px-[26px] py-[22px]">
            <p className="font-serif text-[1.125rem] font-medium italic text-brand-primary">Ask us that directly</p>
            <p className="mt-1 font-sans text-[0.9375rem] text-brand-ink">
              Nothing here answers &ldquo;{term.trim()}&rdquo; yet. Send it to us on WhatsApp and a person will reply before you pay
              anything.
            </p>
            <a
              href={getWhatsAppChatLink(`Hi, a question before I book: ${term.trim()}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="gr-btn mt-4 inline-flex min-h-11 items-center rounded-full bg-brand-primary px-[22px] font-sans text-[0.8438rem] font-medium text-white hover:bg-brand-primary-dark"
            >
              Send this question on WhatsApp
            </a>
          </div>
        ) : (
          <div className="mt-[30px] flex flex-wrap items-center gap-[18px] rounded-2xl bg-brand-purple-soft px-[26px] py-[22px]">
            <p className="min-w-[220px] flex-1 font-sans text-[0.9375rem] text-brand-ink">
              <b className="mb-[3px] block font-serif text-[1.125rem] font-medium italic text-brand-primary">Still not sure?</b>
              Message us on WhatsApp and we&apos;ll answer before you pay anything.
            </p>
            <a
              href={`https://wa.me/${SITE.phone.digits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="gr-btn inline-flex min-h-11 items-center whitespace-nowrap rounded-full bg-brand-primary px-[22px] py-[11px] font-sans text-[0.8438rem] font-medium text-white hover:bg-brand-primary-dark"
            >
              WhatsApp us
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
