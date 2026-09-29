import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { INTRO, LAST_UPDATED, PRIVACY_MARKDOWN } from "@/lib/legal/privacy";
import { pageH1, pageMetadata } from "@/lib/seo/pageSeo";

// HANDOVER-45 — from `page_seo` ('/privacy'), edited in Studio → SEO. The
// strings here are only the fallback for a missing row or failed read.
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("/privacy", {
    title: "Privacy Policy and Your Photographs",
    description:
      "What Glam Repairs collects, who sees your photographs, how WhatsApp is " +
    "used, how long we keep your information, and how to have it deleted.",
  });
}

export default async function PrivacyPage() {
  return (
    <LegalPage
      title={await pageH1("/privacy", "Privacy Policy")}
      intro={INTRO}
      lastUpdated={LAST_UPDATED}
      markdown={PRIVACY_MARKDOWN}
    />
  );
}
