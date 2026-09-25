import AnimatedCount from "@/components/booking/AnimatedCount";
import IngredientsFitChart from "@/components/booking/IngredientsFitChart";
import { StepBody } from "@/components/steps";

export default function IngredientsFitStep() {
  return (
    <div>
      <div className="flex justify-center">
        <IngredientsFitChart />
      </div>

      <StepBody className="mt-8 sm:mt-10">
        <p className="font-serif text-[1.75rem] leading-[1.2] text-brand-ink sm:text-[2rem]">
          Your treatment program is a{" "}
          <AnimatedCount value={93} className="inline-block" duration={1600} />% fit
          to you thanks to hydration, sensitivity &amp; goal
        </p>
      </StepBody>
    </div>
  );
}
