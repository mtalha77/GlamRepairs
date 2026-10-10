import Link from "next/link";
import { redirect } from "next/navigation";

import { WeeklyHours } from "@/components/consultation/ConsultationsAdmin";
import { BioForm, CannotAttendButton, LeaveButton, PhotoUpload } from "@/components/studio/practice/PracticeControls";
import { loadConsultationAdmin } from "@/lib/consultation/admin";
import { formatSlot, TZ_LABEL } from "@/lib/consultation/format";
import {
  earningsSummary,
  formatRupees,
  hasVerifiedDegree,
  missingForLive,
  ownPractitionerProfile,
  weeklyWindowsFor,
} from "@/lib/practitioners/roster";
import { requireStudioMember } from "@/lib/studio/member";

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

  const [data, earnings, windows, degree] = await Promise.all([
    loadConsultationAdmin({ practitionerId: profile.id }),
    earningsSummary(profile.id),
    weeklyWindowsFor(profile.id),
    hasVerifiedDegree(profile.id),
  ]);
  const gone = profile.status === "offboarded";
  const missing = missingForLive({
    photoUrl: profile.photo_url,
    profilePhotoVerified: profile.profile_photo_verified,
    bio: profile.bio ?? "",
    hasVerifiedDegree: degree,
    payoutMethod: profile.payout_method,
  });
  const upcoming = data.appointments.filter((a) => !a.ended);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-brand-primary">My practice</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-gray">
          {STATUS_COPY[profile.status] ?? profile.status} All times are Pakistan time ({TZ_LABEL}).
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

      <Card title="Upcoming consultations">
        {upcoming.length ? (
          <ul className="divide-y divide-brand-lavender/60">
            {upcoming.map((a) => (
              <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0 text-sm">
                  <p className="font-medium text-brand-ink">{formatSlot(a.startsAt)}</p>
                  <p className="text-brand-gray">{a.clientName}</p>
                  {a.joinUrl ? (
                    <a href={a.joinUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-10 items-center text-brand-primary underline">
                      Join the video call
                    </a>
                  ) : (
                    <p className="mt-1 text-brand-gray">The video link is created before the call.</p>
                  )}
                </div>
                {!gone ? <CannotAttendButton appointmentId={a.id} when={formatSlot(a.startsAt)} /> : null}
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
                  {formatSlot(n.startsAt)} · {n.clientLabel}
                  {n.heldMinor ? <span className="text-brand-gray"> · {formatRupees(n.heldMinor)} held until the note is written</span> : null}
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
            <dd className="text-lg text-brand-ink">{formatRupees(earnings.payableMinor)}</dd>
          </div>
          <div>
            <dt className="text-brand-gray">Held for notes</dt>
            <dd className="text-lg text-brand-ink">{formatRupees(earnings.heldMinor)}</dd>
          </div>
          <div>
            <dt className="text-brand-gray">Paid this month</dt>
            <dd className="text-lg text-brand-ink">{formatRupees(earnings.paidThisMonthMinor)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-brand-gray">Paid monthly, by the 5th, for the month before.</p>
      </Card>

      {!gone ? (
        <>
          <Card title="Your photograph">
            <PhotoUpload current={profile.photo_url} />
          </Card>

          <Card title="Your bio">
            <p className="mb-2 text-sm text-brand-gray">Shown to clients beside your name. Plain words, your training and what you look for.</p>
            <BioForm initial={profile.bio ?? ""} />
          </Card>

          <Card title="Your hours">
            <WeeklyHours initial={windows} defaultSlot={data.defaultSlotMinutes} readOnly={false} practitionerId={profile.id} />
          </Card>

          <Card title="Leaving GlamRepairs">
            <LeaveButton />
          </Card>
        </>
      ) : null}
    </div>
  );
}
