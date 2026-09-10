import type { Metadata } from "next";
import Link from "next/link";

import { checkGiftCode } from "@/lib/gifts/issueGiftCode";
import {
  GIFT_REJECTION_COPY,
  normaliseGiftCode,
} from "@/lib/gifts/giftCodes";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * HANDOVER-20 Part 2 — the page the recipient lands on.
 *
 * Two rules shape it:
 *
 * 1. An invalid code must "say why and offer the normal paid route rather
 *    than a dead end". Someone holding a used or expired code is still a
 *    person who wants an assessment, and sending them to a 404 loses them.
 *
 * 2. It says what the gift covers and who sent it. "Hina has gifted you a
 *    skin assessment" is the whole reason this converts better than a
 *    discount code — it arrives as a gesture from a person, not a promotion.
 *
 * Not gated on GIFT_PROGRAMME_ENABLED, deliberately: if a code exists,
 * whoever is holding it must be able to redeem it even if issuing is later
 * switched off. Turning the flag off should stop new gifts, not void ones
 * real people are already carrying.
 */

export const metadata: Metadata = {
  title: "Your gifted skin assessment",
  // A gift link is shared privately between two people; it has no business
  // in search results.
  robots: { index: false, follow: false },
};

type GiftPageProps = {
  params: Promise<{ code: string }>;
};

/** The giver's first name, for "Hina has gifted you a skin assessment". */
async function getGiverFirstName(code: string): Promise<string | null> {
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("gift_codes")
    .select("issued_to_lead")
    .eq("code", code)
    .maybeSingle();

  if (!data?.issued_to_lead) return null;

  const { data: lead } = await supabase
    .from("leads")
    .select("full_name")
    .eq("id", data.issued_to_lead)
    .maybeSingle();

  const name = lead?.full_name?.trim();
  if (!name) return null;
  // First name only. The giver shared a gift, not their full identity.
  return name.split(/\s+/)[0] ?? null;
}

const PLAN_LABEL: Record<string, string> = {
  free: "Skin Starter",
  clarity: "Skin Clarity",
  transform: "Skin Transform",
};

export default async function GiftPage({ params }: GiftPageProps) {
  const { code: rawCode } = await params;
  const code = normaliseGiftCode(decodeURIComponent(rawCode));

  // No person key yet — nobody has identified themselves at this point. The
  // self-redemption check runs again at insert, where identity is known.
  const result = await checkGiftCode(code, null);

  if (!result.valid) {
    const copy =
      result.reason === "ok"
        ? GIFT_REJECTION_COPY.not_found
        : GIFT_REJECTION_COPY[result.reason];

    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-16">
        <div className="rounded-3xl border border-brand-lavender/70 bg-white p-7 shadow-sm">
          <h1 className="font-serif text-2xl text-brand-primary">
            {copy.title}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-brand-gray">
            {copy.body}
          </p>
          <p className="mt-5 text-sm leading-relaxed text-brand-ink">
            You can still book an assessment yourself — a certified
            practitioner reads your photographs and writes your routine by
            hand.
          </p>
          <Link
            href="/pricing"
            className="mt-5 inline-flex rounded-full bg-brand-light px-6 py-3 text-xs uppercase tracking-[0.15em] text-white"
          >
            See the plans
          </Link>
          <p className="mt-4 text-xs text-brand-gray">
            Think this is a mistake? Message us on WhatsApp and we&rsquo;ll sort
            it out.
          </p>
        </div>
      </main>
    );
  }

  const giver = await getGiverFirstName(code);
  const planLabel = PLAN_LABEL[result.grantsPlan ?? "clarity"] ?? "assessment";
  const isFull = (result.discountPct ?? 0) >= 100;

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-16">
      <div className="rounded-3xl border border-brand-lavender/70 bg-white p-7 shadow-sm">
        <p className="text-xs uppercase tracking-[0.16em] text-brand-accent">
          A gift for you
        </p>
        <h1 className="mt-2 font-serif text-[1.75rem] leading-tight text-brand-primary">
          {giver
            ? `${giver} has gifted you a skin assessment`
            : "You've been gifted a skin assessment"}
        </h1>

        <p className="mt-4 text-sm leading-relaxed text-brand-ink">
          {isFull ? (
            <>
              This covers a full <strong className="font-medium">{planLabel}</strong>{" "}
              assessment. No charge, no catch.
            </>
          ) : (
            <>
              This covers {result.discountPct}% of a{" "}
              <strong className="font-medium">{planLabel}</strong> assessment.
            </>
          )}
        </p>

        <ul className="mt-5 space-y-2 text-sm leading-relaxed text-brand-gray">
          <li>A certified practitioner reads your photographs personally.</li>
          <li>You get a written routine, not an automated report.</li>
          <li>We name ingredient types and budgets, never brands.</li>
        </ul>

        <Link
          href={`/onboarding/step/1?gift=${encodeURIComponent(code)}`}
          className="mt-6 inline-flex rounded-full bg-brand-light px-6 py-3.5 text-xs uppercase tracking-[0.15em] text-white"
        >
          Start my assessment
        </Link>

        <p className="mt-4 font-mono text-xs text-brand-gray">{code}</p>
      </div>
    </main>
  );
}
