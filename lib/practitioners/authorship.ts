import "server-only";

import { AUTHORS } from "@/lib/seo/authors";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Who is named where — HANDOVER-52 §3.2, step 13.
 *
 * The site's claim is that a named, qualified person reads your
 * photographs. With one practitioner that person is Ayma; with more, every
 * document and email has to name the one who actually did the work. These
 * helpers read the roster, so the copy changes by itself on the day a
 * second practitioner is approved, and not before.
 */

export type ReportSignature = {
  /** The name recorded against the report. */
  name: string | null;
  authorSlug?: string;
  signer?: { name: string; title: string; credentials: string };
};

/**
 * The signature for a report sent by this account. A practitioner with a
 * hand-written author record (Ayma) signs with it, HEC reference and all;
 * any other practitioner signs with her own profile. An account with no
 * practitioner profile keeps the default signature, exactly as before.
 */
export async function reportSignatureFor(userId: string): Promise<ReportSignature> {
  const { data: profile } = await createAdminSupabaseClient()
    .from("practitioner_profiles")
    .select("slug, full_name, title, credentials")
    .eq("user_id", userId)
    .maybeSingle();
  if (!profile) return { name: null };
  const record = AUTHORS[profile.slug];
  if (record) return { name: record.name, authorSlug: record.slug };
  return {
    name: profile.full_name,
    signer: { name: profile.full_name, title: profile.title, credentials: profile.credentials },
  };
}

/** More than one approved practitioner who reviews assessments. Errs towards "no". */
export async function hasReviewingTeam(): Promise<boolean> {
  try {
    const { count, error } = await createAdminSupabaseClient()
      .from("practitioner_profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved")
      .eq("can_review", true);
    return !error && (count ?? 0) > 1;
  } catch {
    return false;
  }
}

/**
 * The line under "Choose your consultation time". Clients choose a time,
 * not a person, so with more than one practitioner offering times the line
 * cannot name one of them.
 */
export async function consultationPractitionerLine(): Promise<string> {
  // Handover 65 §4.2: read the go-live rule from its one source, not a
  // copy of it, so this line can never name someone the site hides.
  const { data } = await createAdminSupabaseClient()
    .from("practitioner_public")
    .select("display_name, role_title")
    .limit(2);
  if (data?.length === 1) return `${data[0].display_name}, ${data[0].role_title}`;
  return "A practitioner from our team";
}

export async function practitionerName(practitionerId: string): Promise<string> {
  const { data } = await createAdminSupabaseClient()
    .from("practitioner_profiles")
    .select("full_name")
    .eq("id", practitionerId)
    .maybeSingle();
  return data?.full_name ?? "your practitioner";
}

export type PublicPractitioner = {
  slug: string;
  name: string;
  title: string;
  credentials: string;
  bio: string;
  photo: string | null;
  left: boolean;
  city: string | null;
  yearsExperience: number | null;
  specialisms: string[];
  languages: string[];
  nextAvailableAt: string | null;
};

/**
 * A practitioner's public author page, for one with no hand-written record
 * in lib/seo/authors.ts. Only what she agreed to show (public_consent_at,
 * through the practitioners_public view). Someone who has left keeps a
 * minimal page so an old byline still resolves (HANDOVER-52 §3.3). The
 * photograph only once the studio has checked it.
 */
export async function publicPractitioner(slug: string): Promise<PublicPractitioner | null> {
  if (!/^[a-z0-9-]{2,80}$/.test(slug) || AUTHORS[slug]) return null;
  try {
    const admin = createAdminSupabaseClient();
    const [{ data: live }, { data: row }] = await Promise.all([
      admin.from("practitioners_public").select("*").eq("slug", slug).maybeSingle(),
      admin
        .from("practitioner_profiles")
        .select("slug, full_name, title, credentials, bio, photo_url, profile_photo_verified, status, public_consent_at")
        .eq("slug", slug)
        .in("status", ["approved", "offboarded"])
        .not("public_consent_at", "is", null)
        .maybeSingle(),
    ]);
    if (!row) return null;
    return {
      slug: row.slug,
      name: row.full_name,
      title: row.title,
      credentials: row.credentials,
      bio: row.bio ?? "",
      photo: row.profile_photo_verified ? row.photo_url : null,
      left: row.status === "offboarded",
      city: live?.city ?? null,
      yearsExperience: live?.years_experience ?? null,
      specialisms: live?.specialisms ?? [],
      languages: live?.languages ?? [],
      nextAvailableAt: live?.accepting_clients ? (live.next_available_at ?? null) : null,
    };
  } catch {
    return null;
  }
}
