import type { StudioNotificationType } from "@/lib/supabase/database.types";

export type StudioNotification = {
  id: string;
  recipientId: string;
  actorId: string | null;
  type: StudioNotificationType;
  title: string;
  body: string;
  href: string;
  leadId: string | null;
  readAt: string | null;
  createdAt: string;
};

export const STUDIO_NOTIFICATION_LABELS: Record<StudioNotificationType, string> = {
  chat_message: "Chat",
  review_submitted: "Review",
  payment_verified: "Payment",
  customer_assigned: "Assigned",
  consultation_alert: "Consultation",
  practitioner_application: "Application",
};

export function mapStudioNotification(row: {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: StudioNotificationType;
  title: string;
  body: string;
  href: string;
  lead_id: string | null;
  read_at: string | null;
  created_at: string;
}): StudioNotification {
  return {
    id: row.id,
    recipientId: row.recipient_id,
    actorId: row.actor_id,
    type: row.type,
    title: row.title,
    body: row.body,
    href: row.href,
    leadId: row.lead_id,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}
