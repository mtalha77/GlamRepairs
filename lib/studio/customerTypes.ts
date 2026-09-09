import type {
  CustomerSource,
  CustomerStatus,
  PaymentStatus,
} from "@/lib/supabase/database.types";

export type StudioCustomer = {
  id: string;
  sessionId: string;
  fullName: string | null;
  email: string | null;
  selectedPlan: string | null;
  planName: string | null;
  planPrice: string | null;
  answers: Record<string, unknown>;
  imageUrls: string[];
  photoPaths: string[];
  photosExpireAt: string | null;
  photosDeletedAt: string | null;
  status: CustomerStatus;
  notes: string | null;
  source: CustomerSource;
  paymentStatus: PaymentStatus;
  assignedTo: string | null;
  assignedToName: string | null;
  reportSenderId: string | null;
  reportSenderName: string | null;
  funnelComplete: boolean;
  funnelStep: number | null;
  isTest: boolean;
  testReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export function photosAreExpired(
  customer: Pick<StudioCustomer, "photosDeletedAt">,
) {
  return Boolean(customer.photosDeletedAt);
}

/**
 * Photographs a practitioner can actually open right now.
 *
 * HANDOVER-16 Part 6 gates sending on "all photographs opened", so this must
 * match what PhotoGallery renders exactly. Two ways it would not: a purged
 * lead keeps its `image_urls` values while the gallery refuses to show them,
 * and the array can carry empty strings. Counting either would demand the
 * practitioner attest to opening photographs that are not on the screen —
 * an unpassable checkbox, blocking a report nobody can unblock.
 */
export function visiblePhotoCount(
  customer: Pick<StudioCustomer, "photosDeletedAt" | "imageUrls">,
) {
  if (photosAreExpired(customer)) return 0;
  return customer.imageUrls.filter(Boolean).length;
}

export function isAbandonedFunnel(
  customer: Pick<StudioCustomer, "source" | "funnelComplete" | "selectedPlan">,
) {
  return (
    customer.source === "funnel" &&
    (!customer.funnelComplete || !customer.selectedPlan)
  );
}

export function canSendCustomerReport(member: { canSendReport: boolean }) {
  return member.canSendReport;
}

export function canVerifyCustomerPayment(member: {
  canVerifyPayment: boolean;
}) {
  return member.canVerifyPayment;
}
