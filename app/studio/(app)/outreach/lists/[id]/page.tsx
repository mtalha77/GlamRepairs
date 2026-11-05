import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ContactTable, EnrolForm, type ContactView } from "@/components/studio/outreach/OutreachAdmin";
import { formatDay } from "@/lib/consultation/format";
import { loadOutreachList } from "@/lib/outreach/studio";
import { requireStudioMember } from "@/lib/studio/member";

export const dynamic = "force-dynamic";

export default async function OutreachListPage({ params }: { params: Promise<{ id: string }> }) {
  const { member } = await requireStudioMember();
  if (!member) redirect("/studio/login");
  if (!member.isSuperAdmin) redirect("/studio");
  const { id } = await params;
  const data = await loadOutreachList(id);
  if (!data) notFound();
  const { list, contacts, enrolmentByContact, sequences } = data;

  const view: ContactView[] = contacts.map((c) => {
    const e = enrolmentByContact.get(c.id);
    return {
      id: c.id,
      email: c.email,
      first_name: c.first_name,
      company: c.company,
      country_code: c.country_code,
      status: c.status,
      email_status: c.email_status,
      progress: e
        ? `${e.current_step} sent, ${e.status}${e.status === "active" && e.next_send_at ? `, next due ${formatDay(e.next_send_at)}` : ""}`
        : "not enrolled",
    };
  });
  const unchecked = contacts.filter((c) => c.email_status === "unknown").length;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/studio/outreach" className="text-sm text-brand-gray hover:text-brand-primary">
          Outreach
        </Link>
        <h1 className="font-serif text-2xl text-brand-primary">{list.name}</h1>
        <p className="mt-1 text-sm text-brand-gray">
          {list.audience === "brand" ? "Brands" : "Practitioners"} · {contacts.length} contacts · uploaded {formatDay(list.created_at)}
        </p>
        <p className="mt-1 text-sm text-brand-ink">Source: {list.source_note ?? "not recorded"}</p>
      </div>

      <section className="space-y-3 rounded-2xl border border-brand-lavender/70 bg-white p-5">
        <h2 className="font-serif text-lg text-brand-primary">Enrol in a sequence</h2>
        <p className="text-sm text-brand-gray">
          Enrolment schedules step 1; the hourly run sends it. Only addresses marked valid are ever sent to
          {unchecked ? `, so the ${unchecked} unchecked here will wait until you mark them` : ""}.
        </p>
        <EnrolForm listId={list.id} sequences={sequences} />
      </section>

      <section className="space-y-3 rounded-2xl border border-brand-lavender/70 bg-white p-5">
        <h2 className="font-serif text-lg text-brand-primary">Contacts</h2>
        <ContactTable contacts={view} />
      </section>
    </div>
  );
}
