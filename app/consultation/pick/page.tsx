import type { Metadata } from "next";
import Link from "next/link";

import ConsultationPicker from "@/components/consultation/ConsultationPicker";
import { renderMarkdown } from "@/lib/blog/markdown";
import { formatSlot } from "@/lib/consultation/format";
import {
  getConsultationSettings,
  leadFactsById,
  slotForLead,
  verifyLeadSignature,
} from "@/lib/consultation/slots";
import { getWhatsAppChatLink } from "@/lib/funnel/whatsapp";

/**
 * Choose (or re-choose) a consultation time from an emailed link —
 * HANDOVER-50 §1. Reached when a paid client's held time was lost, or when
 * they paid without choosing one. The link is signed per lead; a paid
 * client's pick books immediately.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Choose your consultation time",
  robots: { index: false, follow: false },
};

export default async function PickConsultationPage({
  searchParams,
}: {
  searchParams: Promise<{ l?: string; s?: string }>;
}) {
  const { l = "", s = "" } = await searchParams;
  const valid = /^[0-9a-f-]{36}$/i.test(l) && Boolean(s) && verifyLeadSignature(l, s);
  const facts = valid ? await leadFactsById(l) : null;
  const whatsapp = getWhatsAppChatLink();

  if (!valid || !facts || facts.deleted || !facts.includesVideoCall) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16">
        <h1 className="font-serif text-3xl text-brand-primary">This link is not valid</h1>
        <p className="mt-4 text-brand-gray">
          It may have been copied incompletely. Please message us on{" "}
          <a href={whatsapp} className="underline">WhatsApp</a> and we will arrange your consultation with you.
        </p>
      </main>
    );
  }

  const [settings, current] = await Promise.all([getConsultationSettings(), slotForLead(l)]);
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      {current?.status === "booked" ? (
        <div className="rounded-2xl border border-brand-primary/30 bg-brand-lavender/20 p-5">
          <h1 className="font-serif text-2xl text-brand-ink">Your consultation is booked</h1>
          <p className="mt-2 text-brand-ink">{formatSlot(current.startsAt)}</p>
          <p className="mt-2 text-sm text-brand-gray">
            Your confirmation and video link are in your email. To change the time, message us on{" "}
            <a href={whatsapp} className="underline">WhatsApp</a>.
          </p>
        </div>
      ) : (
        <ConsultationPicker
          mode="link"
          leadId={l}
          signature={s}
          minutes={15}
          guidelinesHtml={settings.guidelinesMarkdown ? renderMarkdown(settings.guidelinesMarkdown) : ""}
        />
      )}
      <p className="mt-6 text-sm text-brand-gray">
        <Link href="/" className="underline">Back to Glam Repairs</Link>
      </p>
    </main>
  );
}
