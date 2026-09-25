import SkinConditionTrendChart from "@/components/booking/SkinConditionTrendChart";
import { StepBody } from "@/components/steps";

export default function SkinConditionWorseningStep() {
  return (
    <div>
      <p className="font-serif text-[1.75rem] leading-[1.2] text-brand-ink sm:text-[2rem]">
        Get rid of your skin issues with science and self-care
      </p>

      <StepBody className="mt-8 sm:mt-10">
        <div className="flex justify-center">
          <SkinConditionTrendChart />
        </div>

        <p className="mt-8 font-serif text-[1.75rem] leading-[1.2] text-brand-ink sm:mt-10 sm:text-[2rem]">
          Skin condition worsening
        </p>
      </StepBody>
    </div>
  );
}
