"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import CharCounter from "@/components/studio/seo/CharCounter";
import {
  DESC_MAX,
  DESC_MIN,
  TITLE_MAX,
  TITLE_MIN,
  checkCanonical,
  checkDescription,
  checkTitle,
} from "@/lib/seo/pageSeoRules";
import { savePageSeo } from "@/lib/seo/seoActions";

export type PageSeoRow = {
  path: string;
  title: string;
  metaDescription: string;
  h1: string;
  ogImageMediaId: string | null;
  noindex: boolean;
  canonicalOverride: string;
  updatedAt: string;
};

export type OgOption = { id: string; label: string; url: string; isOg: boolean };

/**
 * One static page's search appearance — HANDOVER-45 §3.4. Save is disabled
 * while any field would fail a database constraint, so an editor never sees
 * a raw Postgres error. The preview shows the title as it will render,
 * suffix included, because the suffix is what pushes a title over 60.
 */
export default function PageSeoEditor({
  row,
  suffix,
  ogOptions,
}: {
  row: PageSeoRow;
  suffix: string;
  ogOptions: OgOption[];
}) {
  const router = useRouter();
  const [v, setV] = useState(row);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const t = checkTitle(v.title);
  const d = checkDescription(v.metaDescription);
  const c = checkCanonical(v.canonicalOverride);
  const dirty = JSON.stringify(v) !== JSON.stringify(row);
  const canSave = t.ok && d.ok && c.ok && dirty && !pending;
  const rendered = `${v.title}${suffix}`;
  const og = ogOptions.find((o) => o.id === v.ogImageMediaId) ?? null;

  const set = <K extends keyof PageSeoRow>(k: K, value: PageSeoRow[K]) => {
    setMsg(null);
    setV((prev) => ({ ...prev, [k]: value }));
  };

  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-mono text-sm font-semibold">{row.path}</h2>
        <a
          href={row.path}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-neutral-500 underline underline-offset-2"
        >
          View live page
        </a>
      </header>

      {/* Search result preview */}
      <div className="mt-3 rounded-xl bg-neutral-50 p-3">
        <p className="truncate text-[15px] text-blue-800">{rendered}</p>
        <p className="text-xs text-emerald-800">www.glamrepairs.com{row.path === "/" ? "" : row.path}</p>
        <p className="line-clamp-2 text-xs text-neutral-600">{v.metaDescription}</p>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <label className="text-sm font-medium" htmlFor={`t-${row.path}`}>
              Title
            </label>
            <span className="flex gap-3">
              <CharCounter length={v.title.length} min={TITLE_MIN} max={TITLE_MAX} />
              <CharCounter length={rendered.length} max={60} label="renders" />
            </span>
          </div>
          <input
            id={`t-${row.path}`}
            value={v.title}
            onChange={(e) => set("title", e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          {t.message ? <p className="mt-1 text-xs text-red-600">{t.message}</p> : null}
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-2">
            <label className="text-sm font-medium" htmlFor={`d-${row.path}`}>
              Meta description
            </label>
            <CharCounter length={v.metaDescription.length} min={DESC_MIN} max={DESC_MAX} />
          </div>
          <textarea
            id={`d-${row.path}`}
            value={v.metaDescription}
            onChange={(e) => set("metaDescription", e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          {d.message ? <p className="mt-1 text-xs text-red-600">{d.message}</p> : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium" htmlFor={`h-${row.path}`}>
              H1 <span className="font-normal text-neutral-500">(the page heading)</span>
            </label>
            <input
              id={`h-${row.path}`}
              value={v.h1}
              onChange={(e) => set("h1", e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-neutral-500">Empty keeps the heading built into the page.</p>
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor={`o-${row.path}`}>
              Social image
            </label>
            <select
              id={`o-${row.path}`}
              value={v.ogImageMediaId ?? ""}
              onChange={(e) => set("ogImageMediaId", e.target.value || null)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            >
              <option value="">Site default</option>
              {ogOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                  {o.isOg ? "" : " (not 1200 × 630)"}
                </option>
              ))}
            </select>
            {og && !og.isOg ? (
              <p className="mt-1 text-xs text-amber-700">
                Not uploaded as a social card, so platforms will crop it. Upload a 1200 × 630 version.
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium" htmlFor={`c-${row.path}`}>
              Canonical override <span className="font-normal text-neutral-500">(rarely needed)</span>
            </label>
            <input
              id={`c-${row.path}`}
              value={v.canonicalOverride}
              onChange={(e) => set("canonicalOverride", e.target.value)}
              placeholder={row.path}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            {c.message ? <p className="mt-1 text-xs text-red-600">{c.message}</p> : null}
          </div>
          <label className="flex items-start gap-2 pt-6 text-sm">
            <input
              type="checkbox"
              checked={v.noindex}
              onChange={(e) => set("noindex", e.target.checked)}
              className="mt-0.5 h-4 w-4"
            />
            <span>
              Hide from search engines (noindex)
              {v.noindex ? (
                <span className="block text-xs text-red-600">
                  This page will drop out of Google. Only for pages that should not be found.
                </span>
              ) : null}
            </span>
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={!canSave}
            onClick={() =>
              start(async () => {
                const r = await savePageSeo({
                  path: v.path,
                  title: v.title,
                  metaDescription: v.metaDescription,
                  h1: v.h1,
                  ogImageMediaId: v.ogImageMediaId,
                  noindex: v.noindex,
                  canonicalOverride: v.canonicalOverride,
                });
                setMsg(r.ok ? { ok: true, text: "Saved. The live page updates on its next visit." } : { ok: false, text: r.error });
                if (r.ok) router.refresh();
              })
            }
            className="min-h-11 rounded-full bg-neutral-900 px-5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? "Saving…" : "Save"}
          </button>
          {dirty ? (
            <button
              type="button"
              onClick={() => {
                setV(row);
                setMsg(null);
              }}
              className="min-h-11 rounded-full px-3 text-sm text-neutral-600"
            >
              Discard changes
            </button>
          ) : null}
          {msg ? (
            <p className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>
          ) : (
            <p className="text-xs text-neutral-400">
              Last saved {new Date(row.updatedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
