import type { Metadata } from "next";

/**
 * Same treatment as the onboarding steps — see
 * `app/onboarding/step/layout.tsx` for the full reasoning.
 *
 * `/booking/step/*` currently redirects into the onboarding funnel, so these
 * URLs are pure redirect noise in Search Console. noindex stops them being
 * catalogued as destinations in their own right.
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
    googleBot: { index: false, follow: true },
  },
};

export default function BookingStepLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
