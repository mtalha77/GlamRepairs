import "server-only";

import type { AgreementStatus } from "@/lib/practitioners/agreements";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Every gate between a practitioner and the website, read from the
 * practitioner_readiness view (Handover 65 §0.3). The view, not this file,
 * holds the rules; this only says who can clear each one.
 */

export type ReadinessRow = {
  id: string;
  status: string;
  track: string;
  approved: boolean;
  terms_signed: boolean;
  terms_version: string | null;
  terms_signed_at: string | null;
  consented: boolean;
  accepting: boolean;
  can_review: boolean;
  photo_verified: boolean;
  has_photo: boolean;
  bio_ok: boolean;
  payout_set: boolean;
  has_account: boolean;
  licence_ok: boolean;
  degree_verified: boolean;
  live: boolean;
  probation_reports_remaining: number | null;
  probation_waived: boolean;
  profile_complete: boolean;
  has_bio: boolean;
  has_focus: boolean;
};

export type Gate = {
  key: string;
  label: string;
  done: boolean;
  /** "you" is the studio; "them" is the practitioner. */
  owner: "you" | "them";
  note?: string;
};

export async function readinessFor(ids: string[]): Promise<Map<string, ReadinessRow>> {
  if (!ids.length) return new Map();
  const { data, error } = await createAdminSupabaseClient().from("practitioner_readiness").select("*").in("id", ids);
  if (error) console.error("[readiness]", error.message);
  return new Map(((data ?? []) as ReadinessRow[]).map((r) => [r.id, r]));
}

/**
 * The checklist, in the order the gates are cleared. Approval is checked by
 * the database against the rows above it, so those come first.
 */
export function gatesFor(r: ReadinessRow, agreement?: AgreementStatus | null): Gate[] {
  const gates: Gate[] = [
    { key: "account", label: "Signed in to the studio at least once", done: r.has_account, owner: "them" },
    { key: "degree", label: "Degree document verified", done: r.degree_verified, owner: "you" },
    {
      key: "photo",
      label: "Profile photograph uploaded and checked",
      done: r.has_photo && r.photo_verified,
      owner: r.has_photo ? "you" : "them",
    },
    { key: "bio", label: "Bio of more than 80 characters", done: r.bio_ok, owner: "them" },
    { key: "payout", label: "Payout method recorded", done: r.payout_set, owner: "you" },
    agreementGate(r, agreement ?? null),
  ];
  if (r.track === "medical") {
    gates.push({ key: "licence", label: "PMDC registration verified in the last six months", done: r.licence_ok, owner: "you" });
  }
  gates.push(
    { key: "approved", label: "Approved by the studio", done: r.approved, owner: "you" },
    {
      // Handover 67 §4: approved and assignable without it; only the public card waits.
      key: "complete",
      label: "Profile ready to publish",
      done: r.profile_complete,
      owner: "them",
      note: r.profile_complete
        ? undefined
        : `Missing: ${[r.has_bio ? null : "a bio", r.has_focus ? null : "at least one focus area"].filter(Boolean).join(" and ")}. They can be assigned work meanwhile.`,
    },
    {
      key: "consent",
      label: "Agreed to their profile being shown",
      done: r.consented,
      owner: "them",
      note: r.consented ? undefined : "Only they can give this, in My practice.",
    },
    { key: "accepting", label: "Taking new clients", done: r.accepting, owner: r.consented ? "you" : "them" },
    {
      key: "review",
      label: "Can be assigned reports",
      done: r.can_review,
      owner: "you",
      note:
        r.can_review && !r.probation_waived && (r.probation_reports_remaining ?? 0) > 0
          ? `On probation: ${r.probation_reports_remaining} reports checked before sending.`
          : undefined,
    },
  );
  return gates;
}

/**
 * Handover 66 §6: the agreement row reads the acceptance records. Once a
 * version is published it waits on them (they accept it in the studio);
 * before that it waits on you (publish one under Agreements).
 */
function agreementGate(r: ReadinessRow, a: AgreementStatus | null): Gate {
  if (a?.required_version) {
    return {
      key: "terms",
      label: `Practitioner agreement ${a.required_version} accepted`,
      done: a.up_to_date,
      owner: "them",
      note: a.up_to_date
        ? `${a.evidence ?? "accepted"}${a.accepted_at ? `, ${a.accepted_at.slice(0, 10)}` : ""}`
        : "They read and accept it in the studio; it opens on their next sign-in.",
    };
  }
  return {
    key: "terms",
    label: "Practitioner agreement accepted",
    done: r.terms_signed,
    owner: "you",
    note: r.terms_signed
      ? `${r.terms_version}, recorded before agreement versions existed`
      : "No agreement version is published yet. Publish one under Agreements.",
  };
}
