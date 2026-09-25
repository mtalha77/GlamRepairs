import AnimatedCount from "@/components/booking/AnimatedCount";
import TreatmentProgramFitChart from "@/components/booking/TreatmentProgramFitChart";
import { StepBody } from "@/components/steps";

export default function TreatmentProgramFitStep() {
  return (
    <div>
      <div className="flex justify-center">
        <TreatmentProgramFitChart />
      </div>

      <StepBody className="mt-8 sm:mt-10">
        <p className="font-serif text-[1.75rem] leading-[1.2] text-brand-ink sm:text-[2rem]">
          Your treatment program is a{" "}
          <AnimatedCount value={93} className="inline-block" duration={1600} />% fit
          to your skin by knowing you better
        </p>
      </StepBody>
    </div>
  );
}
