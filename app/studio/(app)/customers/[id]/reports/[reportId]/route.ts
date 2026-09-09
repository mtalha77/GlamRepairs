import { getStudioCustomer } from "@/lib/studio/customers";
import { requireStudioMember } from "@/lib/studio/member";
import { buildReportPatient, reportFileName } from "@/lib/studio/report";
import { leadDisplayRef } from "@/lib/leads/displayRef";
import { buildSkinReportPdf } from "@/lib/studio/reportPdf";
import { getCustomerReport } from "@/lib/studio/reports";

type ReportPdfRouteProps = {
  params: Promise<{ id: string; reportId: string }>;
};

export async function GET(_request: Request, { params }: ReportPdfRouteProps) {
  const { member } = await requireStudioMember();
  if (!member) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id, reportId } = await params;
  const [customer, report] = await Promise.all([
    getStudioCustomer(id),
    getCustomerReport(id, reportId),
  ]);

  if (!customer || !report) {
    return new Response("Not found", { status: 404 });
  }

  let pdf: Buffer;
  try {
    pdf = await buildSkinReportPdf({
      noticed: report.noticed,
      morningRoutine: report.morningRoutine,
      nightRoutine: report.nightRoutine,
      avoidItems: report.avoidItems,
      extraNotes: report.extraNotes ?? "",
      // Null on reports predating Part 2 — the PDF omits those sections
      // rather than substituting today's defaults, so a re-download matches
      // what the client actually received.
      startHere: report.startHere ?? "",
      timeline: report.timeline ?? "",
      goodSigns: report.goodSigns ?? "",
      warningSigns: report.warningSigns ?? "",
      patient: {
        ...buildReportPatient(customer),
        reportDate: new Date(report.createdAt).toLocaleDateString("en-GB"),
      },
      authorName: report.authorName,
      reportRef: leadDisplayRef(customer.sessionId) ?? undefined,
    });
  } catch (error) {
    console.error("[report pdf route]", error);
    return new Response("Could not create the PDF.", { status: 500 });
  }

  const fileName = reportFileName(customer.fullName || "customer");

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
