"use client";

import { useRouter } from "next/navigation";

import PractitionerDirectory from "@/components/practitioners/PractitionerDirectory";
import { PREFERRED_PRACTITIONER_KEY } from "@/components/onboarding/ApplyPractitionerFromQuery";
import { resetFunnel } from "@/components/testPortal/FreshFunnel";
import { useFunnelStore } from "@/lib/funnel/useFunnelStore";
import type { CardPractitioner } from "@/lib/practitioners/card";

/** Step 2: the real directory component, over the sample profiles only. */
export default function TestDirectory({ practitioners }: { practitioners: CardPractitioner[] }) {
  const router = useRouter();
  return (
    <PractitionerDirectory
      practitioners={practitioners}
      noun="sample profiles"
      actionsFor={(p) => ({
        onChoose: () => {
          resetFunnel();
          useFunnelStore.getState().setAnswer(PREFERRED_PRACTITIONER_KEY, p.slug);
          router.push("/onboarding/step/1");
        },
      })}
    />
  );
}
