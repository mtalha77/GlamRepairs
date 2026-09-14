import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";

/**
 * HANDOVER-23 §2.10 — the studio's loading state.
 *
 * Every page in this group is `force-dynamic` and fetches before it can
 * render, so until now navigating between studio screens showed the old
 * page frozen until the server answered. A `loading.tsx` in the group gives
 * Next something to stream immediately, which is what turns a freeze into a
 * transition.
 *
 * Shaped like a list screen rather than like nothing in particular:
 * customers, blog posts, the duplicate queue and the logs are all a heading
 * plus a stack of rows, so one skeleton covers the group honestly. The row
 * heights match the real ones, so the content lands without the page
 * jumping.
 */
export default function StudioLoading() {
  return (
    <SkeletonScreen label="Loading" className="px-6 py-8">
      <Skeleton className="h-7 w-52" />
      <Skeleton className="mt-3 h-4 w-80" />

      <div className="mt-8 space-y-2.5">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 rounded-xl border border-brand-border-light/60 px-4 py-4"
          >
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </SkeletonScreen>
  );
}
