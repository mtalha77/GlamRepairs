import type { Metadata } from "next";

import StudioAuthHashHandler from "@/components/studio/StudioAuthHashHandler";

// Suffix-free — the root layout template appends "| GlamRepairs".
export const metadata: Metadata = {
  title: "Studio",
  robots: { index: false, follow: false },
};

export default function StudioRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <StudioAuthHashHandler />
      {children}
    </>
  );
}
