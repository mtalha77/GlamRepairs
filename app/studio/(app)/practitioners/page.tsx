import Link from "next/link";
import { redirect } from "next/navigation";

import {
  PhotoUpload,
  PractitionerDetailsForm,
  PractitionerStatusButtons,
  RateForm,
} from "@/components/studio/practice/PracticeControls";
import { formatRupees, listPractitioners, missingForLive } from "@/lib/practitioners/roster";
import { requireStudioMember } from "@/lib/studio/member";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Studio → Practitioners — HANDOVER-52 §3.3, §4.3, §5.
 *
 * Super admin only. Rates, the checks before a profile goes live,
 * suspension and offboarding. Offboarding hands every future booking to
 * Ayma; anything that cannot move (she is already booked then) comes back
 * as a notification to sort by hand.
 */

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending: "Not live",
  approved: "Live",
  suspended: "Suspended",
  offboarded: "Left",
};

export default async function PractitionersPage() {
  const { member } = await requireStudioMember();
  if (!member) redirect("/studio/login");
  if (!member.isSuperAdmin) redirect("/studio");

  const practitioners = await listPractitioners();
  const { data: apps } = practitioners.length
    ? await createAdminSupabaseClient()
        .from("practitioner_applications")
        .select("id, profile_id")
        .in("profile_id", practitioners.map((p) => p.id))
    : { data: [] };
  const appFor = new Map((apps ?? []).map((a) => [a.profile_id, a.id]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-brand-primary">Practitioners</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-gray">
          Who takes consultations, what they are paid, and what is still missing before they go live. New practitioners
          come through{" "}
          <Link href="/studio/applications" className="text-brand-primary underline">
            Applications
          </Link>
          .
        </p>
      </div>

      {practitioners.length ? (
        practitioners.map((p) => {
          const missing = missingForLive(p);
          const appId = appFor.get(p.id);
          return (
            <section key={p.id} className="space-y-5 rounded-2xl border border-brand-lavender/70 bg-white p-5">
              <header className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2 className="font-serif text-lg text-brand-primary">{p.fullName}</h2>
                  <p className="text-sm text-brand-gray">
                    {[p.title, p.credentials].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <p className="text-sm text-brand-ink">
                  <span className="rounded-full bg-brand-purple-soft px-2.5 py-1">{STATUS_LABEL[p.status] ?? p.status}</span>
                  <span className="ml-2 text-brand-gray">
                    {p.upcoming} upcoming · {formatRupees(p.feeMinor)} to them, {formatRupees(p.platformMinor)} to us per call
                  </span>
                </p>
              </header>

              {missing.length && p.status !== "offboarded" ? (
                <div className="rounded-xl bg-brand-cream-card px-4 py-3 text-sm">
                  <p className="font-medium text-brand-ink">Missing</p>
                  <ul className="mt-1 list-disc pl-5 text-brand-gray">
                    {missing.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                  {p.status === "approved" ? (
                    <p className="mt-2 text-xs text-brand-gray">Already live. These are checked only when a profile is made live.</p>
                  ) : null}
                </div>
              ) : null}

              {!p.hasAccount ? <p className="text-sm text-brand-gray">No sign-in account linked yet.</p> : null}

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-brand-ink">Photograph</h3>
                  <PhotoUpload current={p.photoUrl} profileId={p.id} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-brand-ink">Checks, payout and capacity</h3>
                  <PractitionerDetailsForm
                    id={p.id}
                    profilePhotoVerified={p.profilePhotoVerified}
                    payoutMethod={p.payoutMethod}
                    payoutDetailRef={p.payoutDetailRef}
                    maxPerDay={p.maxPerDay}
                    maxPerWeek={p.maxPerWeek}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-brand-ink">Rate per consultation</h3>
                <p className="text-xs text-brand-gray">A change applies to bookings made from now; existing bookings keep the rate they were booked at.</p>
                <RateForm id={p.id} feeMinor={p.feeMinor} platformMinor={p.platformMinor} />
              </div>

              <div className="flex flex-wrap items-start justify-between gap-4 border-t border-brand-lavender/60 pt-4">
                <PractitionerStatusButtons id={p.id} status={p.status} name={p.fullName} />
                {appId ? (
                  <Link href={`/studio/applications/${appId}`} className="inline-flex min-h-10 items-center text-sm text-brand-primary underline">
                    Application and documents
                  </Link>
                ) : null}
              </div>
            </section>
          );
        })
      ) : (
        <p className="text-sm text-brand-gray">No practitioners yet.</p>
      )}
    </div>
  );
}
