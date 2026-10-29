import type { Metadata } from "next";

/**
 * The test portal (Handover 63 Part 3). Not indexed, by meta here and by
 * the X-Robots-Tag header in next.config.ts. Both, because one is easy to
 * lose in a refactor.
 */
export const metadata: Metadata = {
  title: "Test portal",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export const dynamic = "force-dynamic";

export default function TestLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[100dvh] bg-brand-surface-alt px-4 py-10 sm:px-6">{children}</div>;
}
