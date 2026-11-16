import Link from "next/link";

import { EDITORIAL_STANDARDS } from "@/lib/seo/editorialStandards";

/** Handover 73 Part 3.1: the same box, from one constant, on every article. */
export default function EditorialStandards() {
  return (
    <aside className="mt-14 rounded-2xl border border-brand-lavender/70 bg-brand-purple-tint px-6 py-5 text-sm leading-relaxed text-brand-gray">
      <p>
        <strong className="font-semibold text-brand-ink">{EDITORIAL_STANDARDS.lead}</strong> {EDITORIAL_STANDARDS.body}
      </p>
      <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
        {EDITORIAL_STANDARDS.links.map((l) => (
          <Link key={l.href} href={l.href} className="font-medium text-brand-primary underline underline-offset-2">
            {l.label} <span aria-hidden>→</span>
          </Link>
        ))}
      </p>
    </aside>
  );
}
