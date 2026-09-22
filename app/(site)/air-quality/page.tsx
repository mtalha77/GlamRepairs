import type { Metadata } from "next";
import Link from "next/link";

import Breadcrumbs, { type Crumb } from "@/components/seo/Breadcrumbs";
import { listPublishedAreaPages } from "@/lib/airQuality/areaPages";
import { canonicalOg } from "@/lib/seo/site";

/**
 * The air-quality index — HANDOVER-35 §4.1.
 *
 * Grouped by zone, because the zone is a content component rather than a
 * URL: there are deliberately no /zones/ routes to duplicate against the
 * city pages that already embed the same essay.
 *
 * This is also one of the three incoming links every city page needs. The
 * footer and the homepage strip are the other two — a page with one
 * incoming link is the orphan warning Ahrefs has already raised twice.
 */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Air quality and your skin, by city",
  description:
    "Live particulate readings for cities across Pakistan, and what each one means for your skin, written by a certified practitioner.",
  ...canonicalOg("/air-quality"),
};

export default async function AirQualityIndexPage() {
  const pages = await listPublishedAreaPages();

  const zones = pages.reduce<Map<string, { name: string; summary: string | null; cities: typeof pages }>>(
    (acc, p) => {
      const key = p.zoneSlug ?? "other";
      const entry = acc.get(key) ?? {
        name: p.zoneName ?? "Other cities",
        summary: p.zoneSummary,
        cities: [],
      };
      entry.cities.push(p);
      acc.set(key, entry);
      return acc;
    },
    new Map(),
  );

  const trail: Crumb[] = [
    { name: "Home", path: "/" },
    { name: "Air quality", path: "/air-quality" },
  ];

  return (
    <main className="mx-auto max-w-3xl px-5 py-14 sm:px-6 sm:py-16">
      <Breadcrumbs trail={trail} className="mb-8 text-brand-gray" />

      <h1 className="font-serif text-3xl leading-tight text-brand-primary sm:text-4xl">
        Air quality and your skin, by city
      </h1>
      <p className="mt-4 leading-relaxed text-brand-gray">
        What the air is doing in each city, and what that means for skin. The
        readings update through the day; the guidance is written once per
        climate zone, because cities that share a climate share a problem.
      </p>

      {pages.length === 0 ? (
        /* Not an error state. Cities are drafts until the content is signed
           off, and an empty index is the honest rendering of that. */
        <p className="mt-10 rounded-2xl border border-dashed border-brand-lavender bg-white px-4 py-10 text-center text-sm text-brand-gray">
          City pages are being prepared and will appear here shortly.
        </p>
      ) : (
        <div className="mt-10 space-y-10">
          {[...zones.entries()].map(([slug, zone]) => (
            <section key={slug}>
              <h2 className="font-serif text-2xl leading-snug text-brand-primary">
                {zone.name}
              </h2>
              {zone.summary ? (
                <p className="mt-2 text-sm leading-relaxed text-brand-gray">
                  {zone.summary}
                </p>
              ) : null}
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {zone.cities.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/air-quality/${c.slug}`}
                      className="block rounded-2xl border border-brand-lavender/70 bg-white p-4 transition-colors hover:border-brand-primary"
                    >
                      <span className="block font-medium text-brand-ink">
                        {c.city}
                      </span>
                      {c.covers ? (
                        <span className="mt-0.5 block text-xs text-brand-gray">
                          Covers {c.covers}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
