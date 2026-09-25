import { NextResponse } from "next/server";

import { isResendConfigured } from "@/lib/email/resendClient";
import { sendPlanThankYouEmail } from "@/lib/email/sendPlanThankYouEmail";
import { insertLead } from "@/lib/leads/insertLead";
import {
  getPublicAppUrl,
  toShortPhotoUrls,
} from "@/lib/leads/photoShortLink";
import { uploadAssessmentPhotos } from "@/lib/leads/uploadAssessmentPhotos";
import type { LeadSubmitPayload, LeadSubmitResult } from "@/types/lead";
import {
  isGiftedLead,
  showBankDetails as computeShowBankDetails,
} from "@/lib/leads/paymentVisibility";
import { deleteUnreferencedPhotos } from "@/lib/leads/deleteLeadPhotos";

function isConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

function validatePayload(body: unknown): body is LeadSubmitPayload {
  if (!body || typeof body !== "object") return false;
  const payload = body as LeadSubmitPayload;
  return typeof payload.sessionId === "string" && payload.sessionId.length > 0;
}

/**
 * HOTFIX-7 §3 — verify the consent gate server-side too. The funnel UI
 * already disables submission until both boxes are ticked
 * (ConsentStep.tsx's canSubmit), but that's only enforced client-side; a
 * direct POST here could skip it entirely. One production lead row has
 * both consent answers null with photos already uploaded — probably a
 * pre-this-check test artefact, but it's exactly the gap this closes:
 * photos are never persisted without both consent answers recorded true.
 */
function hasRecordedConsent(answers: Record<string, unknown> | undefined) {
  return (
    answers?.["onboarding.consentPrivateReview"] === true &&
    answers?.["onboarding.photoMarketingRestriction"] === true
  );
}

function collectPhotoDataUrls(payload: LeadSubmitPayload): string[] {
  const fromList = Array.isArray(payload.photoDataUrls)
    ? payload.photoDataUrls.filter(
        (item): item is string =>
          typeof item === "string" && item.startsWith("data:"),
      )
    : [];

  if (fromList.length > 0) return fromList;

  if (
    typeof payload.selfieDataUrl === "string" &&
    payload.selfieDataUrl.startsWith("data:")
  ) {
    return [payload.selfieDataUrl];
  }

  const answers = payload.answers;
  if (answers && Array.isArray(answers["onboarding.photos"])) {
    return (answers["onboarding.photos"] as unknown[]).filter(
      (item): item is string =>
        typeof item === "string" && item.startsWith("data:"),
    );
  }

  return [];
}

/**
 * Persist funnel lead forever + assessment photos (auto-deleted after 30 days).
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json<LeadSubmitResult>(
      { ok: false, reason: "validation", message: "Invalid JSON body." },
      { status: 400 },
    );
  }

  if (!validatePayload(body)) {
    return NextResponse.json<LeadSubmitResult>(
      {
        ok: false,
        reason: "validation",
        message: "sessionId is required.",
      },
      { status: 400 },
    );
  }

  const photoDataUrls = collectPhotoDataUrls(body);

  if (photoDataUrls.length > 0 && !hasRecordedConsent(body.answers)) {
    return NextResponse.json<LeadSubmitResult>(
      {
        ok: false,
        reason: "validation",
        message: "Both consent checkboxes must be agreed before photos can be submitted.",
      },
      { status: 400 },
    );
  }

  if (!isConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[api/leads] Payload ready for Supabase", {
        sessionId: body.sessionId,
        fullName: body.fullName,
        email: body.email,
        selectedPlan: body.selectedPlan,
        planName: body.planName,
        photoCount: photoDataUrls.length,
        answerKeys: body.answers ? Object.keys(body.answers) : [],
      });
    }

    if (isResendConfigured()) {
      const emailResult = await sendPlanThankYouEmail({
        fullName: body.fullName,
        email: body.email,
        planName: body.planName,
        planPrice: body.planPrice,
        selectedPlan: body.selectedPlan,
        // HANDOVER-9 §1 — derives the GR-XXXXXX reference for the bank
        // transfer note.
        sessionId: body.sessionId,
      });
      if (!emailResult.ok) {
        console.error(
          "[api/leads] Local lead thank-you email failed:",
          emailResult.message,
        );
      }
    }

    return NextResponse.json<LeadSubmitResult>({
      ok: true,
      leadId: `local_${body.sessionId.slice(0, 8)}`,
      imageUrl: null,
      imageUrls: [],
      // No lead row exists on this path, so there are no trigger results to
      // read. Treated as an ordinary paid lead: showing payment
      // instructions to a developer is harmless, hiding them would mask a
      // regression in the real path.
      payment: { showBankDetails: true, isGifted: false },
    });
  }

  const { packId, photoPaths } = await uploadAssessmentPhotos(
    body.sessionId,
    photoDataUrls,
  );

  const appBase = getPublicAppUrl(request);
  const imageUrls =
    packId && photoPaths.length > 0
      ? toShortPhotoUrls(appBase, packId, photoPaths)
      : [];

  const lead = await insertLead({
    ...body,
    imageUrls,
    photoPaths,
  });

  /*
   * HOTFIX-43 §1 — a failed insert is a failure, and its photos go.
   *
   * This used to carry on regardless: the photos were already in Storage,
   * the response said `ok: true`, and the "we've received it" email went
   * out, for a lead that did not exist. The practitioner never saw it, and
   * the photographs sat in the bucket with no row pointing at them, which
   * put them out of reach of both the studio and the 30-day sweep. Every
   * file in the bucket when this was fixed was one of these.
   *
   * The funnel continues to the WhatsApp summary whatever this returns, so
   * the client is not stranded; they are just not told something untrue.
   */
  if (!lead) {
    if (photoPaths.length > 0) {
      const cleanup = await deleteUnreferencedPhotos(photoPaths);
      if (!cleanup.ok) {
        console.error(
          "[api/leads] Lead insert failed AND orphaned photos could not be removed:",
          photoPaths,
          cleanup.message,
        );
      }
    }
    console.error("[api/leads] Lead insert failed for session", body.sessionId);
    return NextResponse.json<LeadSubmitResult>(
      {
        ok: false,
        reason: "unknown",
        message:
          "We could not save your assessment. Please send us the WhatsApp message so we can help.",
      },
      { status: 500 },
    );
  }

  const paymentFacts = {
    paymentStatus: lead?.paymentStatus,
    finalPrice: lead?.finalPrice,
  };
  const includeBankDetails = computeShowBankDetails(paymentFacts);

  if (isResendConfigured()) {
    const emailResult = await sendPlanThankYouEmail({
      fullName: body.fullName,
      email: body.email,
      planName: body.planName,
      planPrice: body.planPrice,
      selectedPlan: body.selectedPlan,
      sessionId: body.sessionId,
      showBankDetails: includeBankDetails,
    });
    if (!emailResult.ok) {
      console.error(
        "[api/leads] Lead saved but thank-you email failed:",
        emailResult.message,
      );
    }
  }

  return NextResponse.json<LeadSubmitResult>({
    ok: true,
    leadId: lead?.leadId ?? body.sessionId,
    imageUrl: imageUrls[0] ?? null,
    imageUrls,
    payment: {
      showBankDetails: includeBankDetails,
      isGifted: isGiftedLead(paymentFacts),
    },
  });
}
