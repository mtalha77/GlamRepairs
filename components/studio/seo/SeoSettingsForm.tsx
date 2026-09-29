"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { OgOption } from "@/components/studio/seo/PageSeoEditor";
import { ORGANIZATION_TYPES, checkSameAs } from "@/lib/seo/pageSeoRules";
import { saveSeoSettings } from "@/lib/seo/seoActions";

export type SeoSettingsValues = {
  brandName: string;
  titleSuffix: string;
  defaultOgMediaId: string | null;
  twitterHandle: string;
  organizationType: string;
  sameAs: string;
};

/**
 * Site defaults — HANDOVER-45 §3.4. These reach every page: the suffix on
 * every title, the Organization node in every page's JSON-LD, and the
 * social profiles Google uses to connect the site to its Knowledge Panel.
 */
export default function SeoSettingsForm({
  initial,
  ogOptions,
}: {
  initial: SeoSettingsValues;
  ogOptions: OgOption[];
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const urls = v.sameAs.split(/\n+/).map((u) => u.trim()).filter(Boolean);
  const same = checkSameAs(urls);
  const handleOk = !v.twitterHandle.trim() || /^@[A-Za-z0-9_]{1,15}$/.test(v.twitterHandle.trim());
  const brandOk = v.brandName.trim().length >= 2;
  const dirty = JSON.stringify(v) !== JSON.stringify(initial);
  const canSave = dirty && same.ok && handleOk && brandOk && !pending;

  const set = <K extends keyof SeoSettingsValues>(k: K, value: SeoSettingsValues[K]) => {
    setMsg(null);
    setV((p) => ({ ...p, [k]: value }));
  };

  return (
    <div className="max-w-3xl space-y-5 rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm">
          <span className="font-medium">Brand name</span>
          <input
            value={v.brandName}
            onChange={(e) => set("brandName", e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"
          />
          <span className="mt-1 block text-xs text-neutral-500">
            Used as the organisation&apos;s name in structured data and as the site name on social cards.
          </span>
        </label>
        <label className="text-sm">
          <span className="font-medium">Title suffix</span>
          <input
            value={v.titleSuffix}
            onChange={(e) => set("titleSuffix", e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-mono"
          />
          <span className="mt-1 block text-xs text-neutral-500">
            Added to every page title except blog posts. {v.titleSuffix.length} characters; every
            one of them counts against the 60 a search result shows.
          </span>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm">
          <span className="font-medium">Default social image</span>
          <select
            value={v.defaultOgMediaId ?? ""}
            onChange={(e) => set("defaultOgMediaId", e.target.value || null)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"
          >
            <option value="">Generated brand card</option>
            {ogOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
                {o.isOg ? "" : " (not 1200 × 630)"}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="font-medium">Organisation type</span>
          <select
            value={v.organizationType}
            onChange={(e) => set("organizationType", e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"
          >
            {ORGANIZATION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-neutral-500">
            Medical types are blocked by the database: this is a skincare service, not a clinic.
          </span>
        </label>
      </div>

      <label className="block text-sm">
        <span className="block font-medium">Twitter / X handle</span>
        <input
          value={v.twitterHandle}
          onChange={(e) => set("twitterHandle", e.target.value)}
          placeholder="@glamrepairs"
          className="mt-1 w-full max-w-xs rounded-lg border border-neutral-300 px-3 py-2"
        />
        {!handleOk ? <span className="mt-1 block text-xs text-red-600">Looks like @glamrepairs.</span> : null}
      </label>

      <label className="block text-sm">
        <span className="font-medium">Social profiles (sameAs)</span>
        <textarea
          value={v.sameAs}
          onChange={(e) => set("sameAs", e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-mono text-xs"
        />
        <span className="mt-1 block text-xs text-neutral-500">
          One full link per line. Only profiles that are really yours: Google uses these to decide
          which accounts belong to the business.
        </span>
        {!same.ok ? <span className="mt-1 block text-xs text-red-600">{same.message}</span> : null}
      </label>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={!canSave}
          onClick={() =>
            start(async () => {
              const r = await saveSeoSettings({
                brandName: v.brandName,
                titleSuffix: v.titleSuffix,
                defaultOgMediaId: v.defaultOgMediaId,
                twitterHandle: v.twitterHandle,
                organizationType: v.organizationType,
                sameAs: urls,
              });
              setMsg(r.ok ? { ok: true, text: "Saved. Every page picks this up on its next visit." } : { ok: false, text: r.error });
              if (r.ok) router.refresh();
            })
          }
          className="min-h-11 rounded-full bg-neutral-900 px-5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {msg ? <p className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p> : null}
      </div>
    </div>
  );
}
