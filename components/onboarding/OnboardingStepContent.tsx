import NotAloneStep from "@/components/booking/steps/NotAloneStep";
import DailyRoutineStep from "@/components/booking/steps/DailyRoutineStep";
import EventDateStep from "@/components/booking/steps/EventDateStep";
import GlamImproveGoalsStep from "@/components/booking/steps/GlamImproveGoalsStep";
import ImproveAreasStep from "@/components/booking/steps/ImproveAreasStep";
import IngredientsFitStep from "@/components/booking/steps/IngredientsFitStep";
import LocationStep from "@/components/booking/steps/LocationStep";
import SkinConditionWorseningStep from "@/components/booking/steps/SkinConditionWorseningStep";
import SkinResultsTimelineStep from "@/components/booking/steps/SkinResultsTimelineStep";
import SkincareJourneyFeelStep from "@/components/booking/steps/SkincareJourneyFeelStep";
import SkincareProductsStep from "@/components/booking/steps/SkincareProductsStep";
import SkinToneStep from "@/components/booking/steps/SkinToneStep";
import SkinTypeStep from "@/components/booking/steps/SkinTypeStep";
import SpecialEventStep from "@/components/booking/steps/SpecialEventStep";
import TreatmentFitStep from "@/components/booking/steps/TreatmentFitStep";
import AboutYouStep from "@/components/onboarding/steps/AboutYouStep";
import ConcernDurationStep from "@/components/onboarding/steps/ConcernDurationStep";
import ContactStep from "@/components/onboarding/steps/ContactStep";
import LifestyleStep from "@/components/onboarding/steps/LifestyleStep";
import PrimaryConcernStep from "@/components/onboarding/steps/PrimaryConcernStep";
import ProgramIntroContent from "@/components/onboarding/ProgramIntroContent";
import UploadInstructionStep from "@/components/onboarding/steps/UploadInstructionStep";
import UploadPhotosStep from "@/components/onboarding/steps/UploadPhotosStep";
import { StepHeader } from "@/components/steps";

type StepContentProps = {
  stepNumber: number;
};

function StepPlaceholder({ stepNumber }: { stepNumber: number }) {
  return (
    <div>
      <StepHeader
        eyebrow={`Step ${stepNumber}`}
        title="Coming soon"
        titleClassName="font-serif text-[1.75rem] leading-tight text-brand-primary sm:text-[2rem]"
        subtitle="This step will be added next."
      />
    </div>
  );
}

/**
 * Single funnel — URL step N === progress N/25.
 * Plan (24) and Consent (25) are rendered by the step page, not here.
 */
export default function OnboardingStepContent({ stepNumber }: StepContentProps) {
  switch (stepNumber) {
    case 1:
      return <ContactStep />;
    case 2:
      return <ProgramIntroContent />;
    case 3:
      return <SkinTypeStep />;
    case 4:
      return <ImproveAreasStep />;
    case 5:
      return <SkinToneStep />;
    case 6:
      return <PrimaryConcernStep />;
    case 7:
      return <ConcernDurationStep />;
    case 8:
      return <DailyRoutineStep />;
    case 9:
      return <SkincareProductsStep />;
    case 10:
      return <NotAloneStep />;
    case 11:
      return <TreatmentFitStep />;
    case 12:
      return <LocationStep />;
    case 13:
      return <IngredientsFitStep />;
    case 14:
      return <AboutYouStep />;
    case 15:
      return <LifestyleStep />;
    case 16:
      return <GlamImproveGoalsStep />;
    case 17:
      return <SkincareJourneyFeelStep />;
    case 18:
      return <SkinConditionWorseningStep />;
    case 19:
      return <SpecialEventStep />;
    case 20:
      return <EventDateStep />;
    case 22:
      return <UploadInstructionStep />;
    case 23:
      return <UploadPhotosStep />;
    case 24:
      return <SkinResultsTimelineStep />;
    default:
      return <StepPlaceholder stepNumber={stepNumber} />;
  }
}
