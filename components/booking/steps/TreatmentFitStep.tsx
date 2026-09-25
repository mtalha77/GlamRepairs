import Image from "next/image";

import AnimatedCount from "@/components/booking/AnimatedCount";
import SkinWellnessChart from "@/components/booking/SkinWellnessChart";
import { StepBody } from "@/components/steps";

const programFeatures = [
  {
    icon: "/svgs/Vector (9).svg",
    label: "Personalized to you",
  },
  {
    icon: "/svgs/Group 2085660800.svg",
    label: "Safe & dermatologist guided",
  },
  {
    icon: "/svgs/Group 2085660799.svg",
    label: "Targeted results",
  },
  {
    icon: "/svgs/Group 2085660791.svg",
    label: "Healthier skin, every day",
  },
] as const;

function ProgramFeatureItem({
  icon,
  label,
}: {
  icon: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className="flex h-9 w-9 items-center justify-center sm:h-10 sm:w-10">
        <Image
          src={icon}
          alt=""
          width={42}
          height={42}
          className="h-8 w-auto object-contain sm:h-9"
        />
      </span>
      <p className="max-w-[5rem] text-[11px] leading-snug text-black sm:max-w-[5.5rem] sm:text-[13px]">
        {label}
      </p>
    </div>
  );
}

export default function TreatmentFitStep() {
  return (
    <div>
      <div className="flex justify-center">
        <SkinWellnessChart />
      </div>

      <StepBody className="mt-8 sm:mt-10">
        <p className="font-serif text-[1.75rem] leading-[1.2] text-brand-ink sm:text-[2rem]">
          Your treatment program is a{" "}
          <AnimatedCount value={93} className="inline-block" duration={1600} />% fit
          to you by knowing your skin type and concerns
        </p>
      </StepBody>

      <div className="mt-8 grid grid-cols-4 gap-2 sm:mt-10 sm:gap-3">
        {programFeatures.map((feature) => (
          <ProgramFeatureItem
            key={feature.label}
            icon={feature.icon}
            label={feature.label}
          />
        ))}
      </div>
    </div>
  );
}
