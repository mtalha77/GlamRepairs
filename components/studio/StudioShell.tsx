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
  const practitionerSeat = member.memberKind === "practitioner" && !member.isSuperAdmin;
  return (
    <StudioNotificationsProvider
      userId={member.userId}
      initialNotifications={initialNotifications}
    >
      {/*
        30 October 2026: the shell was locked to h-dvh with its own inner
        scroller. On iOS the photo picker shrinks the dynamic viewport while
        it is open and Safari does not always repaint afterwards, which left
        the page cut off above a blank white area. Phones and tablets now
        scroll the document normally; only a desktop keeps the fixed
        sidebar, and it uses the stable 100vh rather than dvh.
      */}
      <div
        data-studio-shell
        className="flex min-h-screen bg-brand-purple-tint text-brand-ink lg:h-screen lg:overflow-hidden"
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
          <StudioNav superAdmin={member.isSuperAdmin} practitionerSeat={practitionerSeat} />
          <StudioUserFooter member={member} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col lg:min-h-0 lg:overflow-y-auto">
          <StudioMobileHeader superAdmin={member.isSuperAdmin} practitionerSeat={practitionerSeat} />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </StudioNotificationsProvider>
  );
}
