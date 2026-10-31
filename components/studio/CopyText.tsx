"use client";

import { useState } from "react";

/** A value shown in full with a copy button, for links the studio sends. */
export default function CopyText({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-1 flex items-start gap-2">
      <code className="min-w-0 flex-1 break-all rounded-lg bg-brand-surface-alt px-2.5 py-1.5 text-xs text-brand-ink">{value}</code>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            setCopied(false);
          }
        }}
        className="shrink-0 rounded-lg border border-brand-border-light px-2.5 py-1.5 text-xs text-brand-ink hover:border-brand-primary"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
