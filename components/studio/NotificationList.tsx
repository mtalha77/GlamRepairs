"use client";

import Link from "next/link";

import { useStudioNotifications } from "@/components/studio/StudioNotificationsProvider";
import { cn } from "@/lib/cn";
import type { StudioNotificationType } from "@/lib/supabase/database.types";
import { formatStudioDateTime } from "@/lib/studio/formatDate";
import {
  STUDIO_NOTIFICATION_LABELS,
  type StudioNotification,
} from "@/lib/studio/notificationTypes";

const TYPE_CLASS: Record<StudioNotificationType, string> = {
  chat_message: "bg-brand-info/20 text-brand-primary",
  review_submitted: "bg-brand-cream-light text-brand-primary-dark",
  payment_verified: "bg-brand-success/15 text-brand-success-strong",
  customer_assigned: "bg-brand-purple-soft text-brand-primary",
  // HANDOVER-50 — needs action: a slot lost after payment, a missing call link.
  consultation_alert: "bg-red-100 text-red-800",
};

export default function NotificationList() {
  const { notifications, unreadCount, markRead, markAllRead } =
    useStudioNotifications();

  return (
    <div>
      {unreadCount > 0 ? (
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={() => markAllRead()}
            className="rounded-xl border border-brand-border-light bg-white px-4 py-2 text-sm text-brand-primary hover:bg-brand-purple-soft"
          >
            Mark all as read
          </button>
        </div>
      ) : null}
      {notifications.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-brand-lavender bg-white px-5 py-10 text-center text-sm text-brand-gray">
          No notifications yet.
        </p>
      ) : (
        <ul className="divide-y divide-brand-lavender/70 overflow-hidden rounded-2xl border border-brand-lavender/70 bg-white">
          {notifications.map((item) => (
            <li key={item.id}>
              <NotificationRow
                notification={item}
                onOpen={() => markRead([item.id])}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NotificationRow({
  notification,
  onOpen,
}: {
  notification: StudioNotification;
  onOpen: () => void;
}) {
  const unread = !notification.readAt;

  return (
    <Link
      href={notification.href}
      onClick={onOpen}
      className={cn(
        "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-brand-purple-soft/50",
        unread && "bg-brand-purple-tint/80",
      )}
    >
      <span
        className={`mt-0.5 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] ${TYPE_CLASS[notification.type]}`}
      >
        {STUDIO_NOTIFICATION_LABELS[notification.type]}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-sm font-medium text-brand-ink">
            {notification.title}
          </span>
          {unread ? (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-primary" />
          ) : null}
        </span>
        <span className="mt-0.5 block text-xs text-brand-gray">
          {notification.body}
        </span>
      </span>
      <span className="shrink-0 text-xs text-brand-gray">
        {formatStudioDateTime(notification.createdAt)}
      </span>
    </Link>
  );
}
