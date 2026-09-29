/**
 * Split an editable heading into a plain lead and an accented tail —
 * HANDOVER-45.
 *
 * Several headings are designed with their last few words in italic or a
 * contrasting face. Their text now comes from Studio → SEO, so the styling
 * cannot assume particular words: it accents the last `accentWords` words of
 * whatever is saved. Shorter headings are accented whole rather than split
 * into an empty lead.
 */
export function splitAccent(
  text: string,
  accentWords: number,
): { lead: string; accent: string } {
  const words = text.trim().split(/\s+/);
  if (words.length <= accentWords) return { lead: "", accent: words.join(" ") };
  return {
    lead: words.slice(0, -accentWords).join(" "),
    accent: words.slice(-accentWords).join(" "),
  };
}
