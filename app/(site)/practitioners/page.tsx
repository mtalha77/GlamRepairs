import type { Metadata } from "next";
import { notFound } from "next/navigation";

import PractitionerDirectory from "@/components/practitioners/PractitionerDirectory";
import JsonLd from "@/components/seo/JsonLd";
import { DIRECTORY_MIN_PRACTITIONERS, listPublicPractitioners, visitorPrice } from "@/lib/practitioners/directory";
import { getServerPricingRegion } from "@/lib/pricing/geo";
import { breadcrumbSchema, graph, practitionerPersonSchema } from "@/lib/seo/schema";
import { abs, canonicalOg } from "@/lib/seo/site";

/**
 * /practitioners (Handover 63 Part 2). Indexed, in the sitemap, and linked
 * to every profile, which all link back here. The opposite of the funnel.
 *
 * Below three approved practitioners this is a 404, not a "coming soon"
 * page: a dead URL Google remembers is worse than no URL. Same gate as the
 * homepage deck, counted from the same view.
 */

const TITLE = "Choose Your Aesthetics Practitioner";
const DESCRIPTION =
  "Every practitioner publishes their qualification with its reference number and the languages they work in. Filter by country, language and what they read, then choose.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...canonicalOg("/practitioners", { title: TITLE, description: DESCRIPTION }),
};

export default async function PractitionersPage() {
  const practitioners = await listPublicPractitioners(visitorPrice(await getServerPricingRegion()));
  if (practitioners.length < DIRECTORY_MIN_PRACTITIONERS) notFound();

  return (
    <>
      <JsonLd
        data={graph(
          {
            "@type": "CollectionPage",
            "@id": abs("/practitioners#page"),
            url: abs("/practitioners"),
            name: TITLE,
            mainEntity: {
              "@type": "ItemList",
              itemListElement: practitioners.map((p, i) => ({
                "@type": "ListItem",
                position: i + 1,
                url: abs(`/practitioners/${p.slug}`),
                name: p.name,
              })),
            },
          },
          ...practitioners.map((p) => practitionerPersonSchema(p)),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Practitioners", path: "/practitioners" },
          ]),
        )}
      />
      <section className="px-4 pb-20 pt-14 sm:px-6">
        <div className="mx-auto max-w-[1120px]">
          <p className="gr-eyebrow mb-3">The directory</p>
          <h1 className="font-sans text-[1.6rem] font-semibold leading-[1.18] tracking-[-0.8px] text-brand-ink sm:text-[2rem]">
            Read them properly, <span className="font-serif italic text-brand-primary">then choose.</span>
          </h1>
          <p className="mt-3 max-w-[58ch] text-[15.5px] leading-relaxed text-brand-gray">
            Anyone here can read your photographs wherever you are. Country affects when they are awake, not whether they
            can help you.
          </p>
          <PractitionerDirectory practitioners={practitioners} />
        </div>
      </section>
    </>
  );
}
