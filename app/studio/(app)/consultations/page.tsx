import { redirect } from "next/navigation";

import ConsultationsAdmin from "@/components/consultation/ConsultationsAdmin";
import { loadConsultationAdmin } from "@/lib/consultation/admin";
import { ringCentralConfigured } from "@/lib/consultation/ringcentral";
import { listPractitioners } from "@/lib/practitioners/roster";
import { requireStudioMember } from "@/lib/studio/member";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Studio → Consultations — HANDOVER-50 §3.
 *
 * Every member can see the calendar (whoever answers WhatsApp needs to know
 * when a client is booked); only a super admin can change it. The actions
 * check that again, and RLS checks it a third time.
 */

export const dynamic = "force-dynamic";

export default async function ConsultationsPage() {
  const { member } = await requireStudioMember();
  if (!member) redirect("/studio/login");

  // A practitioner's seat sees only her own consultations, without client
  // contact details (HANDOVER-52 §4.4).
  let scope: { practitionerId: string } | undefined;
  if (member.memberKind === "practitioner" && !member.isSuperAdmin) {
    const { data: own } = await createAdminSupabaseClient()
      .from("practitioner_profiles")
      .select("id")
      .eq("user_id", member.userId)
      .maybeSingle();
    if (!own) redirect("/studio");
    scope = { practitionerId: own.id };
  }
  const [data, roster] = await Promise.all([
    loadConsultationAdmin(scope),
    member.isSuperAdmin ? listPractitioners() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-brand-primary">Consultations</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-gray">
          Video calls included in the plans that have one
          {data.practitioner ? `, with ${data.practitioner.fullName}` : ""}. All times are Pakistan time (PKT).
          {member.isSuperAdmin ? "" : " Only a super admin can change hours or bookings."}
        </p>
      </div>
      {data.practitioner ? (
        <ConsultationsAdmin
          data={data}
          readOnly={!member.isSuperAdmin}
          practitionerView={Boolean(scope)}
          ringCentralReady={ringCentralConfigured()}
          practitioners={roster.map((p) => ({ id: p.id, name: p.fullName, live: p.status === "approved" }))}
        />
      ) : (
        <p role="alert" className="rounded-xl bg-brand-error/10 px-4 py-3 text-sm text-brand-error-strong">
          No approved practitioner profile exists, so no times can be offered.
        </p>
      )}
    </div>
  );
}
