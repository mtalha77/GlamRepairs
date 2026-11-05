import Link from "next/link";
import { redirect } from "next/navigation";

import { CsvImport, PauseControl, SettingsForm, SuppressForm } from "@/components/studio/outreach/OutreachAdmin";
import { formatDay } from "@/lib/consultation/format";
import { loadOutreachDashboard, rate } from "@/lib/outreach/studio";
import { requireStudioMember } from "@/lib/studio/member";

export const dynamic = "force-dynamic";

const card = "space-y-3 rounded-2xl border border-brand-lavender/70 bg-white p-5";
const h2 = "font-serif text-lg text-brand-primary";

/**
 * Studio > Outreach (Handovers 68 and 69). Super admin only. Every gate the
 * queue applies is visible here, so "why did nothing send" has an answer on
 * the page.
 */
export default async function OutreachPage() {
  const { member } = await requireStudioMember();
  if (!member) redirect("/studio/login");
  if (!member.isSuperAdmin) redirect("/studio");

  const d = await loadOutreachDashboard();
  const s = d.settings;
  const m = d.metrics;
  const tile = (title: string, value: string, note?: string, strong?: boolean) => (
    <div className={`rounded-xl border p-3 ${strong ? "border-brand-primary/40 bg-brand-lavender/30" : "border-brand-lavender/60"}`}>
      <p className="text-xs uppercase tracking-[0.06em] text-brand-gray">{title}</p>
      <p className={`mt-1 font-serif ${strong ? "text-2xl text-brand-primary" : "text-xl text-brand-ink"}`}>{value}</p>
      {note ? <p className="mt-0.5 text-xs text-brand-gray">{note}</p> : null}
    </div>
  );

  const gates: { ok: boolean; text: string }[] = [
    { ok: d.config.ok, text: d.config.ok ? `Sending account set, from ${d.config.from}` : d.config.reason },
    { ok: d.config.ok && d.config.webhook, text: d.config.ok && d.config.webhook ? "Webhook signing secret set" : "OUTREACH_RESEND_WEBHOOK_SECRET not set: bounces and complaints will not be recorded" },
    { ok: Boolean(s?.business_address?.trim()), text: s?.business_address?.trim() ? "Business address set" : "No business address: nothing sends without one" },
    { ok: !s?.paused, text: s?.paused ? `Paused: ${s.paused_reason ?? "no reason recorded"}` : "Not paused" },
    { ok: true, text: s?.non_pk_enabled ? "Sending outside Pakistan is on" : "Pakistan only (outside Pakistan is gated pending legal advice)" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-brand-primary">Outreach</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-brand-gray">
          Lists come in by CSV with a recorded source. Nothing sends until a list is enrolled, the sequence is switched on with no
          blanks, the address is marked valid, and it is a weekday in business hours where the recipient is. The hourly run
          stops by itself if bounces pass {s?.bounce_pause_pct ?? 2}% or complaints pass {s?.complaint_pause_pct ?? 0.1}% of the
          last 100 sends.
        </p>
      </div>

      <section className={card}>
        <h2 className={h2}>Can it send?</h2>
        <ul className="space-y-1 text-sm">
          {gates.map((g) => (
            <li key={g.text} className={g.ok ? "text-brand-success-strong" : "text-brand-error-strong"}>
              {g.ok ? "Yes: " : "No: "}
              {g.text}
            </li>
          ))}
        </ul>
        <PauseControl paused={Boolean(s?.paused)} />
      </section>

      <section className={card}>
        <h2 className={h2}>Last 30 days</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tile("Reply rate", `${rate(m.replied, m.sent30)}%`, `${m.replied} replied`, true)}
          {tile("Sent", String(m.sent30), `${m.sent7} in the last 7 days`)}
          {tile("Delivered", `${rate(m.delivered, m.sent30)}%`)}
          {tile("Bounced", `${rate(m.bounced, m.sent30)}%`, `${m.bounced} sends`)}
          {tile("Complaints", `${rate(m.complained, m.sent30)}%`, `${m.complained} sends`)}
          {tile("Unsubscribed", `${rate(m.unsubscribed, m.sent30)}%`, `${m.unsubscribed} people`)}
        </div>
        <p className="text-xs text-brand-gray">
          Opens: {rate(m.opened, m.sent30)}%. Not a reliable number: Apple Mail opens every email it receives.
        </p>
      </section>

      <section className={card}>
        <h2 className={h2}>Sequences</h2>
        {d.sequences.map((q) => (
          <div key={q.id} className="space-y-2 border-t border-brand-lavender/50 pt-3 first:border-0 first:pt-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Link href={`/studio/outreach/sequences/${q.code}`} className="font-medium text-brand-primary underline-offset-2 hover:underline">
                {q.name}
              </Link>
              <span className={`text-sm ${q.active ? "text-brand-success-strong" : "text-brand-gray"}`}>
                {q.active ? "On" : q.blanks.length ? `Off, ${q.blanks.length} blank${q.blanks.length === 1 ? "" : "s"} to fill` : "Off"} · {q.enrolled} enrolled,{" "}
                {q.activeEnrolments} in progress
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.06em] text-brand-gray">
                  <tr>
                    <th className="py-1 pr-3 font-medium">Step</th>
                    <th className="py-1 pr-3 font-medium">Subject</th>
                    <th className="py-1 pr-3 font-medium">Sent</th>
                    <th className="py-1 pr-3 font-medium">Delivered</th>
                    <th className="py-1 pr-3 font-medium">Bounced</th>
                    <th className="py-1 pr-3 font-medium">Replied</th>
                    <th className="py-1 font-medium">Unsubscribed</th>
                  </tr>
                </thead>
                <tbody>
                  {q.steps.map((st) => (
                    <tr key={st.step_no} className="border-t border-brand-lavender/40">
                      <td className="py-1 pr-3">
                        {st.step_no} (day {st.delay_days})
                      </td>
                      <td className="py-1 pr-3 text-brand-ink">{st.subject}</td>
                      <td className="py-1 pr-3">{st.sent}</td>
                      <td className="py-1 pr-3">{st.delivered}</td>
                      <td className="py-1 pr-3">{st.bounced}</td>
                      <td className="py-1 pr-3 font-medium text-brand-primary">{st.replied}</td>
                      <td className="py-1">{st.unsubscribed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>

      <section className={card}>
        <h2 className={h2}>Lists</h2>
        {d.lists.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.06em] text-brand-gray">
                <tr>
                  <th className="py-2 pr-3 font-medium">List</th>
                  <th className="py-2 pr-3 font-medium">For</th>
                  <th className="py-2 pr-3 font-medium">Contacts</th>
                  <th className="py-2 pr-3 font-medium">Valid</th>
                  <th className="py-2 pr-3 font-medium">Unchecked</th>
                  <th className="py-2 pr-3 font-medium">Replied</th>
                  <th className="py-2 font-medium">Stopped</th>
                </tr>
              </thead>
              <tbody>
                {d.lists.map((l) => (
                  <tr key={l.id} className="border-t border-brand-lavender/50">
                    <td className="py-2 pr-3">
                      <Link href={`/studio/outreach/lists/${l.id}`} className="text-brand-primary underline-offset-2 hover:underline">
                        {l.name}
                      </Link>
                      <div className="text-xs text-brand-gray">{formatDay(l.created_at)}</div>
                    </td>
                    <td className="py-2 pr-3">{l.audience}</td>
                    <td className="py-2 pr-3">{l.total}</td>
                    <td className="py-2 pr-3">{l.valid}</td>
                    <td className="py-2 pr-3">{l.unknown}</td>
                    <td className="py-2 pr-3">{l.replied}</td>
                    <td className="py-2">{l.stopped}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-brand-gray">No lists yet.</p>
        )}
        <h3 className="pt-2 text-sm font-medium text-brand-ink">Upload a list</h3>
        <CsvImport />
      </section>

      <section className={card}>
        <h2 className={h2}>Settings</h2>
        <SettingsForm dailyCap={s?.daily_cap ?? 20} hourlyCap={s?.hourly_cap ?? 5} businessAddress={s?.business_address ?? ""} />
      </section>

      <section className={card}>
        <h2 className={h2}>Never email an address</h2>
        <SuppressForm />
        {d.recentSuppressions.length ? (
          <ul className="space-y-0.5 text-xs text-brand-gray">
            {d.recentSuppressions.map((x) => (
              <li key={x.email}>
                {x.email}: {x.reason}
                {x.note ? `, ${x.note}` : ""}, {formatDay(x.created_at)}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
