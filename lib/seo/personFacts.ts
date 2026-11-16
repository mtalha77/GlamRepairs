import "server-only";

import { publicRosterFacts } from "@/lib/practitioners/directory";
import type { PersonFacts } from "@/lib/seo/schema";

/**
 * Handover 73: what the database says about a person, for their Person node.
 * Every page that emits `personSchema` passes this, so the site-wide graph
 * and the author page cannot disagree about whether a credential is verified.
 */
export async function personFactsFor(slug: string): Promise<PersonFacts> {
  const roster = await publicRosterFacts();
  return { credentialsVerified: roster.degreeVerified(slug), languages: roster.languages(slug) };
}
