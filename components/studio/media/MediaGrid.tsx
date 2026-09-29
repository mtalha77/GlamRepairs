"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { MediaItem, MediaUsage } from "@/lib/studio/media";
import { deleteMedia, updateMediaDetails } from "@/lib/studio/mediaActions";

/**
 * The library grid — HANDOVER-45 §3.2. Newest first. Each card shows what
 * an editor needs to judge an image for search: dimensions, weight, alt
 * text, and where it is used. Delete is disabled while anything uses it,
 * and the server refuses it again at the moment of deletion.
 */
export default function MediaGrid({
  items,
  usage,
}: {
  items: MediaItem[];
  usage: Record<string, MediaUsage>;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-neutral-300 bg-white px-5 py-10 text-center text-sm text-neutral-500">
        No images yet. Upload the first one above.
      </p>
    );
  }
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((m) => (
        <MediaCard key={m.id} item={m} usage={usage[m.id] ?? []} />
      ))}
    </ul>
  );
}

function MediaCard({ item, usage }: { item: MediaItem; usage: MediaUsage }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [alt, setAlt] = useState(item.altText);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const inUse = usage.length > 0;

  return (
    <li className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <div className="aspect-[16/10] bg-neutral-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.publicUrl}
          alt={item.altText}
          width={item.width}
          height={item.height}
          loading="lazy"
          className="h-full w-full object-cover"
          style={{ objectPosition: `${item.focalX * 100}% ${item.focalY * 100}%` }}
        />
      </div>
      <div className="space-y-2 p-4 text-sm">
        <div className="flex items-start justify-between gap-2">
          <p className="break-all font-mono text-xs">{item.filename}</p>
          <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-xs">{item.role}</span>
        </div>
        <p className="text-xs text-neutral-500">
          {item.width} × {item.height} · {Math.round(item.bytes / 1000)} KB ·{" "}
          {new Date(item.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
        </p>

        {editing ? (
          <div>
            <textarea
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
              aria-label="Alt text"
            />
            <div className="mt-1 flex items-center justify-between">
              <span className={`text-xs ${alt.trim().length >= 10 ? "text-emerald-700" : "text-red-600"}`}>
                {alt.trim().length} / 10 min
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="min-h-9 rounded-full px-3 text-xs"
                  onClick={() => {
                    setAlt(item.altText);
                    setEditing(false);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={pending || alt.trim().length < 10}
                  className="min-h-9 rounded-full bg-neutral-900 px-3 text-xs text-white disabled:opacity-40"
                  onClick={() =>
                    start(async () => {
                      const r = await updateMediaDetails({ id: item.id, altText: alt });
                      if (!r.ok) setError(r.error);
                      else {
                        setError(null);
                        setEditing(false);
                        router.refresh();
                      }
                    })
                  }
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-neutral-800">
            <span className="text-xs uppercase tracking-wide text-neutral-400">Alt </span>
            {item.altText}
          </p>
        )}

        <div className="text-xs">
          {inUse ? (
            <details>
              <summary className="cursor-pointer text-neutral-700">
                Used on {usage.length} {usage.length === 1 ? "page" : "pages"}
              </summary>
              <ul className="mt-1 space-y-0.5">
                {usage.map((u) => (
                  <li key={u.label}>
                    <Link href={u.href} className="underline underline-offset-2">
                      {u.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          ) : (
            <span className="text-neutral-500">Not used anywhere yet</span>
          )}
        </div>

        {error ? <p className="text-xs text-red-700">{error}</p> : null}

        <div className="flex flex-wrap gap-2 pt-1">
          {!editing ? (
            <button
              type="button"
              className="min-h-9 rounded-full border border-neutral-300 px-3 text-xs"
              onClick={() => setEditing(true)}
            >
              Edit alt text
            </button>
          ) : null}
          <button
            type="button"
            className="min-h-9 rounded-full border border-neutral-300 px-3 text-xs"
            onClick={async () => {
              await navigator.clipboard.writeText(item.publicUrl).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "Copied" : "Copy URL"}
          </button>
          <button
            type="button"
            disabled={inUse || pending}
            title={inUse ? "Replace it where it is used before deleting" : undefined}
            className="min-h-9 rounded-full border border-red-200 px-3 text-xs text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => {
              if (!confirm(`Delete ${item.filename}? This cannot be undone.`)) return;
              start(async () => {
                const r = await deleteMedia(item.id);
                if (!r.ok) setError(r.error);
                else router.refresh();
              });
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}
