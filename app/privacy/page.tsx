import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { INTRO, LAST_UPDATED, PRIVACY_MARKDOWN } from "@/lib/legal/privacy";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What Glam Repairs collects, who sees your photographs, how WhatsApp is " +
    "used, how long we keep your information, and how to have it deleted.",
  alternates: { canonical: "/privacy" },
  // Legal pages should be indexable — they are a trust signal Google reads
  // when assessing a YMYL site — but they should never outrank real content.
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={INTRO}
      lastUpdated={LAST_UPDATED}
      markdown={PRIVACY_MARKDOWN}
    />
  );
}
