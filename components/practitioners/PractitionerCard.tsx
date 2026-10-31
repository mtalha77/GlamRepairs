import Link from "next/link";

import Portrait from "@/components/practitioners/Portrait";
import { cn } from "@/lib/cn";
import { availabilityLabel, firstName, type CardPractitioner } from "@/lib/practitioners/card";

/**
 * The practitioner card. Handover 61 Part 1 sets its order, which is the
 * order the decision is made in: face and language, three numbers, what they
 * read most, their own voice, the verifiable credential, then when and how
 * much.
 *
 * Handover 65 §4.1: not a client component. On /practitioners the cards are
 * rendered on the server and only the filter ships as JavaScript; the
 * portrait is the one interactive part, so it is its own client island.
 * (Inside a client tree, the homepage deck and the test portal, it simply
 * renders as part of that tree.)
 */

export type CardActions = {
  /** Where "Choose" goes. Absent for a card that is only being looked at. */
  chooseHref?: string;
  onChoose?: () => void;
  /** Absent on the profile page itself. */
  profileHref?: string;
};

export default function PractitionerCard({
  p,
  actions,
  className,
  headingLevel = "h3",
}: {
  p: CardPractitioner;
  actions: CardActions;
  className?: string;
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  const stats = [
    p.years != null ? { value: String(p.years), label: p.years === 1 ? "Year" : "Years" } : null,
    p.reads != null ? { value: `${p.reads.toLocaleString("en-GB")}+`, label: "Skins read" } : null,
    p.rating != null ? { value: p.rating.toFixed(1), label: "Rating" } : null,
  ].filter((s): s is { value: string; label: string } => s !== null);
  const when = p.nextAvailableAt ? `Next available: ${availabilityLabel(p.nextAvailableAt)}` : null;
  const whenLine = [when, p.price].filter(Boolean).join("  ·  ");

  return (
    <article
      className={cn(
        "relative flex flex-col overflow-hidden rounded-[20px] border border-brand-lavender/70 bg-white shadow-lg",
        className,
      )}
    >
      {p.sample ? (
        <span className="absolute right-0 top-0 z-10 rounded-bl-[9px] bg-brand-cream px-3 py-1 text-[9.5px] font-extrabold tracking-[0.1em] text-brand-ink">
          SAMPLE PROFILE
        </span>
      ) : null}

      <div className="relative h-[236px] shrink-0 overflow-hidden bg-brand-purple-soft">
        <Portrait p={p} />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-ink/90 via-brand-ink/30 to-transparent" />
        {p.recommended ? (
          <span className="absolute left-3.5 top-3.5 rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-brand-primary shadow-md">
            Recommended
          </span>
        ) : null}
        <div className="absolute inset-x-[22px] bottom-[17px] text-white">
          <Heading className="font-sans text-[23px] font-bold leading-tight tracking-[-0.4px] [text-shadow:0_1px_10px_rgb(0_0_0/0.35)]">
            {p.name}
          </Heading>
          {/* Handover 65 §2.5: lavender on the photo's dark end measured under 4.5:1; white at 85% clears it. */}
          <p className="mt-1 font-serif text-[14px] italic leading-snug text-white/85">{p.role}</p>
          <p className="mt-2 inline-block rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[12.5px] text-white/95 backdrop-blur-md">
            {[p.countryName, p.languages.join(", ")].filter(Boolean).join("  ·  ")}
          </p>
        </div>
      </div>

      {stats.length === 1 ? (
        // Handover 65 §2.4: one number in a full-width band looks like a
        // table with the other columns missing. Inline, it reads as a fact.
        <p className="border-y border-brand-lavender/70 bg-brand-surface-alt px-[22px] py-2.5 text-[13px] text-brand-gray">
          <b className="text-[15px] font-bold tabular-nums text-brand-primary">{stats[0].value}</b>{" "}
          {stats[0].label.toLowerCase()}
        </p>
      ) : stats.length ? (
        <div
          className="grid border-y border-brand-lavender/70 bg-brand-surface-alt"
          style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
        >
          {stats.map((s) => (
            <div key={s.label} className="border-r border-brand-lavender/70 px-2 py-3 text-center last:border-r-0">
              <b className="block text-[19px] font-bold tabular-nums tracking-[-0.4px] text-brand-primary">{s.value}</b>
              <span className="mt-0.5 block text-[9.5px] font-semibold uppercase tracking-[0.07em] text-brand-gray/80">{s.label}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-1 flex-col px-[22px] pt-[17px]">
        {p.focus.length ? (
          <>
            <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-brand-gray/80">Reads most often</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {p.focus.map((f) => (
                <span key={f} className="rounded-full bg-brand-purple-soft px-[11px] py-[5px] text-[11.5px] font-semibold text-brand-primary">
                  {f}
                </span>
              ))}
            </div>
          </>
        ) : null}
        {p.quote ? (
          <p className="mt-3.5 border-l-2 border-brand-lavender pl-3 font-serif text-[13.5px] italic leading-relaxed text-brand-gray">
            {p.quote}
          </p>
        ) : null}
        {p.credentialTitle ? (
          <div className="mt-3.5 flex items-start gap-2.5 rounded-[9px] bg-brand-success/10 px-3 py-2.5">
            <svg viewBox="0 0 16 16" aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-success-strong">
              <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[11.5px] leading-snug text-brand-ink">
              <b className="block font-bold">{p.credentialTitle}</b>
              {p.credentialRef}
            </span>
          </div>
        ) : null}
      </div>

      {whenLine ? (
        // "Today" depends on the reader's timezone, which the server does not know.
        <p suppressHydrationWarning className="px-[22px] pb-0.5 pt-3.5 text-[11.5px] font-semibold text-brand-success-strong">
          {whenLine}
        </p>
      ) : null}

      {actions.chooseHref || actions.onChoose || actions.profileHref ? (
        <div className="mt-auto flex gap-2 px-[22px] pb-5 pt-3">
          {actions.onChoose ? (
            <button
              type="button"
              onClick={actions.onChoose}
              className="flex-1 rounded-[10px] bg-brand-primary p-3 text-center text-[14.5px] font-semibold text-white transition hover:bg-brand-primary-dark"
            >
              Choose {firstName(p.name)}
            </button>
          ) : actions.chooseHref ? (
            <Link
              href={actions.chooseHref}
              className="flex-1 rounded-[10px] bg-brand-primary p-3 text-center text-[14.5px] font-semibold text-white transition hover:bg-brand-primary-dark"
            >
              Choose {firstName(p.name)}
            </Link>
          ) : null}
          {actions.profileHref ? (
            <Link
              href={actions.profileHref}
              className="rounded-[10px] border border-brand-lavender bg-white px-4 py-3 text-[14.5px] font-semibold text-brand-primary transition hover:bg-brand-purple-soft"
            >
              Full profile
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="pb-5" />
      )}
    </article>
  );
}
