import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { onboardingHref } from "@/components/home/Navbar";
import Breadcrumbs, { type Crumb } from "@/components/seo/Breadcrumbs";
import JsonLd from "@/components/seo/JsonLd";
import {
  canShowLivePanel,
  getAreaPage,
  getDailyPm25,
  listPublishedAreaPages,
  type AreaPage,
  type DailyPm25,
} from "@/lib/airQuality/areaPages";
import { renderMarkdown } from "@/lib/blog/markdown";
import { barChart } from "@/lib/charts/render";
import { PRACTITIONER } from "@/lib/seo/authors";
import { breadcrumbSchema, faqSchema, graph } from "@/lib/seo/schema";
import { SITE, SOCIAL_CARD, abs, canonicalOg } from "@/lib/seo/site";

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
    /*
     * HOTFIX-39 §4 — through `canonicalOg`, not hand-rolled.
     *
     * This route built `alternates` and `openGraph` itself and never set
     * `twitter`, so it inherited the ROOT twitter object and served the
     * homepage's title and description on all thirteen city pages. The
     * shared helper was fixed in HOTFIX-36 §3.1; this call site was simply
     * not using it, which is why that fix did not reach here.
     *
     * The helper also keeps `images` on the openGraph object, which is the
     * other trap this file already documented: a page-level openGraph
     * REPLACES the inherited one, so omitting images silently drops
     * og:image.
     */
    ...canonicalOg(path, {
      title: `${page.title} | ${SITE.name}`,
      description: page.metaDescription,
      type: "article",
    }),
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

/**
 * Today's date in Pakistan, as YYYY-MM-DD — HOTFIX-39 §6.
 *
 * `area_page_data` filters the forecast with `forecast_date >=
 * CURRENT_DATE`, which is the DATABASE's date, in UTC. Every reader of
 * this page is five hours ahead of that. Between 19:00 UTC and midnight
 * the two disagree, and the first forecast card showed yesterday: at 22:00
 * UTC on 23 September, beside a reading stamped "24 September 02:00", the
 * forecast opened on "Wed 23 Sept".
 *
 * Filtering here rather than widening the view, because the view is
 * generic and this is a Pakistan-facing page. `en-CA` is the shortest way
 * to an ISO date string, and ISO dates compare correctly as strings.
 */
function todayInPakistan(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
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
 * The structured data — HANDOVER-35 §3.1, extended by HOTFIX-40 §3–§4.
 *
 * ── The two dates, and what may not move them ────────────────────────────
 * `datePublished` is the row's `created_at` and `dateModified` its
 * `updated_at`, which a trigger moves only when reader-facing copy changes.
 *
 * `dateModified` used to be the sensor reading's `fetched_at`, on the
 * argument that a changed number is a changed page. HOTFIX-40 §3 is right
 * that it is not: that value moved every hour, so the page told Google its
 * content changed sixty times a day when nobody had touched it — a signal
 * Google learns to discount, and one that spends crawl budget a small site
 * cannot spare. The reading's time now lives where it belongs, on the
 * Dataset node and in the visible "Reading taken …" table caption.
 *
 * ── Where `reviewedBy` goes ──────────────────────────────────────────────
 * §4.2's example puts `reviewedBy` on the Article. It is not an Article
 * property: schema.org defines it on WebPage (MedicalWebPage inherits it
 * from there). So the WebPage carries `reviewedBy` and the Article carries
 * `author`, and the two nodes are tied by `isPartOf` / `mainEntity`.
 *
 * `Dataset` is still emitted only when there is a reading to describe, and
 * `FAQPage` only when the page renders a visible FAQ block — never markup
 * for questions that are not on the page (§4.4).
 */
function toKarachiIso(isoUtc: string): string {
  // Stable, explicit offset. Pakistan does not observe DST, so +05:00 is
  // always correct and reads the way §4.2's example does.
  const d = new Date(new Date(isoUtc).getTime() + 5 * 60 * 60 * 1000);
  return `${d.toISOString().slice(0, 19)}+05:00`;
}

function areaSchema(page: AreaPage, trail: Crumb[]) {
  const path = `/air-quality/${page.slug}`;
  const person = { "@id": abs(`/authors/${PRACTITIONER.slug}#person`) };
  const published = toKarachiIso(page.createdAt);
  const modified = toKarachiIso(page.updatedAt);
  const place = {
    "@type": "Place",
    name: page.city,
    address: {
      "@type": "PostalAddress",
      addressLocality: page.city,
      ...(page.province ? { addressRegion: page.province } : {}),
      addressCountry: "PK",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: page.latitude,
      longitude: page.longitude,
    },
  };

  const nodes: object[] = [
    {
      "@type": "WebPage",
      "@id": abs(`${path}#webpage`),
      url: abs(path),
      name: page.title,
      description: page.metaDescription,
      inLanguage: "en-PK",
      isPartOf: { "@id": abs("/#website") },
      datePublished: published,
      dateModified: modified,
      reviewedBy: person,
      mainEntity: { "@id": abs(`${path}#article`) },
      breadcrumb: { "@id": abs(`${path}#breadcrumb`) },
    },
    {
      "@type": "Article",
      "@id": abs(`${path}#article`),
      headline: page.h1,
      description: page.metaDescription,
      inLanguage: "en-PK",
      datePublished: published,
      dateModified: modified,
      author: person,
      publisher: { "@id": abs("/#organization") },
      isPartOf: { "@id": abs(`${path}#webpage`) },
      mainEntityOfPage: { "@id": abs(`${path}#webpage`) },
      image: SOCIAL_CARD.url,
      about: place,
    },
    { ...breadcrumbSchema(trail), "@id": abs(`${path}#breadcrumb`) },
  ];

  if (page.latest) {
    const measured = [
      { name: "PM2.5", value: page.latest.pm25 },
      { name: "PM10", value: page.latest.pm10 },
    ].filter((m) => m.value !== null);

    nodes.push({
      "@type": "Dataset",
      "@id": abs(`${path}#dataset`),
      name: `${page.city} air quality readings`,
      description:
        `Hourly particulate, temperature and humidity readings for ` +
        `${page.city}, Pakistan, refreshed every hour and shown with what ` +
        `the current level means for skin.`,
      // §4.3: the Dataset describes the reading, so it carries the
      // reading's time — the one place that time belongs.
      temporalCoverage: toKarachiIso(page.latest.observedAt),
      spatialCoverage: place,
      creator: {
        "@type": "Organization",
        name: "WeatherAPI.com",
        url: "https://www.weatherapi.com/",
      },
      isAccessibleForFree: true,
      // `GQ` is the UN/CEFACT common code for microgram per cubic metre.
      variableMeasured: measured.map((m) => ({
        "@type": "PropertyValue",
        name: m.name,
        value: m.value,
        unitCode: "GQ",
        unitText: "µg/m³",
      })),
    });
  }

  if (page.faqs.length) {
    nodes.push(faqSchema(page.faqs, path));
  }

  return graph(...nodes);
}

function formatDate(isoUtc: string) {
  return new Date(isoUtc).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Karachi",
  });
}

/**
 * The seven-day chart — HOTFIX-40 §2.1.
 *
 * The page had four images and none of them was about its subject: three
 * logos and the shared CTA photo. This adds the one image worth describing,
 * built from the site's own hourly readings.
 *
 * ── Why the guideline is 15, not 5 ───────────────────────────────────────
 * §2.1's example describes daily means "against a WHO guideline of 5". Five
 * is the WHO's ANNUAL guideline. Daily means are compared against the
 * 24-HOUR guideline, which is 15 µg/m³. Plotting a day against a year's
 * threshold is the same mismatch HANDOVER-38 §3 warns about for units —
 * right-looking, and wrong in a way anyone who knows the guidelines will
 * catch.
 *
 * ── Why it may not appear yet ────────────────────────────────────────────
 * It needs three days with enough readings to mean something. The hourly
 * refresh has only been writing every city since 23 September, so for the
 * first few days the section is simply absent rather than showing one bar
 * under a "last seven days" heading.
 */
const MIN_CHART_DAYS = 3;
const WHO_24H_PM25 = 15;

function sevenDayChart(page: AreaPage, days: DailyPm25[]): string | null {
  if (days.length < MIN_CHART_DAYS) return null;

  const fmt = (d: string) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "Asia/Karachi",
    });
  const first = days[0].date;
  const last = days[days.length - 1].date;
  const means = days.map((d) => d.mean);
  const lo = Math.min(...means);
  const hi = Math.max(...means);
  const anyPartial = days.some((d) => d.partial);

  return barChart({
    id: `aq7-${page.slug}`,
    title: `${page.city} PM2.5, daily mean, ${fmt(first)} to ${fmt(last)}`,
    subtitle: `The dashed line is the WHO 24-hour guideline of ${WHO_24H_PM25}.`,
    unit: "pm25",
    source: "WeatherAPI.com readings collected hourly by Glam Repairs",
    points: days.map((d) => ({
      label: fmt(d.date),
      value: d.mean,
      partial: d.partial,
    })),
    guideline: { value: WHO_24H_PM25, label: `WHO 24-hour guideline ${WHO_24H_PM25}` },
    desc:
      `Daily mean PM2.5 in ${page.city} from ${fmt(first)} to ${fmt(last)}, ` +
      `ranging from ${lo} to ${hi} micrograms per cubic metre, against a ` +
      `WHO 24-hour guideline of ${WHO_24H_PM25}.`,
    ...(anyPartial
      ? { partialNote: "Today is still in progress, so its mean covers only the hours so far." }
      : {}),
  });
}

export default async function AirQualityCityPage({ params }: PageProps) {
  const { city: slug } = await params;
  const page = await getAreaPage(slug);
  // Draft and unknown slugs both 404 here, so an unpublished city is a
  // genuine miss rather than an empty rendered page — §1.1.
  if (!page) notFound();

  const showLive = canShowLivePanel(page);
  // Drop any forecast day that is already yesterday where the reader is.
  const today = todayInPakistan();
  const forecast = page.forecast.filter((d) => d.date >= today);
  const chart = sevenDayChart(page, await getDailyPm25(page.slug));
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
          {/*
            HOTFIX-40 §3.2 — the same two dates the schema carries, where a
            reader can see them. "Last reviewed", not "Last updated": a
            person checked the copy, and the live numbers below change
            hourly without anyone reviewing anything.
          */}
          <p className="mt-3 text-sm text-brand-gray">
            Published{" "}
            <time dateTime={page.createdAt}>{formatDate(page.createdAt)}</time>.
            Last reviewed{" "}
            <time dateTime={page.updatedAt}>{formatDate(page.updatedAt)}</time>{" "}
            by{" "}
            <Link
              href={`/authors/${PRACTITIONER.slug}`}
              className="underline underline-offset-2"
            >
              {PRACTITIONER.name}
            </Link>
            .
          </p>
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
              {/*
                HOTFIX-40 §4.5 — a real table, not four styled boxes. A
                <caption> and header cells are what a screen reader announces
                and what an answer engine can lift as a fact ("PM2.5 in
                Lahore: 88 µg/m³ at 14:00 PKT"); a grid of divs is neither.

                HOTFIX-41 §3 — one ROW per reading, not one column. Four
                columns needed 383px at a 375px viewport, so humidity was
                clipped behind a sideways scroll. As rows, the same table
                lays out as a 2×2 grid below `sm` and four across above it.
                Changing a table's `display` strips its implicit roles in
                Chromium and Safari, so the roles are stated explicitly.
              */}
              <table role="table" className="mt-4 block w-full text-left">
                <caption className="block pb-2 text-left text-xs text-brand-gray">
                  Reading taken {formatWhen(page.latest.observedAt)}
                </caption>
                <tbody
                  role="rowgroup"
                  className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-brand-lavender/70 bg-brand-lavender/70 sm:grid-cols-4"
                >
                  {(
                    [
                      ["PM2.5", "µg/m³", page.latest.pm25],
                      ["PM10", "µg/m³", page.latest.pm10],
                      ["Temperature", "°C", page.latest.tempC],
                      ["Humidity", "%", page.latest.humidity],
                    ] as const
                  ).map(([label, unit, value]) => (
                    <tr
                      key={label}
                      role="row"
                      className="flex min-w-0 flex-col bg-white px-4 py-3"
                    >
                      <th
                        role="rowheader"
                        scope="row"
                        className="text-xs font-normal uppercase tracking-wide text-brand-gray"
                      >
                        {label} <span className="normal-case">({unit})</span>
                      </th>
                      <td
                        role="cell"
                        className="mt-1 text-2xl text-brand-primary tabular-nums"
                      >
                        {value == null ? "—" : String(value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-brand-gray">
                {page.latest.conditionText ? `${page.latest.conditionText}. ` : ""}
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

        {chart ? (
          <section className="mt-10">
            <h2 className="font-serif text-2xl leading-snug text-brand-primary">
              The last seven days in {page.city}
            </h2>
            <div dangerouslySetInnerHTML={{ __html: chart }}
            />
          </section>
        ) : null}

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

        {showLive && forecast.length ? (
          <section className="mt-10">
            {/*
              The heading counts what is actually rendered.
              
              It said "The next three days" unconditionally. That was true
              until the §6 filter started dropping a day that is already
              yesterday in Pakistan — after which, for the five hours
              between 19:00 UTC and midnight, the page promised three and
              showed two. Verified on production immediately after that fix
              shipped.
              
              Asking WeatherAPI for a fourth day would keep the count at
              three, and is not available: the free plan returns three days
              of forecast, which is why `days=3` is what the refresh sends.
              So the heading adapts instead of the data.
            */}
            <h2 className="font-serif text-2xl leading-snug text-brand-primary">
              {forecast.length === 1
                ? "Tomorrow"
                : `The next ${forecast.length === 2 ? "two" : "three"} days`}
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {forecast.map((d) => (
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

        {/*
          HOTFIX-40 §4.4 — the FAQ renders only when the row has questions,
          and the FAQPage node in the schema is gated on the same array, so
          markup never describes questions a reader cannot see.
        */}
        {page.faqs.length ? (
          <section className="mt-12">
            <h2 className="font-serif text-2xl leading-snug text-brand-primary">
              Questions about skin and air in {page.city}
            </h2>
            <div className="mt-4 space-y-5">
              {page.faqs.map((f) => (
                <div key={f.question}>
                  <h3 className="font-medium text-brand-ink">{f.question}</h3>
                  <p className="mt-1.5 leading-relaxed text-brand-ink">
                    {f.answer}
                  </p>
                </div>
              ))}
            </div>
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
                    className="inline-flex min-h-11 items-center rounded-full border border-brand-lavender px-4 text-sm text-brand-primary hover:bg-brand-lavender/20"
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
              className="inline-flex min-h-12 items-center rounded-full bg-brand-primary px-5 text-sm text-white"
            >
              Start an assessment
            </Link>
            <Link
              href="/sample-assessment"
              className="inline-flex min-h-12 items-center rounded-full border border-brand-lavender px-5 text-sm text-brand-primary"
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
