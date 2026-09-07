import AnimatedCount from "@/components/booking/AnimatedCount";
import MapWithAnimatedDots from "@/components/booking/MapWithAnimatedDots";
import { StepBody } from "@/components/steps";

/**
 * HOTFIX-9 §2 — social proof, corrected.
 *
 * This previously read "Glam has helped 23,428 people". Two things were
 * wrong with that on a health-adjacent site, and they are the same class of
 * problem HOTFIX-5 and HOTFIX-6 cleaned up elsewhere:
 *
 * 1. The number. Talha puts the real figure at roughly 970. 23,428 was not
 *    a real count of anything.
 * 2. The attribution. "Glam has helped" claims the Glam Repairs service
 *    served those people. It has not — the leads table holds zero real
 *    client records; all 32 rows are internal test entries. The people
 *    helped were helped by the practitioner, before and outside this
 *    service, which is a true and equally reassuring claim.
 *
 * The number is rounded DOWN to 900+ rather than shown as "970+". A precise
 * figure with a plus on it reads as invented precision; a round, conservative
 * one reads as a confident estimate — and it stays true even if the exact
 * count is softer than Talha remembers.
 *
 * ⚠️ Talha must be able to point at a source for this — clinic records or
 * WhatsApp history — if anyone asks. If he cannot, replace it with a claim
 * he can support rather than lowering the number again.
 */
export default function NotAloneStep() {
  return (
    <div>
      <MapWithAnimatedDots />

      <StepBody className="mt-10 sm:mt-12">
        <p className="font-serif text-[2rem] leading-[1.15] text-[#1b1b1b] sm:text-[2.375rem]">
          You&apos;re not alone — our practitioner has helped{" "}
          <AnimatedCount value={900} className="inline-block" />+ people with
          similar concerns
        </p>
      </StepBody>
    </div>
  );
}
