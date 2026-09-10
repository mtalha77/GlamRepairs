"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import Logo from "@/components/home/Logo";
import { BellIcon, CloseIcon, MenuIcon } from "@/components/studio/StudioIcons";
import StudioNav from "@/components/studio/StudioNav";
import { useStudioNotifications } from "@/components/studio/StudioNotificationsProvider";

export default function StudioMobileHeader({
  superAdmin,
}: {
  superAdmin?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { unreadCount } = useStudioNotifications();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-30 lg:hidden">
      <div className="relative z-20 flex items-center justify-between gap-3 border-b border-brand-lavender/70 bg-white px-4 py-3">
        <Link href="/studio" className="min-w-0">
          <Logo variant="color" className="h-8" />
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/studio/notifications"
            aria-label={
              unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : "Notifications"
            }
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand-border-light text-brand-primary"
          >
            <BellIcon />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-brand-primary px-1 text-center text-[10px] font-medium leading-4 text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand-border-light text-brand-primary"
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>
      {open ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-10 bg-brand-ink/25"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 right-0 top-full z-20 border-b border-brand-lavender/70 bg-white px-4 py-3 shadow-lg">
            <StudioNav
              includeSettings
              superAdmin={superAdmin}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </>
      ) : null}
    </header>
  );
}
