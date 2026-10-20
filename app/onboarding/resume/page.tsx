import type { Metadata } from "next";
import Link from "next/link";

import ResumeFunnel from "@/components/onboarding/ResumeFunnel";
import { verifyLeadResume } from "@/lib/funnel/resumeLink";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * /onboarding/resume — the "Finish your assessment" link (20 October 2026).
 * Puts a saved, unfinished assessment back into this browser and carries on
 * where it stopped. Reached only through the signed link in the email.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Finish your assessment",
  robots: { index: false, follow: false },
};

export default async function ResumePage({ searchParams }: { searchParams: Promise<{ l?: string; s?: string }> }) {
  const { l, s } = await searchParams;
  const valid = Boolean(l && s && /^[0-9a-f-]{36}$/i.test(l) && verifyLeadResume(l, s));
  const { data: lead } = valid
    ? await createAdminSupabaseClient()
        .from("leads")
        .select("session_id, full_name, email, phone, selected_plan, gift_code_used, answers, funnel_step, funnel_complete, deleted_at")
        .eq("id", l!)
        .maybeSingle()
    : { data: null };

  if (!lead || lead.deleted_at || lead.funnel_complete || !lead.session_id) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <h1 className="font-serif text-3xl text-brand-primary">
          {lead?.funnel_complete ? "This assessment has already been sent" : "This link has expired"}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-brand-gray">
          {lead?.funnel_complete
            ? "We have your answers. If you have a question, reply to any of our emails."
            : "You can start a fresh assessment; it takes about ten minutes."}
        </p>
        <Link href="/onboarding/step/1" className="mt-8 inline-flex min-h-12 items-center rounded-full bg-brand-primary px-6 text-sm text-white">
          {lead?.funnel_complete ? "Start another" : "Start your assessment"}
        </Link>
      </main>
    );
  }

  return (
    <ResumeFunnel
      saved={{
        sessionId: lead.session_id,
        fullName: lead.full_name ?? "",
        email: lead.email ?? "",
        phone: lead.phone ?? "",
        selectedPlan: lead.selected_plan,
        giftCode: lead.gift_code_used,
        answers: (lead.answers as Record<string, unknown> | null) ?? {},
        step: lead.funnel_step ?? 1,
      }}
    />
  );
}
