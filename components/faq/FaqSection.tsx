"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  FAQ_GROUP_LABEL,
  faqGroupsPresent,
  type FaqGroup,
  type ResolvedFaq,
} from "@/lib/faq";
import { SITE } from "@/lib/seo/site";

/**
 * HANDOVER-13 §4 — the FAQ, rebuilt.
 *
 * This section was the only one on the site ignoring the house style: flat
 * grey, bold black sans questions, a +/− glyph swap, every item openable at
 * once. Every other card here is a serif-italic heading on cream. That
 * mismatch is why it read as bolted on, and it sits at the exact moment
 * someone decides whether to pay.
 *
 * ── What was kept ────────────────────────────────────────────────────────
 * The `grid-rows-[0fr]` → `[1fr]` height animation, which is the correct
 * modern technique and animates to real content height without a max-height
 * guess. And the `links` splitter, which keeps an answer a plain string —
 * an FAQPage node has to emit that exact text, and structured data cannot
 * carry markup.
 *
 * ── What changed, and why each ───────────────────────────────────────────
 * • One item open at a time. Thirteen questions all expandable made a page
 *   that could not be scanned.
 * • Filter pills. Thirteen is past the point where a list is browsable, and
 *   someone stuck on payment can now jump straight to it.
 * • One icon rotating 45° rather than swapping + for −. Rotation reads as a
 *   single object moving; a glyph swap reads as a flicker.
 * • Deep links. Each row carries its slug as an id and a matching hash opens
 *   and scrolls to it, so support can answer with a URL
 *   (glamrepairs.com/pricing#how-to-pay) instead of retyping the answer.
 * • A closing CTA. The FAQ is the last stop before someone gives up; it
 *   should end with a way to ask, not a dead end.
 */

function renderAnswer(faq: ResolvedFaq) {
  if (!faq.links?.length) return faq.a;

  const pattern = faq.links
    .map((link) => link.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const parts = faq.a.split(new RegExp(`(${pattern})`, "g"));

  return parts.map((part, index) => {
    const link = faq.links?.find((candidate) => candidate.text === part);
    if (!link) return <Fragment key={index}>{part}</Fragment>;
    return (
      <Link
        key={index}
        href={link.href}
        className="font-medium text-brand-primary underline decoration-brand-lavender underline-offset-2 transition-colors hover:decoration-brand-primary"
      >
        {part}
      </Link>
    );
  });
}

type FilterValue = "all" | FaqGroup;

function PlusIcon({ open }: { open: boolean }) {
  // Two bars rather than a glyph, so the whole mark rotates as one object
  // instead of one character being swapped for another.
  return (
    <span
      aria-hidden
      className={`relative mt-0.5 h-[22px] w-[22px] shrink-0 transition-[transform,color] duration-[320ms] ease-[cubic-bezier(0.22,0.75,0.28,1)] motion-reduce:transition-none ${
        open ? "rotate-45 text-brand-primary" : "text-brand-accent"
      }`}
    >
      <span className="absolute left-0 top-[10px] h-[1.8px] w-[22px] rounded-sm bg-current" />
      <span className="absolute left-[10px] top-0 h-[22px] w-[1.8px] rounded-sm bg-current" />
    </span>
  );
}

export default function FaqSection({
  faqs,
  heading = "Questions,",
  headingEmphasis = "answered",
  subheading = "Everything people usually want to know before they start.",
}: {
  faqs: ResolvedFaq[];
  heading?: string;
  headingEmphasis?: string;
  subheading?: string;
}) {
  const groups = useMemo(() => faqGroupsPresent(faqs), [faqs]);

  /**
   * Opens on the first group rather than on "All".
   *
   * Thirteen expanded rows plus three group headings makes a section long
   * enough that the closing CTA — the whole point of ending the FAQ with a
   * way to ask — falls far below where anyone scrolls. Group order puts
   * money first, so the default lands on exactly the questions that block a
   * purchase, and "All" stays one click away.
   */
  const [filter, setFilter] = useState<FilterValue>(() => groups[0] ?? "all");
  const [openId, setOpenId] = useState<string | null>(
    () => faqs.find((faq) => faq.group === groups[0])?.id ?? faqs[0]?.id ?? null,
  );
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>());

  /** The rows the filter currently shows — drives keyboard navigation. */
  const visible = useMemo(
    () => (filter === "all" ? faqs : faqs.filter((f) => f.group === filter)),
    [faqs, filter],
  );

  /**
   * Deep links. Read after mount, not during render: the server has no URL
   * hash, so opening the hash item during render would produce markup the
   * client immediately disagrees with. `hashchange` is handled too, because
   * clicking a #how-to-pay link while already on the page fires no navigation.
   */
  useEffect(() => {
    const openFromHash = () => {
      const id = window.location.hash.slice(1);
      if (!id || !faqs.some((faq) => faq.id === id)) return;
      setFilter("all");
      setOpenId(id);
      // Wait a frame so the item is expanded before we scroll it into view.
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ block: "center" });
      });
    };

    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, [faqs]);

  /** Up/Down move between questions; Home/End jump to the ends. */
  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const keys = ["ArrowDown", "ArrowUp", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();

    const last = visible.length - 1;
    const next =
      event.key === "ArrowDown"
        ? index === last
          ? 0
          : index + 1
        : event.key === "ArrowUp"
          ? index === 0
            ? last
            : index - 1
          : event.key === "Home"
            ? 0
            : last;

    buttonRefs.current.get(visible[next].id)?.focus();
  };

  /**
   * Which rows start a new group, computed once rather than by mutating a
   * cursor while mapping. Reassigning across a render is exactly what the
   * React Compiler cannot reason about, and it caught this.
   */
  const groupStartIds = useMemo(() => {
    const ids = new Set<string>();
    let previous: FaqGroup | null = null;
    for (const faq of faqs) {
      if (faq.group !== previous) {
        ids.add(faq.id);
        previous = faq.group;
      }
    }
    return ids;
  }, [faqs]);

  if (faqs.length === 0) return null;

  return (
    <section className="bg-brand-cream-light px-6 pb-[72px] pt-[60px]">
      <div className="mx-auto max-w-[780px]">
        <header className="mb-[26px] text-center">
          <h2 className="font-serif text-[1.7rem] font-semibold leading-[1.18] tracking-[-0.015em] text-brand-ink sm:text-[2.1rem]">
            {heading} <em className="italic text-brand-primary">{headingEmphasis}</em>
          </h2>
          <p className="mt-2 font-sans text-[0.9375rem] text-brand-gray">
            {subheading}
          </p>
        </header>

        {/* Filter pills. Hidden below two groups — a filter that cannot
            narrow anything is just another thing to read past. */}
        {groups.length > 1 ? (
          <div
            role="group"
            aria-label="Filter questions by topic"
            className="mb-[26px] flex flex-wrap justify-center gap-2"
          >
            {(["all", ...groups] as FilterValue[]).map((value) => {
              const active = filter === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  aria-pressed={active}
                  className={`gr-btn rounded-full border px-4 py-2 font-sans text-[0.8125rem] font-medium ${
                    active
                      ? "border-brand-primary bg-brand-primary text-white"
                      : "border-brand-lavender bg-white text-brand-gray hover:border-brand-accent hover:text-brand-primary"
                  }`}
                >
                  {value === "all" ? "All" : FAQ_GROUP_LABEL[value]}
                </button>
              );
            })}
          </div>
        ) : null}

        {/* Every question is rendered, always. The filter sets `hidden`
            rather than dropping rows from the array, and that is not a
            stylistic choice: the FAQPage schema on this page marks up all of
            these questions, and marking up content absent from the DOM is a
            structured data violation. Hiding keeps the markup honest, keeps
            deep links to a filtered-out question working, and leaves the
            whole list readable with JavaScript disabled. */}
        <div>
          {faqs.map((faq) => {
            const isOpen = openId === faq.id;
            const isVisible = filter === "all" || faq.group === filter;
            // Keyboard order follows what is on screen, not the full array.
            const index = visible.findIndex((item) => item.id === faq.id);
            // Group headings only in the unfiltered view — inside a filter
            // every row shares one group, so the label says nothing.
            const showGroupLabel =
              filter === "all" && groups.length > 1 && groupStartIds.has(faq.id);

            return (
              <Fragment key={faq.id}>
                {showGroupLabel ? (
                  <p className="mb-2.5 mt-[22px] pl-1 font-sans text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-brand-accent first:mt-0">
                    {FAQ_GROUP_LABEL[faq.group]}
                  </p>
                ) : null}

                <div
                  id={faq.id}
                  hidden={!isVisible}
                  className={`mb-[9px] overflow-hidden rounded-2xl border transition-[background-color,border-color,box-shadow] duration-300 motion-reduce:transition-none ${
                    isOpen
                      ? "border-brand-lavender bg-white shadow-[0_2px_4px_rgba(102,45,145,0.04),0_10px_26px_-14px_rgba(102,45,145,0.2)]"
                      : "border-transparent bg-brand-cream-card hover:bg-brand-purple-soft"
                  }`}
                  // scroll-margin so a deep-linked row is not pinned under
                  // the sticky header when the browser jumps to it.
                  style={{ scrollMarginTop: "6rem" }}
                >
                  <h3>
                    <button
                      id={`${faq.id}-question`}
                      ref={(node) => {
                        if (node) buttonRefs.current.set(faq.id, node);
                        else buttonRefs.current.delete(faq.id);
                      }}
                      type="button"
                      onClick={() => setOpenId(isOpen ? null : faq.id)}
                      onKeyDown={(event) => onKeyDown(event, index)}
                      aria-expanded={isOpen}
                      aria-controls={`${faq.id}-answer`}
                      className={`flex min-h-[56px] w-full items-start justify-between gap-4 px-[22px] py-[18px] text-left font-serif text-[1rem] font-medium italic leading-[1.4] transition-colors duration-[280ms] motion-reduce:transition-none sm:text-[1.0625rem] ${
                        isOpen ? "text-brand-primary" : "text-brand-ink"
                      }`}
                    >
                      <span>{faq.q}</span>
                      <PlusIcon open={isOpen} />
                    </button>
                  </h3>

                  {/* grid-rows 0fr → 1fr: animates to the real content
                      height, with none of the max-height guesswork. */}
                  <div
                    id={`${faq.id}-answer`}
                    role="region"
                    aria-labelledby={`${faq.id}-question`}
                    className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                      isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p
                        className={`max-w-[60ch] px-[22px] pb-5 font-sans text-[0.9375rem] leading-[1.72] text-brand-gray transition-opacity duration-300 motion-reduce:transition-none ${
                          isOpen ? "opacity-100 delay-[60ms]" : "opacity-0"
                        }`}
                      >
                        {renderAnswer(faq)}
                      </p>
                    </div>
                  </div>
                </div>
              </Fragment>
            );
          })}
        </div>

        <div className="mt-[30px] flex flex-wrap items-center gap-[18px] rounded-2xl bg-brand-purple-soft px-[26px] py-[22px]">
          <p className="min-w-[220px] flex-1 font-sans text-[0.9375rem] text-brand-ink">
            <b className="mb-[3px] block font-serif text-[1.125rem] font-medium italic text-brand-primary">
              Still not sure?
            </b>
            Message us on WhatsApp and we&apos;ll answer before you pay anything.
          </p>
          <a
            href={`https://wa.me/${SITE.phone.digits}`}
            target="_blank"
            rel="noopener noreferrer"
            className="gr-btn whitespace-nowrap rounded-full bg-brand-primary px-[22px] py-[11px] font-sans text-[0.8438rem] font-medium text-white hover:bg-brand-primary-dark"
          >
            WhatsApp us
          </a>
        </div>
      </div>
    </section>
  );
}
