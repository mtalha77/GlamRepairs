import { redirect } from "next/navigation";

import MediaGrid from "@/components/studio/media/MediaGrid";
import MediaUploader from "@/components/studio/media/MediaUploader";
import { listMedia, mediaUsage } from "@/lib/studio/media";
import { MEDIA_ROLES, type MediaRole } from "@/lib/studio/mediaProcess";
import { requireStudioMember } from "@/lib/studio/member";

/** Studio → Media — HANDOVER-45 §3.1–3.2. */
export const dynamic = "force-dynamic";

export default async function StudioMediaPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; q?: string }>;
}) {
  const { user, member } = await requireStudioMember();
  if (!user) redirect("/studio/login");
  if (!member) redirect("/studio/no-access");

  const params = await searchParams;
  const role = (MEDIA_ROLES as readonly string[]).includes(params.role ?? "")
    ? (params.role as MediaRole)
    : null;
  const q = params.q?.trim() || null;

  const items = await listMedia({ role, q });
  const usage = Object.fromEntries(await mediaUsage(items));

  return (
    <div className="space-y-8 px-6 py-8">
      <header>
        <h1 className="text-2xl font-semibold">Media</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-500">
          Every image is converted to WebP, kept under 500 KB, stored with its
          real width and height, and saved only with alt text. Your own
          photographs beat stock: this is a service where a real person reads
          your skin.
        </p>
      </header>

      <MediaUploader />

      <section className="space-y-4">
        <form className="flex flex-wrap items-end gap-3" action="/studio/media">
          <label className="text-sm">
            <span className="block text-neutral-500">Search</span>
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="File name or alt text"
              className="mt-1 min-h-10 rounded-lg border border-neutral-300 px-3 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="block text-neutral-500">Used as</span>
            <select
              name="role"
              defaultValue={role ?? ""}
              className="mt-1 min-h-10 rounded-lg border border-neutral-300 px-3 text-sm"
            >
              <option value="">All</option>
              <option value="hero">Post hero</option>
              <option value="og">Social card</option>
              <option value="inline">In an article</option>
              <option value="icon">Icon</option>
            </select>
          </label>
          <button className="min-h-10 rounded-full bg-neutral-900 px-4 text-sm text-white">Filter</button>
          <span className="text-sm text-neutral-500">
            {items.length} {items.length === 1 ? "image" : "images"}
          </span>
        </form>

        <MediaGrid items={items} usage={usage} />
      </section>
    </div>
  );
}
