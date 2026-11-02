"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import PractitionerCard from "@/components/practitioners/PractitionerCard";
import { formInputClassName } from "@/components/ui/fieldStyles";
import { COUNTRY_TIMEZONES, countryName } from "@/lib/countries/timezones";
import { bioExcerpt, isMedicalCredential, type CardPractitioner } from "@/lib/practitioners/card";
import { saveOwnPublicProfile, type PractitionerActionResult } from "@/lib/practitioners/practitionerActions";

/**
 * My practice → Your public profile (Handover 67 §3). Every field that
 * appears publicly, written by the practitioner herself, with a meter that
 * says what each one does on the card and a live preview of the card as it
 * will appear. People fill in a profile when they can see it empty.
 *
 * The preview is the real card component, so it cannot drift from the site.
 */

const COUNTRIES = Object.keys(COUNTRY_TIMEZONES)
  .map((code) => ({ code, name: countryName(code) }))
  .sort((a, b) => a.name.localeCompare(b.name));

const primary = "min-h-11 rounded-xl bg-brand-primary px-4 py-2.5 text-sm text-white disabled:opacity-50";

export type ProfileEditorProps = {
  initial: {
    city: string;
    yearsExperience: string;
    specialisms: string[];
    languages: string;
    credentials: string;
    credentialRef: string;
    quote: string;
    story: string;
    focusNotes: Record<string, string>;
    servesCountries: string[];
    consented: boolean;
  };
  preview: {
    name: string;
    initials: string;
    photo: string | null;
    countryCode: string | null;
    countryName: string | null;
    bio: string;
    nextAvailableAt: string | null;
    /** The degree document is verified by the studio. */
    degreeVerified: boolean;
    /** The exact credential text the studio verified, if any. */
    verifiedCredential: string | null;
  };
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-brand-ink">{label}</span>
      {hint ? <span className="text-xs text-brand-gray">{hint}</span> : null}
      {children}
    </label>
  );
}

export default function ProfileEditor({ initial, preview }: ProfileEditorProps) {
  const router = useRouter();
  const [v, setV] = useState({ ...initial, specialisms: [0, 1, 2].map((i) => initial.specialisms[i] ?? "") });
  const [result, setResult] = useState<PractitionerActionResult | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof typeof v>(k: K, value: (typeof v)[K]) => setV((cur) => ({ ...cur, [k]: value }));

  const focus = v.specialisms.map((s) => s.trim()).filter(Boolean);
  const languages = v.languages.split(",").map((x) => x.trim()).filter(Boolean);
  const credential = v.credentials.trim();
  // As practitioner_public decides it: a medical qualification is shown only
  // as the exact text the studio verified; the tick follows the verified degree.
  const hiddenMedical = isMedicalCredential(credential) && credential !== preview.verifiedCredential;
  const shownCredential = credential && !hiddenMedical ? credential : null;

  const card: CardPractitioner = useMemo(
    () => ({
      slug: "preview",
      name: preview.name,
      role: "Certified Aesthetics Practitioner",
      countryCode: preview.countryCode,
      countryName: preview.countryName,
      photo: preview.photo,
      initials: preview.initials,
      avatar: null,
      sample: false,
      recommended: false,
      years: v.yearsExperience.trim() === "" ? null : Number(v.yearsExperience) || null,
      reads: null,
      rating: null,
      focus,
      quote: v.quote.trim() || null,
      bioExcerpt: v.quote.trim() ? null : bioExcerpt(preview.bio),
      credentialTitle: shownCredential,
      credentialRef: v.credentialRef.trim() || null,
      credentialVerified: Boolean(shownCredential) && preview.degreeVerified,
      languages,
      nextAvailableAt: preview.nextAvailableAt,
      price: null,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recomputed from the form on every change
    [v, preview],
  );

  const meter: { label: string; done: boolean; does: string; required?: boolean; elsewhere?: string }[] = [
    { label: "Photograph", done: Boolean(preview.photo), does: "The portrait across the top of your card.", elsewhere: "above" },
    { label: "Bio", done: preview.bio.trim() !== "", does: "Your profile page, and your card when you have no quote.", required: true, elsewhere: "above" },
    { label: "Focus areas", done: focus.length > 0, does: "The chips on your card. Clients filter by them.", required: true },
    { label: "Qualification", done: credential !== "", does: "The credential line on your card." },
    { label: "Reference number", done: v.credentialRef.trim() !== "", does: "Lets a client check your qualification. This is what makes it believable." },
    { label: "Quote", done: v.quote.trim() !== "", does: "The line in your own voice on your card." },
    { label: "Languages", done: languages.length > 0, does: "Shown on your card. Language is what clients filter on most." },
    { label: "Years of experience", done: v.yearsExperience.trim() !== "", does: "The number on your card." },
    { label: "Longer story", done: v.story.trim() !== "", does: "The long form on your profile page." },
    { label: "What you look for", done: focus.some((f) => (v.focusNotes[f] ?? "").trim() !== ""), does: "A note under each focus area on your profile page." },
    { label: "Countries you serve", done: v.servesCountries.length > 0, does: "Who sees you first in the directory." },
    { label: "Availability", done: preview.nextAvailableAt !== null, does: "\"Next available\" on your card.", elsewhere: "under Your weekly hours" },
  ];
  const filled = meter.filter((m) => m.done).length;
  const blocking = meter.filter((m) => m.required && !m.done);

  const save = () =>
    start(async () => {
      const res = await saveOwnPublicProfile({
        city: v.city,
        yearsExperience: v.yearsExperience,
        specialisms: focus.join(", "),
        languages: v.languages,
        consent: v.consented,
        credentials: v.credentials,
        credentialRef: v.credentialRef,
        quote: v.quote,
        story: v.story,
        focusNotes: v.focusNotes,
        servesCountries: v.servesCountries,
      });
      setResult(res);
      if (res.ok) router.refresh();
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_348px]">
      <div className="space-y-5">
        <div className="rounded-xl border border-brand-lavender/70 bg-brand-surface-alt px-4 py-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-medium text-brand-ink">
              {filled} of {meter.length} filled
            </p>
            <p className={`text-xs font-semibold ${blocking.length ? "text-brand-error-strong" : "text-brand-success-strong"}`}>
              {blocking.length ? `Not on the website until you add: ${blocking.map((b) => b.label.toLowerCase()).join(" and ")}` : "Complete enough to publish"}
            </p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white" aria-hidden>
            <div className="h-full rounded-full bg-brand-primary transition-all" style={{ width: `${Math.round((filled / meter.length) * 100)}%` }} />
          </div>
          <ul className="mt-3 grid gap-1.5 text-xs sm:grid-cols-2">
            {meter.map((m) => (
              <li key={m.label} className="flex items-start gap-2">
                <span aria-hidden className={m.done ? "text-brand-success-strong" : "text-brand-error-strong"}>
                  {m.done ? "✓" : "✕"}
                </span>
                <span>
                  <span className="sr-only">{m.done ? "Filled: " : "Missing: "}</span>
                  <span className="font-medium text-brand-ink">{m.label}</span>
                  <span className="text-brand-gray">
                    {" "}
                    {m.does}
                    {!m.done && m.elsewhere ? ` Add it ${m.elsewhere}.` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Field key={i} label={`Focus area ${i + 1}`} hint={i === 0 ? "What you read most often" : undefined}>
              <input
                value={v.specialisms[i]}
                maxLength={40}
                placeholder={["e.g. Barrier repair", "e.g. Pigmentation", "e.g. Acne marks"][i]}
                onChange={(e) => set("specialisms", v.specialisms.map((s, j) => (j === i ? e.target.value : s)))}
                className={formInputClassName}
              />
            </Field>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Qualification" hint="Exactly as it appears on your certificate">
            <input value={v.credentials} maxLength={120} onChange={(e) => set("credentials", e.target.value)} className={formInputClassName} />
          </Field>
          <Field label="Reference number" hint="The number a client can check, with who issued it">
            <input value={v.credentialRef} maxLength={200} onChange={(e) => set("credentialRef", e.target.value)} className={formInputClassName} />
          </Field>
        </div>
        {hiddenMedical ? (
          <p className="text-xs text-brand-error-strong">
            That reads as a medical qualification. It is shown only once the studio has verified it, so ask the studio before
            changing it.
          </p>
        ) : preview.verifiedCredential && credential !== preview.verifiedCredential ? (
          <p className="text-xs text-brand-gray">Changing your qualification removes the studio&apos;s verification until they check it again.</p>
        ) : null}

        <Field label="Quote" hint="One or two sentences in your own voice, 10 to 220 characters">
          <textarea value={v.quote} maxLength={220} rows={2} onChange={(e) => set("quote", e.target.value)} className={formInputClassName} />
        </Field>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Languages" hint="Comma separated">
            <input value={v.languages} onChange={(e) => set("languages", e.target.value)} className={formInputClassName} />
          </Field>
          <Field label="Years of experience">
            <input inputMode="numeric" value={v.yearsExperience} onChange={(e) => set("yearsExperience", e.target.value)} className={formInputClassName} />
          </Field>
          <Field label="City" hint="Never shown publicly; only your country is">
            <input value={v.city} onChange={(e) => set("city", e.target.value)} className={formInputClassName} />
          </Field>
        </div>

        {focus.length ? (
          <div className="space-y-3">
            <p className="text-sm text-brand-ink">What you look for in each focus area</p>
            {focus.map((f) => (
              <Field key={f} label={f}>
                <textarea
                  value={v.focusNotes[f] ?? ""}
                  maxLength={400}
                  rows={2}
                  onChange={(e) => set("focusNotes", { ...v.focusNotes, [f]: e.target.value })}
                  className={formInputClassName}
                />
              </Field>
            ))}
          </div>
        ) : null}

        <Field label="Longer story" hint="Your training and how you work, for your profile page. Up to 3,000 characters.">
          <textarea value={v.story} maxLength={3000} rows={6} onChange={(e) => set("story", e.target.value)} className={formInputClassName} />
        </Field>

        <details className="rounded-xl border border-brand-lavender/60 px-4 py-3 text-sm">
          <summary className="cursor-pointer text-brand-ink">
            Countries you serve {v.servesCountries.length ? `(${v.servesCountries.length})` : "(none chosen)"}
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {COUNTRIES.map((c) => (
              <label key={c.code} className="flex items-center gap-2 text-sm text-brand-ink">
                <input
                  type="checkbox"
                  checked={v.servesCountries.includes(c.code)}
                  onChange={(e) =>
                    set("servesCountries", e.target.checked ? [...v.servesCountries, c.code] : v.servesCountries.filter((x) => x !== c.code))
                  }
                />
                {c.name}
              </label>
            ))}
          </div>
        </details>

        <label className="flex min-h-12 items-start gap-3 rounded-xl border border-brand-lavender/60 px-4 py-3 text-sm leading-relaxed text-brand-ink">
          <input type="checkbox" checked={v.consented} onChange={(e) => set("consented", e.target.checked)} className="mt-1 h-5 w-5 shrink-0" />
          <span>
            Show my profile on the GlamRepairs website: my name, photograph, title, qualification and reference, bio, story,
            years of experience, country, focus areas, languages and when I am next available. Never my CNIC, documents,
            city, phone number or address.
          </span>
        </label>

        {result ? (
          <p
            role={result.ok ? "status" : "alert"}
            className={`rounded-xl px-4 py-2.5 text-sm ${result.ok ? "bg-brand-success/15 text-brand-success-strong" : "bg-brand-error/10 text-brand-error-strong"}`}
          >
            {result.ok ? result.message : result.error}
          </p>
        ) : null}
        <button type="button" className={primary} disabled={pending} onClick={save}>
          {pending ? "Saving..." : "Save profile"}
        </button>
      </div>

      <div className="lg:sticky lg:top-4 lg:self-start">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-brand-gray">Your card, as clients will see it</p>
        <PractitionerCard p={card} actions={{}} />
        {!v.consented ? <p className="mt-2 text-xs text-brand-gray">Not shown anywhere until you tick the box to show your profile.</p> : null}
      </div>
    </div>
  );
}
