import { redirect } from "next/navigation";

import ConsultationsAdmin from "@/components/consultation/ConsultationsAdmin";
import { loadConsultationAdmin } from "@/lib/consultation/admin";
import { ringCentralConfigured } from "@/lib/consultation/ringcentral";
import { requireStudioMember } from "@/lib/studio/member";

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

  const data = await loadConsultationAdmin();

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
        <ConsultationsAdmin data={data} readOnly={!member.isSuperAdmin} ringCentralReady={ringCentralConfigured()} />
      ) : (
        <p role="alert" className="rounded-xl bg-brand-error/10 px-4 py-3 text-sm text-brand-error-strong">
          No approved practitioner profile exists, so no times can be offered.
        </p>
      )}
    </div>
  );
}
