"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useStudioNotifications } from "@/components/studio/StudioNotificationsProvider";
import { cn } from "@/lib/cn";

export const STUDIO_NAV_LINKS = [
  { href: "/studio", label: "Home", exact: true },
  { href: "/studio/customers", label: "Customers" },
  { href: "/studio/broadcast", label: "Broadcast" },
  { href: "/studio/blog", label: "Blog" },
  { href: "/studio/chat", label: "Chat" },
  { href: "/studio/notifications", label: "Notifications" },
  { href: "/studio/team", label: "Team" },
] as const;

/**
 * HANDOVER-19 — super-admin-only destinations.
 *
 * Photo retention is here rather than under Settings because it is a place
 * you go to act on a number, not to change a preference. It is passed down
 * as a prop rather than read from a hook because this is a client component
 * and the member record is already resolved on the server.
 */
const STUDIO_ADMIN_LINKS = [
  { href: "/studio/admin/photos", label: "Photo retention" },
  { href: "/studio/admin/duplicates", label: "Possible duplicates" },
  { href: "/studio/admin/gifts", label: "Gift codes" },
  { href: "/studio/admin/archive", label: "Archive" },
] as const;

type StudioNavProps = {
  onNavigate?: () => void;
  includeSettings?: boolean;
  superAdmin?: boolean;
};

export default function StudioNav({
  onNavigate,
  includeSettings,
  superAdmin,
}: StudioNavProps) {
  const pathname = usePathname();
  const { unreadCount } = useStudioNotifications();
  const links = [
    ...STUDIO_NAV_LINKS,
    ...(superAdmin ? STUDIO_ADMIN_LINKS : []),
    ...(includeSettings ? [{ href: "/studio/settings", label: "Settings" }] : []),
  ];

  return (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const exact = "exact" in link && link.exact;
        const active = exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`);
        const showBadge =
          link.href === "/studio/notifications" && unreadCount > 0;

        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center justify-between gap-2 rounded-full px-3.5 py-2 text-sm transition-colors",
              active
                ? "bg-brand-primary text-white"
                : "text-brand-gray hover:bg-brand-purple-soft hover:text-brand-primary",
            )}
          >
            {link.label}
            {showBadge ? (
              <span
                className={cn(
                  "min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-medium leading-none",
                  active
                    ? "bg-white text-brand-primary"
                    : "bg-brand-primary text-white",
                )}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
