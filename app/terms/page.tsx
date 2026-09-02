import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { INTRO, LAST_UPDATED, TERMS_MARKDOWN } from "@/lib/legal/terms";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "The terms that apply when you buy a skin consultation from Glam Repairs — " +
    "plans, payment, delivery, refunds, appointments, and your responsibilities.",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      intro={INTRO}
      lastUpdated={LAST_UPDATED}
      markdown={TERMS_MARKDOWN}
    />
  );
}
