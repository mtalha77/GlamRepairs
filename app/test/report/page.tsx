import Link from "next/link";
import { redirect } from "next/navigation";

import SampleAssessmentDocument from "@/components/sample/SampleAssessmentDocument";
import { getTestSession } from "@/lib/testPortal/session";

/**
 * Test portal step 6: the genuine report component with demonstration
 * content, the same one /sample-assessment renders. One component, two routes.
 */
export default async function TestReportPage() {
  if (!(await getTestSession())) redirect("/test");
  return (
    <main className="mx-auto max-w-3xl">
      <Link href="/test" className="text-sm font-semibold text-brand-primary">
        ← Test portal
      </Link>
      <p className="mt-4 text-[15px] text-brand-gray">
        This is what a client receives. A practitioner writes it by hand from the answers and photographs; this one is
        demonstration content.
      </p>
      <div className="mt-6">
        <SampleAssessmentDocument />
      </div>
    </main>
  );
}
