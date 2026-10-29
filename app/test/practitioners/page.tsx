import Link from "next/link";
import { redirect } from "next/navigation";

import TestDirectory from "@/components/testPortal/TestDirectory";
import { listSamplePractitioners } from "@/lib/practitioners/directory";
import { getTestSession } from "@/lib/testPortal/session";

/** Test portal step 2. Sample profiles only, each with its own badge. */
export default async function TestPractitionersPage() {
  if (!(await getTestSession())) redirect("/test");
  const practitioners = await listSamplePractitioners();
  return (
    <main className="mx-auto max-w-[1120px]">
      <Link href="/test" className="text-sm font-semibold text-brand-primary">
        ← Test portal
      </Link>
      <h1 className="mt-4 font-sans text-[1.6rem] font-semibold leading-tight text-brand-ink">
        Read them properly, <span className="font-serif italic text-brand-primary">then choose.</span>
      </h1>
      <p className="mt-3 max-w-[58ch] text-[15.5px] leading-relaxed text-brand-gray">
        Anyone here can read your photographs wherever you are. Country affects when they are awake, not whether they can
        help you.
      </p>
      <TestDirectory practitioners={practitioners} />
    </main>
  );
}
