"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { useFunnelStore } from "@/lib/funnel/useFunnelStore";

/** The answer key the lead trigger reads to set `preferred_practitioner_id`. */
export const PREFERRED_PRACTITIONER_KEY = "onboarding.preferredPractitioner";

/**
 * "Choose [name]" on a practitioner card (Handover 61 Part 1) arrives as
 * `?practitioner=slug`. The slug is kept as an answer; the database resolves
 * it to an approved practitioner's id on the lead, and ignores anything it
 * does not recognise, so a hand-typed slug grants nothing.
 */
export default function ApplyPractitionerFromQuery() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const setAnswer = useFunnelStore((state) => state.setAnswer);

  useEffect(() => {
    const slug = searchParams.get("practitioner");
    if (!slug || !/^[a-z0-9-]{2,80}$/.test(slug)) return;
    setAnswer(PREFERRED_PRACTITIONER_KEY, slug);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("practitioner");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [searchParams, pathname, router, setAnswer]);

  return null;
}
