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
