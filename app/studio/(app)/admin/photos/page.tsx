import Link from "next/link";
import { notFound } from "next/navigation";

import PhotoRetentionTable from "@/components/studio/PhotoRetentionTable";
import { requireStudioMember } from "@/lib/studio/member";
import {
  PHOTO_STATE_DESCRIPTION,
  PHOTO_STATE_LABEL,
  PHOTO_STATE_ORDER,
  getPhotoStateCounts,
  isPhotoState,
  listPhotoStatus,
  type PhotoState,
} from "@/lib/studio/photoRetention";

/**
 * HANDOVER-19 — the photo retention screen.
 *
 * Defaults to `overdue` so the problem is visible the moment the page opens,
 * rather than being something you have to go looking for. When 23 leads are
 * past their deletion date, a screen that opens on "all" and sorts by date
 * is a screen that reports nothing.
 */

type PhotosAdminPageProps = {
  searchParams: Promise<{
    state?: string;
    photos?: string;
    leads?: string;
    count?: string;
    error?: string;
    message?: string;
  }>;
};

export default async function PhotosAdminPage({
  searchParams,
}: PhotosAdminPageProps) {
  const { member } = await requireStudioMember();
  // Not a redirect: a practitioner has no business knowing this screen
  // exists, and a 404 says less than "you are not allowed in here".
  if (!member?.isSuperAdmin) {
    notFound();
  }

  const query = await searchParams;
  const requested = query.state ?? "overdue";
  const state: PhotoState | undefined =
    requested === "all" ? undefined : isPhotoState(requested) ? requested : "overdue";

  const [rows, counts] = await Promise.all([
    listPhotoStatus(state),
    getPhotoStateCounts(),
  ]);

  const totalLeads = PHOTO_STATE_ORDER.reduce(
    (sum, key) => sum + counts[key].leads,
    0,
  );
  const overdue = counts.overdue;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-brand-primary">
          Photo retention
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-gray">
          Every client&rsquo;s photographs and how long they have left. Deleting
          here removes the image files from storage and keeps the client
          record, the assessment and the report.
        </p>
      </div>

      {query.photos === "deleted" ? (
        <p className="rounded-2xl border border-brand-primary/30 bg-brand-lavender/20 px-4 py-3 text-sm text-brand-ink">
          Deleted {query.count ?? "0"} photograph
          {query.count === "1" ? "" : "s"}
          {query.leads ? ` for ${query.leads} client${query.leads === "1" ? "" : "s"}` : ""}.
        </p>
      ) : null}
      {query.error ? (
        <p className="rounded-2xl border border-brand-error/30 bg-brand-error/5 px-4 py-3 text-sm text-brand-ink">
          {query.message ?? "Something went wrong."}
        </p>
      ) : null}

      {overdue.leads > 0 ? (
        <div className="rounded-2xl border border-brand-error/30 bg-brand-error/5 px-4 py-3.5">
          <p className="text-sm leading-relaxed text-brand-ink">
            <strong className="font-medium">
              {overdue.leads} client{overdue.leads === 1 ? " is" : "s are"} past
              the 30-day retention date
            </strong>{" "}
            with {overdue.photos} photograph{overdue.photos === 1 ? "" : "s"}{" "}
            still in storage. The automatic sweep runs daily — if this number
            does not fall, the sweep is not running.
          </p>
        </div>
      ) : null}

      <nav className="flex flex-wrap gap-2" aria-label="Filter by photo state">
        {PHOTO_STATE_ORDER.map((key) => {
          const active = state === key;
          return (
            <Link
              key={key}
              href={`/studio/admin/photos?state=${key}`}
              aria-current={active ? "page" : undefined}
              title={PHOTO_STATE_DESCRIPTION[key]}
              className={`rounded-full px-4 py-2 text-sm transition-colors ${
                active
                  ? "bg-brand-primary text-white"
                  : "border border-brand-lavender/70 bg-white text-brand-gray hover:text-brand-ink"
              }`}
            >
              {PHOTO_STATE_LABEL[key]}
              <span className="ml-1.5 tabular-nums opacity-70">
                {counts[key].leads}
              </span>
            </Link>
          );
        })}
        <Link
          href="/studio/admin/photos?state=all"
          aria-current={state === undefined ? "page" : undefined}
          className={`rounded-full px-4 py-2 text-sm transition-colors ${
            state === undefined
              ? "bg-brand-primary text-white"
              : "border border-brand-lavender/70 bg-white text-brand-gray hover:text-brand-ink"
          }`}
        >
          All
          <span className="ml-1.5 tabular-nums opacity-70">{totalLeads}</span>
        </Link>
      </nav>

      {state ? (
        <p className="text-sm text-brand-gray">{PHOTO_STATE_DESCRIPTION[state]}</p>
      ) : null}

      <PhotoRetentionTable rows={rows} canDelete />
    </div>
  );
}
