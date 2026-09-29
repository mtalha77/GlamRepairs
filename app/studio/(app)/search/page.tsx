import { redirect } from "next/navigation";

import SearchDashboard from "@/components/studio/search/SearchDashboard";
import { gscConfigured, GSC_SITE } from "@/lib/gsc/client";
import { loadSearchDashboard } from "@/lib/gsc/dashboard";
import { requireStudioMember } from "@/lib/studio/member";

/** Studio → Search — HANDOVER-46 §4: Search Console, synced daily. */
export const dynamic = "force-dynamic";

export default async function StudioSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { user, member } = await requireStudioMember();
  if (!user) redirect("/studio/login");
  if (!member) redirect("/studio/no-access");

  const range = (await searchParams).range === "90" ? 90 : 28;
  const data = await loadSearchDashboard(range);
  return <SearchDashboard data={data} range={range} configured={gscConfigured()} site={GSC_SITE} />;
}
