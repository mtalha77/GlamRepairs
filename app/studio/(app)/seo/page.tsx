import Link from "next/link";
import { redirect } from "next/navigation";

import PageSeoEditor, { type OgOption } from "@/components/studio/seo/PageSeoEditor";
import SeoSettingsForm from "@/components/studio/seo/SeoSettingsForm";
import { listMedia } from "@/lib/studio/media";
import { requireStudioMember } from "@/lib/studio/member";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Studio → SEO — HANDOVER-45 §3.4.
 *
 * Pages: the title, description, H1 and social image of every static page,
 * from `page_seo`. Site defaults: the brand, title suffix, default social
 * image, organisation type and social profiles, from `seo_settings`. Saves
 * go live on the next request, without a deploy.
 */
export const dynamic = "force-dynamic";

export default async function StudioSeoPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { user, member } = await requireStudioMember();
  if (!user) redirect("/studio/login");
  if (!member) redirect("/studio/no-access");

  const tab = (await searchParams).tab === "site" ? "site" : "pages";
  const supabase = await createServerSupabaseClient();
  const [{ data: pages }, { data: settings }, media] = await Promise.all([
    supabase
      .from("page_seo")
      .select("path, title, meta_description, h1, og_image_media_id, noindex, canonical_override, updated_at")
      .order("path"),
    supabase
      .from("seo_settings")
      .select("brand_name, title_suffix, default_og_media_id, twitter_handle, organization_type, same_as")
      .eq("id", 1)
      .maybeSingle(),
    listMedia(),
  ]);

  // Social cards first: they are the ones sized for the job.
  const ogOptions: OgOption[] = media
    .filter((m) => m.role === "og" || m.role === "hero")
    .sort((a, b) => Number(b.role === "og") - Number(a.role === "og"))
    .map((m) => ({
      id: m.id,
      label: `${m.filename} (${m.width} × ${m.height})`,
      url: m.publicUrl,
      isOg: m.role === "og" && m.width === 1200 && m.height === 630,
    }));

  const suffix = settings?.title_suffix ?? "";
  const tabClass = (active: boolean) =>
    `inline-flex min-h-10 items-center rounded-full px-4 text-sm ${
      active ? "bg-neutral-900 text-white" : "border border-neutral-300 text-neutral-700"
    }`;

  return (
    <div className="space-y-6 px-6 py-8">
      <header>
        <h1 className="text-2xl font-semibold">SEO</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-500">
          How each page appears in Google and when shared. Titles are 35 to 45 characters
          before the suffix, descriptions 140 to 160, and no em dashes: the same rules the
          database enforces, shown as you type.
        </p>
        <nav className="mt-4 flex gap-2" aria-label="SEO sections">
          <Link href="/studio/seo" className={tabClass(tab === "pages")}>
            Pages
          </Link>
          <Link href="/studio/seo?tab=site" className={tabClass(tab === "site")}>
            Site defaults
          </Link>
        </nav>
      </header>

      {tab === "pages" ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {(pages ?? []).map((p) => (
            <PageSeoEditor
              key={p.path}
              suffix={suffix}
              ogOptions={ogOptions}
              row={{
                path: p.path,
                title: p.title,
                metaDescription: p.meta_description,
                h1: p.h1 ?? "",
                ogImageMediaId: p.og_image_media_id,
                noindex: p.noindex,
                canonicalOverride: p.canonical_override ?? "",
                updatedAt: p.updated_at,
              }}
            />
          ))}
        </div>
      ) : settings ? (
        <SeoSettingsForm
          ogOptions={ogOptions}
          initial={{
            brandName: settings.brand_name,
            titleSuffix: settings.title_suffix,
            defaultOgMediaId: settings.default_og_media_id,
            twitterHandle: settings.twitter_handle ?? "",
            organizationType: settings.organization_type,
            sameAs: (settings.same_as ?? []).join("\n"),
          }}
        />
      ) : (
        <p className="text-sm text-red-700">The site settings row is missing.</p>
      )}
    </div>
  );
}
