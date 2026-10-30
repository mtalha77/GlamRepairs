"use client";

import { useState } from "react";

/**
 * The practitioner's own link, with a copy button and a WhatsApp share.
 * Their clients can look around the site from it; whenever they start an
 * assessment within 30 days, the lead records who sent them.
 */
export default function ReferralLink({ url, name }: { url: string; name: string }) {
  const [copied, setCopied] = useState(false);
  const share = `I use Glam Repairs for skin assessments. Start yours with me here: ${url}`;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 break-all rounded-lg border border-brand-lavender/70 bg-brand-surface-alt px-3 py-2 text-sm text-brand-ink">
          {url}
        </code>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              setCopied(false);
            }
          }}
          className="min-h-10 rounded-lg bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-primary-dark"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(share)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 items-center rounded-lg border border-brand-primary px-4 text-sm font-semibold text-brand-primary hover:bg-brand-primary hover:text-white"
        >
          Share on WhatsApp
        </a>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-brand-gray">
        Send this to your own clients, {name}. They can look around the site first; whenever they start an assessment within 30
        days, it is recorded that you sent them, and you are set as their preferred practitioner unless they choose someone else.
      </p>
    </div>
  );
}
