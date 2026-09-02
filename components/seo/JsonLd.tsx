/**
 * Renders a JSON-LD block.
 *
 * Server component on purpose — the payload must be in the initial HTML.
 * Crawlers that do not execute JavaScript (and most AI crawlers do not) will
 * otherwise never see it, which defeats the point.
 */
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // Schema is generated server-side from our own typed helpers, never from
      // user input. `<` is escaped so a stray value cannot break out of the tag.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
