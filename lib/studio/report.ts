import { getCustomerAnswerValue } from "@/lib/studio/answers";
import type { StudioCustomer } from "@/lib/studio/customerTypes";
import { formatStudioDate } from "@/lib/studio/formatDate";

export type SkinReportContent = {
  noticed: string;
  morningRoutine: string;
  nightRoutine: string;
  avoidItems: string;
  extraNotes: string;
};

export type SkinReportPatient = {
  clientName: string;
  email: string;
  gender: string;
  age: string;
  concern: string;
  plan: string;
  location: string;
  reportDate: string;
};

export type SkinReportPdfInput = SkinReportContent & {
  patient: SkinReportPatient;
  authorName: string;
  /**
   * HANDOVER-16 §3/§4 — the reference the client can quote back. Without it
   * on the document itself, someone holding their report has no way to
   * identify it to support.
   */
  reportRef?: string;
  /**
   * Which practitioner's credentials the signature renders. Defaults to the
   * primary author. Once a second practitioner exists this must be the
   * assigned one — the block states qualifications, so it has to be theirs.
   */
  authorSlug?: string;
  /** ISO or display date for the follow-up check-in, when the plan has one. */
  followUpDate?: string;
};

export function buildReportPatient(customer: StudioCustomer): SkinReportPatient {
  const answers = customer.answers;
  const age = getCustomerAnswerValue(answers, "onboarding.age");
  const concern =
    getCustomerAnswerValue(answers, "onboarding.primaryConcernOther") ||
    getCustomerAnswerValue(answers, "onboarding.primaryConcern") ||
    getCustomerAnswerValue(answers, "booking.skinType") ||
    "-";

  return {
    clientName: customer.fullName?.trim() || "Customer",
    email: customer.email?.trim() || "-",
    gender: getCustomerAnswerValue(answers, "onboarding.gender") || "-",
    age: age ? `${age} years` : "-",
    concern,
    plan: customer.planName || customer.selectedPlan || "-",
    location:
      getCustomerAnswerValue(answers, "booking.location") ||
      getCustomerAnswerValue(answers, "onboarding.city") ||
      "-",
    reportDate: formatStudioDate(new Date().toISOString()),
  };
}

export function parseReportContent(formData: FormData): SkinReportContent | null {
  const noticed = String(formData.get("noticed") ?? "").trim();
  const morningRoutine = String(formData.get("morningRoutine") ?? "").trim();
  const nightRoutine = String(formData.get("nightRoutine") ?? "").trim();
  const avoidItems = String(formData.get("avoidItems") ?? "").trim();
  const extraNotes = String(formData.get("extraNotes") ?? "").trim();

  if (!noticed || !morningRoutine || !nightRoutine || !avoidItems) {
    return null;
  }

  return {
    noticed,
    morningRoutine,
    nightRoutine,
    avoidItems,
    extraNotes,
  };
}

export function reportFileName(clientName: string) {
  const slug = clientName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `GlamRepairs-Skin-Report${slug ? `-${slug}` : ""}.pdf`;
}
