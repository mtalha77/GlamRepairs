import { headers } from "next/headers";
import { redirect } from "next/navigation";

import StudioShell from "@/components/studio/StudioShell";
import { requireStudioMember } from "@/lib/studio/member";
import { listStudioNotifications } from "@/lib/studio/notifications";
import { STUDIO_PATH_HEADER } from "@/lib/supabase/proxy";

export const dynamic = "force-dynamic";

/**
 * A practitioner's seat (HANDOVER-52 §4.4) reaches her own practice page,
 * her consultations and her notifications, nothing else: no customer list,
 * no team chat, no blog or SEO. RLS says the same thing underneath.
 */
const PRACTITIONER_PATHS = ["/studio/practice", "/studio/consultations", "/studio/notifications"];

export default async function StudioAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, member } = await requireStudioMember();

  if (!user) {
    redirect("/studio/login");
  }

  if (!member) {
    redirect("/studio/no-access");
  }

  if (member.memberKind === "practitioner" && !member.isSuperAdmin) {
    const path = (await headers()).get(STUDIO_PATH_HEADER) ?? "";
    if (!PRACTITIONER_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) {
      redirect("/studio/practice");
    }
  }

  const initialNotifications = await listStudioNotifications();

  return (
    <StudioShell member={member} initialNotifications={initialNotifications}>
      {children}
    </StudioShell>
  );
}
