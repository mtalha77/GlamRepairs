import { currentClientAccount } from "@/lib/clients/signIn";
import { getClientLead, getClientReport } from "@/lib/clients/portal";
import { buildReportPatient, reportFileName } from "@/lib/studio/report";
import { buildSkinReportPdf } from "@/lib/studio/reportPdf";

/**
 * The signed-in client's own report as a PDF, built from the same record
 * as the one emailed to them. HANDOVER-60: the ATA "patient access to
 * their records" requirement. Only a sent report, only their own.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const account = await currentClientAccount();
  if (!account?.lead_id) return new Response("Not found", { status: 404 });
  const [lead, report] = await Promise.all([getClientLead(account.lead_id), getClientReport(account.lead_id)]);
  if (!lead || !report) return new Response("Not found", { status: 404 });

  let pdf: Buffer;
  try {
    pdf = await buildSkinReportPdf({
      noticed: report.noticed,
      morningRoutine: report.morning_routine,
      nightRoutine: report.night_routine,
      avoidItems: report.avoid_items,
      extraNotes: report.extra_notes ?? "",
      startHere: report.start_here ?? "",
      timeline: report.timeline ?? "",
      goodSigns: report.good_signs ?? "",
      warningSigns: report.warning_signs ?? "",
      patient: {
        ...buildReportPatient({
          answers: (lead.answers ?? {}) as Record<string, unknown>,
          fullName: lead.full_name,
          email: lead.email,
          planName: lead.plan_name,
          selectedPlan: lead.selected_plan,
        }),
        reportDate: new Date(report.created_at).toLocaleDateString("en-GB"),
      },
      authorName: report.author_name,
      reportRef: lead.ref ?? undefined,
    });
  } catch (error) {
    console.error("[account/report]", error);
    return new Response("Could not create the PDF.", { status: 500 });
  }

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${reportFileName(lead.full_name || "assessment")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
