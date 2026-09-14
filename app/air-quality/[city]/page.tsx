import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import Footer from "@/components/home/Footer";
import { onboardingHref } from "@/components/home/Navbar";
import JsonLd from "@/components/seo/JsonLd";
import { AIR_QUALITY_BANDS } from "@/lib/airQuality/bands";
import { AIR_QUALITY_CITIES, getAirQualityCity } from "@/lib/airQuality/cities";
import { fetchAirQuality, isAirQualityConfigured } from "@/lib/airQuality/provider";
import { breadcrumbSchema, graph } from "@/lib/seo/schema";

/**
 * HANDOVER-22 §6 — a city page whose content updates itself.
 *
 * ── Why a city page is defensible here and normally is not ───────────────
 * Templated "skincare in {city}" text is a doorway-page pattern and Google
 * filters it. Live local data removes that objection: a page carrying
 * today's actual particulate reading for Lahore, with guidance keyed to
 * that reading, is unique content that changes without anyone editing it.
 *
 * That argument only holds while the live reading is actually there. So
 * with no API key configured, or with a city that has no entry, this route
 * 404s rather than publishing the thin version of itself.
 *
 * ── The medical boundary ─────────────────────────────────────────────────
 * Everything below describes what the air does to skin. Nothing describes
 * what it does to lungs, and nothing advises anyone about breathing, masks
 * or whether to go outside. See lib/airQuality/bands.ts.
 */

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ city: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { city: slug } = await params;
  const city = getAirQualityCity(slug);
  if (!city) return {};

  const title = `${city.name} air quality and your skin`;
  const description =
    `Today's particulate reading for ${city.name}, and what it actually means ` +
    `for your skin — written by a certified practitioner, updated automatically.`;

  return {
    title,
    description,
    alternates: { canonical: `/air-quality/${city.slug}` },
    openGraph: {
      title: `${title} | GlamRepairs`,
      description,
      url: `/air-quality/${city.slug}`,
      type: "article",
    },
  };
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Karachi",
    timeZoneName: "short",
  });
}

export default async function AirQualityCityPage({ params }: PageProps) {
  // Order matters: the key check comes first, so an unconfigured deployment
  // never reveals which cities exist.
  if (!isAirQualityConfigured()) notFound();

  const { city: slug } = await params;
  const city = getAirQualityCity(slug);
  if (!city) notFound();

  const reading = await fetchAirQuality(city.lat, city.lon);
  const band = reading ? AIR_QUALITY_BANDS[reading.band] : null;

  return (
    <>
      <JsonLd
        data={graph(
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Air quality", path: "/air-quality" },
            { name: city.name, path: `/air-quality/${city.slug}` },
          ]),
        )}
      />

      <main className="mx-auto max-w-3xl px-5 py-14 sm:px-6 sm:py-16">
        <nav className="mb-8 text-sm text-brand-gray">
          <Link href="/" className="underline underline-offset-2">
            Home
          </Link>
          <span aria-hidden> / </span>
          <Link href="/air-quality" className="underline underline-offset-2">
            Air quality
          </Link>
          <span aria-hidden> / </span>
          <span>{city.name}</span>
        </nav>

        <header>
          <h1 className="font-serif text-3xl leading-tight text-brand-primary sm:text-4xl">
            {city.name} air quality and your skin
          </h1>
          <p className="mt-3 text-sm text-brand-gray">{city.region}</p>
        </header>

        {reading && band ? (
          <section className={`mt-8 rounded-2xl border p-6 ${band.tone}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-gray">
              Right now
            </p>
            <p className="mt-2 font-serif text-4xl leading-none text-brand-ink">
              {band.label}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-brand-ink">
              {band.summary}
            </p>

            <dl className="mt-5 grid grid-cols-2 gap-4 sm:max-w-sm">
              <div>
                <dt className="text-xs text-brand-gray">PM2.5</dt>
                <dd className="mt-0.5 text-lg font-medium text-brand-ink">
                  {reading.pm25.toFixed(1)}{" "}
                  <span className="text-sm font-normal text-brand-gray">
                    µg/m³
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-brand-gray">PM10</dt>
                <dd className="mt-0.5 text-lg font-medium text-brand-ink">
                  {reading.pm10.toFixed(1)}{" "}
                  <span className="text-sm font-normal text-brand-gray">
                    µg/m³
                  </span>
                </dd>
              </div>
            </dl>

            <p className="mt-5 text-xs leading-relaxed text-brand-gray">
              Measured {formatWhen(reading.measuredAt)}. The band shown is
              OpenWeather&apos;s own five-point air quality index, which is a
              different scale from the 0–500 US AQI quoted in the news — the
              particulate figures above are the comparable numbers.
            </p>
          </section>
        ) : (
          <p className="mt-8 rounded-2xl border border-brand-border-light/70 bg-brand-surface/50 px-5 py-5 text-sm leading-relaxed text-brand-gray">
            Today&apos;s reading is unavailable. Rather than show you a stale
            number, the guidance below is the part that does not change.
          </p>
        )}

        {band ? (
          <section className="mt-10">
            <h2 className="font-serif text-2xl leading-snug text-brand-primary">
              What this means for your skin today
            </h2>
            <ul className="mt-4 space-y-3">
              {band.skinGuidance.map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-2.5 text-[0.9375rem] leading-relaxed text-brand-ink"
                >
                  <span
                    aria-hidden
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-primary"
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-brand-gray">
              This page is about skin. It does not give advice about
              breathing, masks or respiratory symptoms — that is a doctor&apos;s
              territory, not ours.
            </p>
          </section>
        ) : null}

        <section className="mt-10">
          <h2 className="font-serif text-2xl leading-snug text-brand-primary">
            {city.name} through the year
          </h2>
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-brand-ink">
            {city.seasonalNote}
          </p>
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-brand-ink">
            <Link
              href={`/blog/${city.relatedPostSlug}`}
              className="text-brand-primary underline underline-offset-2"
            >
              Why skin gets worse in Pakistan — pollution, humidity and hard
              water
            </Link>{" "}
            goes through the mechanism in full.
          </p>
        </section>

        <section className="mt-12 rounded-[2rem] bg-brand-cream/70 px-5 py-8 text-center sm:px-8 sm:py-10">
          <h2 className="font-serif text-2xl leading-snug text-brand-primary sm:text-[1.75rem]">
            A routine built for this air
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-brand-gray sm:text-[0.9375rem]">
            Generic guidance can only go so far. A practitioner reads your
            photographs and writes a routine for your skin, in your climate.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href={onboardingHref}
              className="inline-flex items-center justify-center rounded-full bg-brand-primary px-10 py-3.5 text-xs font-semibold uppercase tracking-[0.14em] text-white transition-opacity hover:opacity-90 sm:text-sm"
            >
              Start my assessment
            </Link>
            <Link
              href="/sample-assessment"
              className="inline-flex items-center justify-center rounded-full border border-brand-primary/40 px-10 py-3.5 text-xs font-semibold uppercase tracking-[0.14em] text-brand-primary transition-colors hover:bg-brand-primary/5 sm:text-sm"
            >
              See a real assessment
            </Link>
          </div>
        </section>

        {/*
          OpenWeather's free tier permits commercial use, and requires this
          attribution to be visible on the page where the data appears. It is
          a licence condition, not a courtesy — do not remove it, and do not
          move it into a legal page.
        */}
        <p className="mt-10 text-xs text-brand-gray">
          Air quality data provided by{" "}
          <a
            href="https://openweathermap.org/"
            target="_blank"
            rel="noopener"
            className="underline underline-offset-2"
          >
            OpenWeather
          </a>
          , licensed under the Open Database License.
        </p>
      </main>
      <Footer />
    </>
  );
}

export function generateStaticParams() {
  // Present for route typing; the page is force-dynamic, so nothing is
  // prebuilt and an unconfigured deployment still 404s.
  return AIR_QUALITY_CITIES.map((city) => ({ city: city.slug }));
}
