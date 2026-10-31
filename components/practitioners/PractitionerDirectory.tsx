import DirectoryFilters, { type DirectoryEntry } from "@/components/practitioners/DirectoryFilters";
import PractitionerCard, { type CardActions } from "@/components/practitioners/PractitionerCard";
import type { CardPractitioner } from "@/lib/practitioners/card";

/**
 * The directory: cards plus filters. Not a client component itself (Handover
 * 65 §4.1): rendered from the /practitioners server page, the cards are
 * server HTML and only DirectoryFilters ships as JavaScript. The test portal
 * renders it inside its own client tree with click handlers, which works the
 * same way.
 */

export const CARD_HOVER =
  "transition duration-300 hover:-translate-y-1 hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0";

export function directoryEntries(
  practitioners: CardPractitioner[],
  actionsFor: (p: CardPractitioner) => CardActions = (p) => ({
    chooseHref: `/onboarding?practitioner=${encodeURIComponent(p.slug)}`,
    profileHref: `/practitioners/${p.slug}`,
  }),
): DirectoryEntry[] {
  return practitioners.map((p) => ({
    slug: p.slug,
    countryName: p.countryName,
    languages: p.languages,
    focus: p.focus,
    nextAvailableAt: p.nextAvailableAt,
    card: <PractitionerCard p={p} actions={actionsFor(p)} className={CARD_HOVER} />,
  }));
}

export default function PractitionerDirectory({
  practitioners,
  actionsFor,
  noun,
}: {
  practitioners: CardPractitioner[];
  /** Built per card by the page, so the test portal can choose without navigating. */
  actionsFor?: (p: CardPractitioner) => CardActions;
  noun?: string;
}) {
  return <DirectoryFilters entries={directoryEntries(practitioners, actionsFor)} noun={noun} />;
}
