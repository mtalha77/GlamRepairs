import { redirect } from "next/navigation";

/**
 * Single funnel starts at step 1 (URL matches progress bar). The query is
 * carried through: `?plan=` from pricing and `?practitioner=` from the
 * practitioner cards both land here.
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") params.set(key, value);
  }
  const query = params.toString();
  redirect(query ? `/onboarding/step/1?${query}` : "/onboarding/step/1");
}
