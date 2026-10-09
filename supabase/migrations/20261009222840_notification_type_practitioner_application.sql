-- HANDOVER-51: a submitted practitioner application notifies super admins.
alter table public.studio_notifications drop constraint if exists studio_notifications_type_check;
alter table public.studio_notifications add constraint studio_notifications_type_check
  check (type = any (array['chat_message','review_submitted','payment_verified','customer_assigned','consultation_alert','practitioner_application']));
