import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";

/**
 * HANDOVER-23 §2.10 — the completion screen's loading state.
 *
 * This is the moment §2.10 names first: "while an assessment submits". The
 * route resolves the visitor's pricing region before it can render the
 * payment amount, and someone who has just pressed the final button on a
 * 26-step form is the least willing person on the site to look at a blank
 * screen.
 *
 * Shaped like the card that is arriving — same width, same rounding, same
 * vertical rhythm — so the real content lands in place rather than shifting
 * the page under the reader.
 */
export default function OnboardingCompleteLoading() {
  return (
    <SkeletonScreen
      label="Finishing your submission"
      className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-b from-brand-purple-soft via-white to-brand-lavender/30 px-4 py-10 sm:px-6"
    >
      <div className="w-full max-w-[28rem] rounded-[2rem] border border-brand-lavender/60 bg-white px-7 pb-9 pt-8 shadow-sm sm:max-w-[32rem] sm:px-9">
        <Skeleton className="mx-auto h-14 w-14 rounded-full" />
        <Skeleton className="mx-auto mt-5 h-7 w-3/5" />
        <Skeleton className="mx-auto mt-3 h-4 w-4/5" />

        <div className="mt-8 space-y-2.5 rounded-2xl border border-brand-border-light/60 p-5">
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3.5 w-1/2" />
        </div>

        <Skeleton className="mt-7 h-12 w-full rounded-full" />
      </div>
    </SkeletonScreen>
  );
}
