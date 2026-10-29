import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import PractitionerCard from "@/components/practitioners/PractitionerCard";
import JsonLd from "@/components/seo/JsonLd";
import { firstName } from "@/lib/practitioners/card";
import { directoryIsOpen, getPublicPractitioner, listPublicPractitioners, visitorPrice } from "@/lib/practitioners/directory";
import { getServerPricingRegion } from "@/lib/pricing/geo";
import { breadcrumbSchema, graph, practitionerPersonSchema } from "@/lib/seo/schema";
import { canonicalOg } from "@/lib/seo/site";

/**
 * /practitioners/[slug] (Handover 63 Part 2). Indexed, Person markup with
 * the credential reference, languages and country. Links back to the
 * directory and across to every other practitioner, so no profile is an
 * orphan. Gated with the directory: below three approved practitioners
 * there is nothing to link back to, so the profile 404s too.
 */

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const found = await getPublicPractitioner(slug, null);
  if (!found) return {};
  const p = found.card;
  const title = `${p.name}, ${p.role}${p.countryName ? ` in ${p.countryName}` : ""}`;
  const description =
    `${p.name} reads skin photographs online in ${p.languages.join(" and ") || "English"}.` +
    (p.focus.length ? ` Reads most often: ${p.focus.join(", ").toLowerCase()}.` : "") +
    (p.credentialTitle ? ` ${p.credentialTitle}.` : "");
  return {
    title,
    description,
    ...canonicalOg(`/practitioners/${p.slug}`, { type: "profile", title, description }),
  };
}

export default async function PractitionerProfilePage({ params }: Props) {
  const { slug } = await params;
  if (!(await directoryIsOpen())) notFound();
  const price = visitorPrice(await getServerPricingRegion());
  const [found, all] = await Promise.all([getPublicPractitioner(slug, price), listPublicPractitioners(price)]);
  if (!found) notFound();
  const p = found.card;
  const others = all.filter((o) => o.slug !== p.slug);

  return (
    <>
      <JsonLd
        data={graph(
          practitionerPersonSchema({ ...p, description: found.bio }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Practitioners", path: "/practitioners" },
            { name: p.name, path: `/practitioners/${p.slug}` },
          ]),
        )}
      />
      <section className="px-4 pb-20 pt-12 sm:px-6">
        <div className="mx-auto max-w-[1000px]">
          <nav aria-label="Breadcrumb" className="text-[13px] text-brand-gray">
            <Link href="/practitioners" className="font-semibold text-brand-primary hover:underline">
              ← All practitioners
            </Link>
          </nav>
          <div className="mt-6 grid items-start gap-10 md:grid-cols-[348px_1fr]">
            <PractitionerCard
              p={p}
              headingLevel="h2"
              actions={{ chooseHref: `/onboarding?practitioner=${encodeURIComponent(p.slug)}` }}
            />
            <div>
              <h1 className="font-serif text-[1.9rem] font-semibold leading-tight text-brand-ink sm:text-[2.3rem]">{p.name}</h1>
              <p className="mt-1 font-serif text-lg italic text-brand-primary">{p.role}</p>
              {found.bio ? <p className="mt-5 text-[16px] leading-relaxed text-brand-gray">{found.bio}</p> : null}
              <div className="mt-6 rounded-[14px] border border-brand-lavender/70 bg-brand-surface-alt p-5 text-[15px] leading-relaxed text-brand-gray">
                <p>
                  {firstName(p.name)} can read your photographs wherever you are.
                  {p.countryName ? ` Being in ${p.countryName} affects when they are awake, not whether they can help you.` : ""}
                </p>
                <p className="mt-3">
                  Choosing {firstName(p.name)} records them as your preferred practitioner when you start your assessment.
                </p>
              </div>
            </div>
          </div>

          {others.length ? (
            <div className="mt-16">
              <h2 className="font-sans text-xl font-semibold text-brand-ink">Other practitioners</h2>
              <ul className="mt-4 flex flex-wrap gap-3">
                {others.map((o) => (
                  <li key={o.slug}>
                    <Link
                      href={`/practitioners/${o.slug}`}
                      className="inline-block rounded-full border border-brand-lavender bg-white px-4 py-2 text-[14px] font-semibold text-brand-primary hover:bg-brand-purple-soft"
                    >
                      {o.name}
                      {o.countryName ? <span className="font-normal text-brand-gray">, {o.countryName}</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
