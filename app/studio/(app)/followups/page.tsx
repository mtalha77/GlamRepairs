import Link from "next/link";
import { notFound } from "next/navigation";

import FollowupControls from "@/components/studio/FollowupControls";
import { listFollowups, type FollowupRow } from "@/lib/studio/followups";
import { formatStudioDateTime } from "@/lib/studio/formatDate";
import { canManageClients, requireStudioMember } from "@/lib/studio/member";

/**
 * Studio → Follow-ups — Talha, 20 October 2026: clients hear from us 15 and
 * 30 days after their report, by email and WhatsApp. The email is sent
 * automatically; each WhatsApp is one press here, from the business phone.
 */

export const dynamic = "force-dynamic";

const card = "rounded-2xl border border-brand-lavender/70 bg-white p-5";

function Row({ f, actions }: { f: FollowupRow; actions: boolean }) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 py-3">
      <div className="min-w-0 text-sm">
        <Link href={`/studio/customers/${f.leadId}`} className="font-medium text-brand-primary underline underline-offset-2">
          {f.name}
        </Link>
        <span className="text-brand-gray"> · {f.ref}</span>
        <p className="mt-0.5 text-brand-gray">
          {f.sequence === 1 ? "15 day" : "30 day"} check-in, due {formatStudioDateTime(f.dueAt)}
        </p>
        <p className="mt-0.5 text-xs text-brand-gray">
          Email: {f.emailSentAt ? `sent ${formatStudioDateTime(f.emailSentAt)}` : "not sent"} · WhatsApp:{" "}
          {f.whatsappSentAt ? `sent ${formatStudioDateTime(f.whatsappSentAt)}` : "not sent"}
          {f.status !== "pending" ? ` · ${f.status}` : ""}
        </p>
      </div>
      {actions ? <FollowupControls id={f.id} whatsappHref={f.whatsappHref} whatsappSent={Boolean(f.whatsappSentAt)} /> : null}
    </li>
  );
}

export default async function FollowupsPage() {
  const { member } = await requireStudioMember();
  if (!canManageClients(member)) notFound();
  const { due, upcoming, closed } = await listFollowups();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-brand-primary">Follow-ups</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-gray">
          Every client is checked on 15 and 30 days after their report. The email goes by itself. Send the WhatsApp from here: it opens
          with the message written, from whichever phone you are on, so use the business number.
        </p>
      </div>

      <section className={card}>
        <h2 className="font-serif text-lg text-brand-primary">Due now</h2>
        {due.length ? (
          <ul className="mt-2 divide-y divide-brand-lavender/60">
            {due.map((f) => (
              <Row key={f.id} f={f} actions />
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-brand-gray">Nothing due.</p>
        )}
      </section>

      <section className={card}>
        <h2 className="font-serif text-lg text-brand-primary">Coming up</h2>
        {upcoming.length ? (
          <ul className="mt-2 divide-y divide-brand-lavender/60">
            {upcoming.map((f) => (
              <Row key={f.id} f={f} actions={false} />
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-brand-gray">None scheduled. They are added when a report is sent.</p>
        )}
      </section>

      {closed.length ? (
        <section className={card}>
          <h2 className="font-serif text-lg text-brand-primary">Closed in the last two weeks</h2>
          <ul className="mt-2 divide-y divide-brand-lavender/60">
            {closed.map((f) => (
              <Row key={f.id} f={f} actions={false} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
