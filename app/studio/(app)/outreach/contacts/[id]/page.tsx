import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { MarkRepliedButton } from "@/components/studio/outreach/OutreachAdmin";
import { formatDay } from "@/lib/consultation/format";
import { loadOutreachContact } from "@/lib/outreach/studio";
import { requireStudioMember } from "@/lib/studio/member";

export const dynamic = "force-dynamic";

export default async function OutreachContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { member } = await requireStudioMember();
  if (!member) redirect("/studio/login");
  if (!member.isSuperAdmin) redirect("/studio");
  const { id } = await params;
  const data = await loadOutreachContact(id);
  if (!data) notFound();
  const { contact: c, list, suppressed, timeline } = data;

  return (
    <div className="space-y-6">
      <div>
        <Link href={list ? `/studio/outreach/lists/${list.id}` : "/studio/outreach"} className="text-sm text-brand-gray hover:text-brand-primary">
          {list?.name ?? "Outreach"}
        </Link>
        <h1 className="font-serif text-2xl text-brand-primary">{c.email}</h1>
        <p className="mt-1 text-sm text-brand-gray">
          {[c.first_name, c.role_title, c.company, c.country_code].filter(Boolean).join(" · ") || "No details"} · status {c.status} · address{" "}
          {c.email_status}
        </p>
      </div>
      <section className="space-y-3 rounded-2xl border border-brand-lavender/70 bg-white p-5">
        {suppressed ? (
          <p className="text-sm text-brand-gray">This address is on the suppression list and will not be emailed again.</p>
        ) : (
          <MarkRepliedButton contactId={c.id} />
        )}
      </section>
      <section className="space-y-3 rounded-2xl border border-brand-lavender/70 bg-white p-5">
        <h2 className="font-serif text-lg text-brand-primary">Timeline</h2>
        <ol className="space-y-2 text-sm">
          {timeline.map((t, i) => (
            <li key={`${t.at}-${i}`} className="border-l-2 border-brand-lavender pl-3">
              <span className="text-xs text-brand-gray">{formatDay(t.at)}</span>
              <p className="text-brand-ink">{t.label}</p>
              {t.detail ? <p className="text-xs text-brand-gray">{t.detail}</p> : null}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
