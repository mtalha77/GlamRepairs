import Link from "next/link";
import { redirect } from "next/navigation";

import { WeeklyHours } from "@/components/consultation/ConsultationsAdmin";
import {
  BioForm,
  CannotAttendButton,
  DailyLimitForm,
  LeaveButton,
  PhotoUpload,
  PublicProfileForm,
  TimeOffControls,
} from "@/components/studio/practice/PracticeControls";
import ReferralLink from "@/components/studio/practice/ReferralLink";
import { loadConsultationAdmin } from "@/lib/consultation/admin";
import { formatDay, formatSlotFor, TZ_LABEL } from "@/lib/consultation/format";
import {
  earningsSummary,
  formatFee,
  hasVerifiedDegree,
  missingForLive,
  ownPractitionerProfile,
  weeklyWindowsFor,
} from "@/lib/practitioners/roster";
import { listOwnPayouts } from "@/lib/practitioners/payouts";
import { monthLabel, practitionerMonths, showMoney } from "@/lib/practitioners/revenue";
import { referralPath } from "@/lib/practitioners/referral";
import { abs } from "@/lib/seo/site";
import { requireStudioMember } from "@/lib/studio/member";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Studio → My practice — HANDOVER-52 §4.3 / §4.4.
 *
 * The practitioner's own dashboard: what is still missing before she goes
 * live, her upcoming consultations, the notes she owes, what she has
 * earned, her hours, and the way out (Talha, 10 October 2026: when she
 * leaves, her bookings go to Ayma to attend or hand on).
 */

export const dynamic = "force-dynamic";

const STATUS_COPY: Record<string, string> = {
  pending: "Not live yet. Clients cannot book you until the studio makes your profile live.",
  approved: "Live. Your hours produce times clients can book.",
  suspended: "Paused by the studio. No new times are offered.",
  offboarded: "You have left GlamRepairs. Thank you for your work.",
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-brand-lavender/70 bg-white p-5">
      <h2 className="font-serif text-lg text-brand-primary">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function PracticePage() {
  const { member } = await requireStudioMember();
  if (!member) redirect("/studio/login");

  const profile = await ownPractitionerProfile(member.userId);
  if (!profile) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-2xl text-brand-primary">My practice</h1>
        <p className="text-sm text-brand-gray">
          This account is not linked to a practitioner profile.
          {member.isSuperAdmin ? (
            <>
              {" "}
              Practitioners are managed under{" "}
              <Link href="/studio/practitioners" className="text-brand-primary underline">
                Practitioners
              </Link>
              .
            </>
          ) : null}
        </p>
      </div>
    );
  }

  const [data, earnings, windows, degree, payouts, { data: blackouts }, months, referred] = await Promise.all([
    loadConsultationAdmin({ practitionerId: profile.id }),
    earningsSummary(profile.id),
    weeklyWindowsFor(profile.id),
    hasVerifiedDegree(profile.id),
    listOwnPayouts(profile.id),
    createAdminSupabaseClient()
      .from("practitioner_blackouts")
      .select("id, starts_at, ends_at, reason")
      .eq("practitioner_id", profile.id)
      .gte("ends_at", new Date().toISOString())
      .order("starts_at"),
    practitionerMonths(profile.id),
    createAdminSupabaseClient()
      .from("leads")
      .select("funnel_complete")
      .eq("referred_by_practitioner_id", profile.id)
      .eq("is_test", false)
      .is("deleted_at", null),
  ]);
  const referredStarted = referred.data?.length ?? 0;
  const referredFinished = (referred.data ?? []).filter((l) => l.funnel_complete !== false).length;
  // A block runs to midnight after its last day; show the last day itself.
  const timeOff = (blackouts ?? []).map((b) => {
    const first = formatDay(b.starts_at);
    const last = formatDay(new Date(new Date(b.ends_at).getTime() - 1));
    return { id: b.id, label: first === last ? first : `${first} to ${last}`, reason: b.reason };
  });
  const gone = profile.status === "offboarded";
  const missing = missingForLive({
    photoUrl: profile.photo_url,
    profilePhotoVerified: profile.profile_photo_verified,
    bio: profile.bio ?? "",
    hasVerifiedDegree: degree,
    payoutMethod: profile.payout_method,
    publicConsent: Boolean(profile.public_consent_at),
  });
  const upcoming = data.appointments.filter((a) => !a.ended);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-brand-primary">My practice</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-gray">
          {STATUS_COPY[profile.status] ?? profile.status} All times are Pakistan time ({TZ_LABEL})
          {profile.timezone && profile.timezone !== "Asia/Karachi" ? ", with your own time beside them" : ""}.
        </p>
      </div>

      {missing.length && !gone ? (
        <Card title="Before you go live">
          <ul className="list-disc space-y-1 pl-5 text-sm text-brand-ink">
            {missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      {!gone ? (
        <>
          <Card title="Your photograph">
            <PhotoUpload current={profile.photo_url} />
          </Card>

          <Card title="Your bio">
            <p className="mb-2 text-sm text-brand-gray">Shown to clients beside your name. Plain words, your training and what you look for.</p>
            <BioForm initial={profile.bio ?? ""} />
          </Card>

          <Card title="Your public profile">
            <p className="mb-3 text-sm text-brand-gray">
              {profile.public_consent_at
                ? "Shown on the website. You agreed on " + formatDay(profile.public_consent_at) + "."
                : "Not shown anywhere yet. Nothing about you appears on the website until you tick the box below."}
            </p>
            <PublicProfileForm
              city={profile.city ?? ""}
              yearsExperience={profile.years_experience === null ? "" : String(profile.years_experience)}
              specialisms={(profile.specialisms ?? []).join(", ")}
              languages={(profile.languages ?? []).join(", ")}
              consented={Boolean(profile.public_consent_at)}
            />
          </Card>
        </>
      ) : null}

      {profile.status === "approved" && profile.slug ? (
        <Card title="Your link for your clients">
          <ReferralLink url={abs(referralPath(profile.slug))} name={profile.full_name?.split(" ")[0] ?? "you"} />
          {referredStarted ? (
            <p className="mt-3 text-sm text-brand-ink">
              {referredStarted} {referredStarted === 1 ? "client has" : "clients have"} started through your link, {referredFinished}{" "}
              finished the assessment.
            </p>
          ) : null}
        </Card>
      ) : null}

      <Card title="Upcoming consultations">
        {upcoming.length ? (
          <ul className="divide-y divide-brand-lavender/60">
            {upcoming.map((a) => (
              <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0 text-sm">
                  <p className="font-medium text-brand-ink">{formatSlotFor(a.startsAt, profile.timezone)}</p>
                  <p className="text-brand-gray">{a.clientName}</p>
                  {a.joinUrl ? (
                    <a href={a.joinUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-10 items-center text-brand-primary underline">
                      Join the video call
                    </a>
                  ) : (
                    <p className="mt-1 text-brand-gray">The video link is created before the call.</p>
                  )}
                </div>
                {!gone ? <CannotAttendButton appointmentId={a.id} when={formatSlotFor(a.startsAt, profile.timezone)} /> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-brand-gray">Nothing booked yet.</p>
        )}
      </Card>

      <Card title="Notes due">
        {data.notesDue.length ? (
          <ul className="divide-y divide-brand-lavender/60">
            {data.notesDue.map((n) => (
              <li key={n.appointmentId} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <span className="text-brand-ink">
                  {formatSlotFor(n.startsAt, profile.timezone)} · {n.clientLabel}
                  {n.heldMinor ? <span className="text-brand-gray"> · {formatFee(n.heldMinor)} held until the note is written</span> : null}
                </span>
                <Link href={`/studio/consultations/${n.appointmentId}/note`} className="inline-flex min-h-10 items-center text-brand-primary underline">
                  Write the note
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-brand-gray">No notes outstanding.</p>
        )}
      </Card>

      <Card title="Earnings">
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-brand-gray">To be paid</dt>
            <dd className="text-lg text-brand-ink">{formatFee(earnings.payableMinor)}</dd>
          </div>
          <div>
            <dt className="text-brand-gray">Held for notes</dt>
            <dd className="text-lg text-brand-ink">{formatFee(earnings.heldMinor)}</dd>
          </div>
          <div>
            <dt className="text-brand-gray">Paid this month</dt>
            <dd className="text-lg text-brand-ink">{formatFee(earnings.paidThisMonthMinor)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-brand-gray">
          Each month runs from the 1st to its last day. It is paid by the 5th of the next month.
        </p>
        {/* Talha, 29 October 2026: revenue by month, and what has been
            released, in every practitioner's own portal. */}
        {months.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[30rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-brand-gray">
                <tr>
                  <th className="py-2 pr-3 font-medium">Month</th>
                  <th className="py-2 pr-3 font-medium">Consultations</th>
                  <th className="py-2 pr-3 font-medium">Earned</th>
                  <th className="py-2 pr-3 font-medium">Released</th>
                  <th className="py-2 font-medium">Still to come</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-lavender/60 border-t border-brand-lavender/60">
                {months.map((m) => (
                  <tr key={m.month}>
                    <td className="py-2 pr-3 text-brand-ink">{monthLabel(m.month)}</td>
                    <td className="py-2 pr-3 tabular-nums">{m.consultations}</td>
                    <td className="py-2 pr-3 tabular-nums">{showMoney(m.earned)}</td>
                    <td className="py-2 pr-3 tabular-nums text-brand-success-strong">{showMoney(m.released)}</td>
                    <td className="py-2 tabular-nums">{showMoney(m.awaiting)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-brand-gray">Your monthly revenue appears here after your first consultation.</p>
        )}
        {payouts.length ? (
          <ul className="mt-4 divide-y divide-brand-lavender/60 border-t border-brand-lavender/60 text-sm">
            {payouts.map((p) => (
              <li key={p.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span className="text-brand-ink">
                  {p.period_start.slice(0, 7)} · {formatFee(p.total_minor)}
                </span>
                <span className="text-brand-gray">
                  {p.status === "paid" ? `Paid, reference ${p.reference}` : "Approved, payment on its way"} ·{" "}
                  <Link href={`/studio/practice/statements/${p.id}`} className="text-brand-primary underline">
                    Statement
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      {!gone ? (
        <>
          <Card title="Your hours">
            <p className="mb-3 text-sm text-brand-gray">Clients can only book inside these hours. Change them whenever you like.</p>
            <WeeklyHours initial={windows} defaultSlot={data.defaultSlotMinutes} readOnly={false} practitionerId={profile.id} timezone={profile.timezone} />
            <div className="mt-5 border-t border-brand-lavender/60 pt-4">
              <DailyLimitForm initial={profile.max_per_day} />
            </div>
          </Card>

          <Card title="Time off">
            <p className="mb-3 text-sm text-brand-gray">Block whole days, for a wedding or a holiday, and no times are offered on them.</p>
            <TimeOffControls blocks={timeOff} />
          </Card>

          {member.isSuperAdmin ? null : (
            <Card title="Leaving GlamRepairs">
              <LeaveButton />
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}
