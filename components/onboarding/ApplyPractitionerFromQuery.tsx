"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { useFunnelStore } from "@/lib/funnel/useFunnelStore";
import { REFERRAL_COOKIE, REFERRED_BY_KEY } from "@/lib/practitioners/referral";

/** The answer key the lead trigger reads to set `preferred_practitioner_id`. */
export const PREFERRED_PRACTITIONER_KEY = "onboarding.preferredPractitioner";

/**
 * "Choose [name]" on a practitioner card (Handover 61 Part 1) arrives as
 * `?practitioner=slug`. The slug is kept as an answer; the database resolves
 * it to an approved practitioner's id on the lead, and ignores anything it
 * does not recognise, so a hand-typed slug grants nothing.
 *
 * A practitioner's own link (/with/[slug]) leaves a cookie instead. It is
 * recorded as the referral, and as the preference too unless the client
 * has chosen someone else.
 */
export default function ApplyPractitionerFromQuery() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const setAnswer = useFunnelStore((state) => state.setAnswer);

  useEffect(() => {
    const ref = document.cookie.match(new RegExp(`(?:^|; )${REFERRAL_COOKIE}=([a-z0-9-]{2,80})(?:;|$)`))?.[1];
    if (!ref) return;
    const { answers } = useFunnelStore.getState();
    if (answers[REFERRED_BY_KEY] !== ref) setAnswer(REFERRED_BY_KEY, ref);
    if (!answers[PREFERRED_PRACTITIONER_KEY]) setAnswer(PREFERRED_PRACTITIONER_KEY, ref);
  }, [setAnswer]);

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
