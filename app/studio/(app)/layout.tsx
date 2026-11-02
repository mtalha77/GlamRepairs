import { headers } from "next/headers";
import { redirect } from "next/navigation";

import StudioShell from "@/components/studio/StudioShell";
import { pendingAgreementForUser } from "@/lib/practitioners/agreements";
import { requireStudioMember } from "@/lib/studio/member";
import { listStudioNotifications } from "@/lib/studio/notifications";
import { STUDIO_PATH_HEADER } from "@/lib/supabase/proxy";

export const dynamic = "force-dynamic";

/**
 * A practitioner's seat (HANDOVER-52 §4.4) reaches her own practice page,
 * her consultations and her notifications, nothing else: no customer list,
 * no team chat, no blog or SEO. RLS says the same thing underneath.
 */
const PRACTITIONER_PATHS = ["/studio/practice", "/studio/consultations", "/studio/notifications", "/studio/agreement"];

export default async function StudioAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, member, needsVerification } = await requireStudioMember();

  if (!user) {
    redirect("/studio/login");
  }

  // Email 2FA (20 October 2026): a new session, or one verified over 30 days ago.
  if (needsVerification) {
    const path = (await headers()).get(STUDIO_PATH_HEADER) ?? "/studio";
    redirect(`/studio/verify?next=${encodeURIComponent(path)}`);
  }

  if (!member) {
    redirect("/studio/no-access");
  }

  /*
   * Handover 66 §5.4: anyone with a practitioner profile (new or existing,
   * approved or not, Ayma included) whose track has a version in force that
   * they have not accepted reads it before anything else. Work already
   * booked is untouched; only the studio pages wait.
   */
  const pending = await pendingAgreementForUser(user.id);
  if (pending) {
    const path = (await headers()).get(STUDIO_PATH_HEADER) ?? "";
    if (path !== "/studio/agreement") redirect("/studio/agreement");
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
