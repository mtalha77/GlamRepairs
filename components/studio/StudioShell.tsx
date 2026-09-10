import Link from "next/link";

import Logo from "@/components/home/Logo";
import StudioMobileHeader from "@/components/studio/StudioMobileHeader";
import StudioNav from "@/components/studio/StudioNav";
import { StudioNotificationsProvider } from "@/components/studio/StudioNotificationsProvider";
import StudioUserFooter from "@/components/studio/StudioUserFooter";
import type { StudioMember } from "@/lib/studio/member";
import type { StudioNotification } from "@/lib/studio/notificationTypes";

type StudioShellProps = {
  member: StudioMember;
  initialNotifications: StudioNotification[];
  children: React.ReactNode;
};

export default function StudioShell({
  member,
  initialNotifications,
  children,
}: StudioShellProps) {
  return (
    <StudioNotificationsProvider
      userId={member.userId}
      initialNotifications={initialNotifications}
    >
      <div
        data-studio-shell
        className="flex h-dvh overflow-hidden bg-brand-purple-tint text-brand-ink"
      >
        <aside className="hidden h-full w-64 shrink-0 flex-col overflow-y-auto border-r border-brand-lavender/70 bg-white px-5 py-6 lg:flex">
          <div className="mb-6">
            <Link href="/studio" className="block leading-none">
              <Logo variant="color" className="block h-10" />
            </Link>
            <p className="-mt-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-brand-accent">
              Studio
            </p>
          </div>
          <StudioNav superAdmin={member.isSuperAdmin} />
          <StudioUserFooter member={member} />
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
          <StudioMobileHeader superAdmin={member.isSuperAdmin} />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </StudioNotificationsProvider>
  );
}
