import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import Footer from "@/components/home/Footer";
import JsonLd from "@/components/seo/JsonLd";
import { AIR_QUALITY_CITIES } from "@/lib/airQuality/cities";
import { isAirQualityConfigured } from "@/lib/airQuality/provider";
import { breadcrumbSchema, graph } from "@/lib/seo/schema";

/**
 * HANDOVER-22 §6 — the index.
 *
 * One city today, by instruction: "Build Lahore first and only. Add Karachi
 * and Islamabad once Lahore proves it gets traffic." The page is written so
 * that adding a second city is an entry in lib/airQuality/cities.ts and
 * nothing here.
 *
 * 404s without an API key for the same reason the city page does — the live
 * reading is what makes these pages worth publishing at all.
 */

export const dynamic = "force-dynamic";

const DESCRIPTION =
  "Today's particulate readings for Pakistani cities, and what they actually " +
  "mean for your skin — not for your lungs.";

export const metadata: Metadata = {
  title: "Air quality and your skin",
  description: DESCRIPTION,
  alternates: { canonical: "/air-quality" },
};

export default function AirQualityIndexPage() {
  if (!isAirQualityConfigured()) notFound();

  return (
    <>
      <JsonLd
        data={graph(
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Air quality", path: "/air-quality" },
          ]),
        )}
      />

      <main className="mx-auto max-w-3xl px-5 py-14 sm:px-6 sm:py-16">
        <nav className="mb-8 text-sm text-brand-gray">
          <Link href="/" className="underline underline-offset-2">
            Home
          </Link>
          <span aria-hidden> / </span>
          <span>Air quality</span>
        </nav>

        <header>
          <p className="gr-eyebrow mb-3">Live readings</p>
          <h1 className="font-serif text-3xl leading-tight text-brand-primary sm:text-4xl">
            Air quality and your skin
          </h1>
          <p className="mt-4 text-base leading-relaxed text-brand-ink sm:text-lg">
            Every air quality site tells you what today&apos;s reading means
            for your lungs. This one tells you what it means for your skin —
            what to change in your routine, and what not to.
          </p>
        </header>

        <ul className="mt-10 space-y-4">
          {AIR_QUALITY_CITIES.map((city) => (
            <li key={city.slug}>
              <Link
                href={`/air-quality/${city.slug}`}
                className="block rounded-2xl border border-brand-lavender/60 bg-white px-5 py-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <span className="font-serif text-2xl text-brand-primary">
                  {city.name}
                </span>
                <span className="mt-0.5 block text-sm text-brand-gray">
                  {city.region}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-sm leading-relaxed text-brand-gray">
          More cities follow once this one proves useful. A city page is only
          worth publishing when it carries that city&apos;s own live reading
          and its own seasonal pattern — a page that is this one with the name
          changed helps nobody.
        </p>
      </main>
      <Footer />
    </>
  );
}
