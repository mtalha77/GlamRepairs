"use client";

import { useState } from "react";

/**
 * What you just generated — HOTFIX-29 §3.2.
 *
 * ── Three ways to take the codes out, because there are three jobs ───────
 * Copy all is for pasting into a message or a doc. CSV is for handing a
 * sheet to a collaborator. The per-code copy button is the one that gets
 * used most, because codes usually go out one at a time over WhatsApp, and
 * selecting a single code out of a list of fifty by hand is exactly where a
 * character gets dropped.
 */

function useCopied() {
  const [copied, setCopied] = useState<string | null>(null);
  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      // Clipboard access can be refused (insecure context, permissions).
      // The codes are on screen and selectable, so this is a lost
      // convenience rather than a lost result — say nothing and let the
      // person select the text.
    }
  }
  return { copied, copy };
}

export default function GeneratedCodesPanel({
  batchLabel,
  codes,
}: {
  batchLabel: string;
  codes: { code: string; expiresAt: string }[];
}) {
  const { copied, copy } = useCopied();

  if (!codes.length) return null;

  const allText = codes.map((c) => c.code).join("\n");

  function downloadCsv() {
    const header = "code,expires_at,batch\n";
    /*
     * Each field quoted and inner quotes doubled — RFC 4180. A batch label
     * with a comma in it would otherwise shift every column after it, and
     * the file would look fine until someone sorted by expiry.
     */
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const body = codes
      .map((c) => [c.code, c.expiresAt, batchLabel].map(esc).join(","))
      .join("\n");

    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gift-codes-${batchLabel.replace(/[^a-z0-9-]+/gi, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-2xl border border-brand-success/40 bg-brand-success/5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl text-brand-primary">
            {codes.length} {codes.length === 1 ? "code" : "codes"} ready
          </h2>
          <p className="mt-1 text-sm text-brand-gray">
            Batch <span className="font-mono text-xs">{batchLabel}</span>. They
            are saved — this list is just the easy way to get them out.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => copy("__all", allText)}
            className="rounded-xl border border-brand-primary/40 px-3 py-2 text-sm text-brand-primary hover:bg-brand-lavender/20"
          >
            {copied === "__all" ? "Copied" : "Copy all"}
          </button>
          <button
            type="button"
            onClick={downloadCsv}
            className="rounded-xl border border-brand-primary/40 px-3 py-2 text-sm text-brand-primary hover:bg-brand-lavender/20"
          >
            Download CSV
          </button>
        </div>
      </div>

      <ul className="mt-4 space-y-1.5">
        {codes.map((c) => (
          <li
            key={c.code}
            className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2"
          >
            <span className="font-mono text-sm text-brand-ink">{c.code}</span>
            <button
              type="button"
              onClick={() => copy(c.code, c.code)}
              aria-label={`Copy ${c.code}`}
              className="shrink-0 rounded-lg border border-brand-lavender px-2.5 py-1 text-xs text-brand-primary hover:bg-brand-lavender/20"
            >
              {copied === c.code ? "Copied" : "Copy"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
