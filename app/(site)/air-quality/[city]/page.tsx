import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { onboardingHref } from "@/components/home/Navbar";
import Breadcrumbs, { type Crumb } from "@/components/seo/Breadcrumbs";
import JsonLd from "@/components/seo/JsonLd";
import {
  canShowLivePanel,
  getAreaPage,
  listPublishedAreaPages,
  type AreaPage,
} from "@/lib/airQuality/areaPages";
import { renderMarkdown } from "@/lib/blog/markdown";
import { breadcrumbSchema, graph } from "@/lib/seo/schema";
import { SITE, SOCIAL_CARD, abs } from "@/lib/seo/site";

/**
 * A city page whose content updates itself — HANDOVER-22 §6, rebuilt on the
 * database per HANDOVER-35.
 *
 * ── Why a city page is defensible here and normally is not ───────────────
 * Templated "skincare in {city}" text is a doorway-page pattern and Google
 * filters it. Live local data removes that objection: a page carrying
 * today's actual particulate reading, with guidance keyed to that reading
 * and a paragraph of genuinely local fact above a shared zone essay, is
 * unique content that changes without anyone editing it.
 *
 * ── What changed from the first build ────────────────────────────────────
 * It used to fetch OpenWeather live, per request, from a city list
 * hardcoded in TypeScript, while a cron quietly populated WeatherAPI
 * readings into tables this page never read. Two implementations of one
 * feature. The content and the data both live in the database, so the page
 * reads from there; see lib/airQuality/areaPages.ts.
 *
 * ── The medical boundary ─────────────────────────────────────────────────
 * Everything below describes what the air does to SKIN. Nothing describes
 * what it does to lungs, and nothing advises anyone about breathing, masks
 * or whether to go outside. No medical schema is emitted for the same
 * reason — HANDOVER-35 §3.2.
 */

/* One hour. The cron writes every 30 minutes, so this never serves a
 * reading more than about ninety minutes old while costing one render. */
export const revalidate = 3600;

type PageProps = { params: Promise<{ city: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { city: slug } = await params;
  const page = await getAreaPage(slug);
  if (!page) return {};

  const path = `/air-quality/${page.slug}`;
  return {
    /*
     * The stored title is the bare headline; the root template appends
     * " | GlamRepairs". Storing the brand here as well would double it,
     * and HOTFIX-31 §4.3 is the cautionary tale about that suffix being
     * forgotten in the arithmetic.
     */
    title: page.title,
    description: page.metaDescription,
    alternates: { canonical: path },
    openGraph: {
      title: `${page.title} | ${SITE.name}`,
      description: page.metaDescription,
      url: path,
      type: "article",
      /*
       * `images` is not optional. A page-level openGraph REPLACES the
       * inherited object, so omitting it drops og:image — which is exactly
       * what the previous version of this file did, silently, on every
       * air-quality page.
       */
      images: [SOCIAL_CARD],
    },
  };
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Karachi",
    timeZoneName: "short",
  });
}

function formatDay(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Karachi",
  });
}

/**
 * The structured data — HANDOVER-35 §3.1.
 *
 * `Dataset` is emitted only when there is a reading to describe. Claiming a
 * dataset on a page showing no numbers would be describing something that
 * is not on the page. `WebPage` and `BreadcrumbList` are emitted always,
 * which is §6's rule: drop the Dataset node, keep the rest.
 */
function areaSchema(page: AreaPage, trail: Crumb[]) {
  const path = `/air-quality/${page.slug}`;
  const nodes: object[] = [
    {
      "@type": "WebPage",
      "@id": abs(`${path}#webpage`),
      url: abs(path),
      name: page.title,
      description: page.metaDescription,
      inLanguage: "en-PK",
      isPartOf: { "@id": abs("/#website") },
      about: {
        "@type": "City",
        name: page.city,
        address: {
          "@type": "PostalAddress",
          ...(page.province ? { addressRegion: page.province } : {}),
          addressCountry: "PK",
        },
      },
      // The honest freshness signal, and what makes the page worth
      // re-crawling. It is the reading's time, never the build's.
      ...(page.latest ? { dateModified: page.latest.fetchedAt } : {}),
    },
    breadcrumbSchema(trail),
  ];

  if (page.latest) {
    nodes.push({
      "@type": "Dataset",
      name: `${page.city} air quality readings`,
      description: `Hourly air quality and weather readings for ${page.city}, Pakistan.`,
      temporalCoverage: `${page.latest.observedAt.slice(0, 7)}/..`,
      spatialCoverage: {
        "@type": "Place",
        geo: {
          "@type": "GeoCoordinates",
          latitude: page.latitude,
          longitude: page.longitude,
        },
      },
      creator: {
        "@type": "Organization",
        name: "WeatherAPI.com",
        url: "https://www.weatherapi.com/",
      },
      isAccessibleForFree: true,
    });
  }

  return graph(...nodes);
}

export default async function AirQualityCityPage({ params }: PageProps) {
  const { city: slug } = await params;
  const page = await getAreaPage(slug);
  // Draft and unknown slugs both 404 here, so an unpublished city is a
  // genuine miss rather than an empty rendered page — §1.1.
  if (!page) notFound();

  const showLive = canShowLivePanel(page);
  const trail: Crumb[] = [
    { name: "Home", path: "/" },
    { name: "Air quality", path: "/air-quality" },
    { name: page.city, path: `/air-quality/${page.slug}` },
  ];

  return (
    <>
      <JsonLd data={areaSchema(page, trail)} />

      <main className="mx-auto max-w-3xl px-5 py-14 sm:px-6 sm:py-16">
        <Breadcrumbs trail={trail} className="mb-8 text-brand-gray" />

        <header>
          {/* Exactly one H1, and the live number is deliberately not in it:
              a heading that changes hourly gives Google no stable signal
              about what the page is — §2.3. */}
          <h1 className="font-serif text-3xl leading-tight text-brand-primary sm:text-4xl">
            {page.h1}
          </h1>
          {page.introMarkdown ? (
            <div
              className="prose-area mt-4 text-brand-ink"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(page.introMarkdown),
              }}
            />
          ) : null}
        </header>

        {/*
          §5.2 — the panel's height is reserved whether or not data arrives.
          `min-h` on the container means the editorial below it sits in the
          same place either way, so a missing reading cannot shift the page.
          This is the single most likely way these pages would damage CLS.
        */}
        <section className="mt-10 min-h-[13rem]">
          <h2 className="font-serif text-2xl leading-snug text-brand-primary">
            Air in {page.city} right now
          </h2>

          {showLive && page.latest ? (
            <>
              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["PM2.5", page.latest.pm25, "µg/m³"],
                  ["PM10", page.latest.pm10, "µg/m³"],
                  ["Temp", page.latest.tempC, "°C"],
                  ["Humidity", page.latest.humidity, "%"],
                ].map(([label, value, unit]) => (
                  <div
                    key={String(label)}
                    className="rounded-2xl border border-brand-lavender/70 bg-white p-4"
                  >
                    <dt className="text-xs uppercase tracking-wide text-brand-gray">
                      {label}
                    </dt>
                    <dd className="mt-1 text-2xl text-brand-primary tabular-nums">
                      {value == null ? "—" : String(value)}
                      <span className="ml-1 text-sm text-brand-gray">
                        {value == null ? "" : unit}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-xs text-brand-gray">
                {page.latest.conditionText ? `${page.latest.conditionText}. ` : ""}
                Reading taken {formatWhen(page.latest.observedAt)}.{" "}
                {/* Required by the WeatherAPI free plan, and a legitimate
                    source citation rather than a link to suppress — §5.5. */}
                Powered by{" "}
                <a
                  href="https://www.weatherapi.com/"
                  title="Weather API"
                  className="underline underline-offset-2"
                >
                  WeatherAPI.com
                </a>
              </p>
            </>
          ) : (
            <p className="mt-4 rounded-2xl border border-brand-lavender/70 bg-white px-4 py-5 text-sm leading-relaxed text-brand-gray">
              Live readings for {page.city} are unavailable at the moment. The
              guidance below does not depend on today&apos;s number.
            </p>
          )}
        </section>

        {page.advice ? (
          <section className="mt-10">
            <h2 className="font-serif text-2xl leading-snug text-brand-primary">
              What this means for your skin today
            </h2>
            <p className="mt-3 font-medium text-brand-ink">
              {page.advice.headline}
            </p>
            <p className="mt-2 leading-relaxed text-brand-ink">
              {page.advice.advice}
            </p>
          </section>
        ) : null}

        {showLive && page.forecast.length ? (
          <section className="mt-10">
            <h2 className="font-serif text-2xl leading-snug text-brand-primary">
              The next three days
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {page.forecast.map((d) => (
                <div
                  key={d.date}
                  className="rounded-2xl border border-brand-lavender/70 bg-white p-4"
                >
                  <p className="text-xs uppercase tracking-wide text-brand-gray">
                    {formatDay(d.date)}
                  </p>
                  <p className="mt-1 text-brand-ink">
                    {d.maxTempC == null ? "—" : `${Math.round(d.maxTempC)}°`}
                    {d.minTempC == null ? "" : ` / ${Math.round(d.minTempC)}°`}
                  </p>
                  <p className="mt-0.5 text-xs text-brand-gray">
                    {d.conditionText ?? ""}
                    {d.uvIndex == null ? "" : ` · UV ${d.uvIndex}`}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {page.cityMarkdown ? (
          <section className="mt-12">
            <h2 className="font-serif text-2xl leading-snug text-brand-primary">
              Skin in {page.city} specifically
            </h2>
            <div
              className="prose-area mt-3 text-brand-ink"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(page.cityMarkdown),
              }}
            />
          </section>
        ) : null}

        {page.zoneGuidance ? (
          <section className="mt-12">
            {/* The city paragraph renders ABOVE this, so a reader in
                Faisalabad gets the Faisalabad fact before the shared essay. */}
            <h2 className="font-serif text-2xl leading-snug text-brand-primary">
              Skin in the {page.zoneName}
            </h2>
            <div
              className="prose-area mt-3 text-brand-ink"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(page.zoneGuidance),
              }}
            />
          </section>
        ) : null}

        {page.zoneSiblings.length ? (
          <section className="mt-12">
            <h2 className="font-serif text-2xl leading-snug text-brand-primary">
              Other cities in this zone
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {page.zoneSiblings.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/air-quality/${s.slug}`}
                    className="inline-block rounded-full border border-brand-lavender px-3 py-1.5 text-sm text-brand-primary hover:bg-brand-lavender/20"
                  >
                    {s.city} air quality
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-12 rounded-2xl border border-brand-lavender/70 bg-white p-6">
          <h2 className="font-serif text-2xl leading-snug text-brand-primary">
            Get an assessment for your skin
          </h2>
          <p className="mt-2 leading-relaxed text-brand-gray">
            General guidance for {page.city} only goes so far. A practitioner
            reading your photographs can tell you which of this actually
            applies to you.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={onboardingHref}
              className="rounded-full bg-brand-primary px-5 py-2.5 text-sm text-white"
            >
              Start an assessment
            </Link>
            <Link
              href="/sample-assessment"
              className="rounded-full border border-brand-lavender px-5 py-2.5 text-sm text-brand-primary"
            >
              See a sample assessment first
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}

/**
 * Published slugs only — §1.1.
 *
 * A static list means /air-quality/sargodha is a genuine 404 rather than an
 * empty rendered page, and it is why no query parameter is ever read for a
 * location: that would be a crawlable infinite space.
 */
export async function generateStaticParams() {
  const pages = await listPublishedAreaPages();
  return pages.map((p) => ({ city: p.slug }));
}
