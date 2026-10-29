import AnimatedCount from "@/components/booking/AnimatedCount";
import SkinImprovementChart from "@/components/booking/SkinImprovementChart";
import { StepHeader } from "@/components/steps";

export default function SkinImprovementStep() {
  return (
    <div>
      <div className="flex justify-center">
        <SkinImprovementChart />
      </div>

      <StepHeader
        className="mt-5 sm:mt-6"
        titleSize="sm"
        title={
          <>
            Your skincare program is a{" "}
            <AnimatedCount
              value={93}
              className="inline-block text-brand-primary"
              duration={1600}
            />
            % fit to you thanks to hydration, sensitivity & goal
          </>
        }
      />
    </div>
  );
}
