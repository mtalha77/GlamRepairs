import { NextResponse, type NextRequest } from "next/server";

import { REFERRAL_COOKIE, REFERRAL_MAX_AGE } from "@/lib/practitioners/referral";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * A practitioner's own link, for their own clients: glamrepairs.com/with/[slug].
 *
 * Remembers who sent the visitor for 30 days, then lands them on the
 * practitioner's profile (or the homepage, for a practitioner not in the
 * directory) so they can look around the site first. Whenever they start
 * an assessment in that time, the funnel records the referral on the lead
 * (`referred_by_practitioner_id`, resolved by the database).
 *
 * The cookie holds only the slug, so it is readable by the funnel and
 * grants nothing: the database ignores a slug that is not an approved
 * practitioner. An unknown slug lands on the homepage with no cookie.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const home = new URL("/", request.url);
  if (!/^[a-z0-9-]{2,80}$/.test(slug)) return NextResponse.redirect(home);

  const admin = createAdminSupabaseClient();
  const [{ data: practitioner }, { data: listed }] = await Promise.all([
    admin.from("practitioner_profiles").select("id").eq("slug", slug).eq("status", "approved").maybeSingle(),
    admin.from("practitioner_public").select("id").eq("slug", slug).maybeSingle(),
  ]);
  if (!practitioner) return NextResponse.redirect(home);

  const res = NextResponse.redirect(listed ? new URL(`/practitioners/${slug}`, request.url) : home);
  res.cookies.set(REFERRAL_COOKIE, slug, {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: REFERRAL_MAX_AGE,
  });
  return res;
}
