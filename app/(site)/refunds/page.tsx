import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import {
  REFUNDS_INTRO,
  REFUNDS_LAST_UPDATED,
  REFUNDS_MARKDOWN,
  REFUNDS_TITLE,
} from "@/lib/legal/refunds";
import { pageMetadata } from "@/lib/seo/pageSeo";

/**
 * Handover 75 Part 3: the refund, cancellation and delivery policy Safepay's
 * merchant review requires. Copy is in lib/legal/refunds.ts, shared with
 * /terms so the two pages cannot disagree. index, follow.
 */
export async function generateMetadata(): Promise<Metadata> {
  const meta = await pageMetadata("/refunds", {
    title: REFUNDS_TITLE,
    description:
      "How cancellations, refunds, delivery and complaints work at Glam Repairs: a full refund before work " +
      "starts, free revision within 14 days, and stated timelines.",
  });
  return { ...meta, robots: { index: true, follow: true } };
}

export default function RefundsPage() {
  return (
    <LegalPage
      title={REFUNDS_TITLE}
      path="/refunds"
      ownership
      intro={REFUNDS_INTRO}
      lastUpdated={REFUNDS_LAST_UPDATED}
      markdown={REFUNDS_MARKDOWN}
    />
  );
}
