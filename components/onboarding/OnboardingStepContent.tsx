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
 * Single funnel — URL step N === progress N/26.
 *
 * Steps 2 and 22 (plan selection, early and confirmation) and 26 (consent)
 * are rendered by the step page rather than here, because they need the
 * pricing region resolved server-side.
 */
export default function OnboardingStepContent({ stepNumber }: StepContentProps) {
  switch (stepNumber) {
    case 1:
      return <ContactStep />;
    case 3:
      return <ProgramIntroContent />;
    case 4:
      return <SkinTypeStep />;
    case 5:
      return <ImproveAreasStep />;
    case 6:
      return <SkinToneStep />;
    case 7:
      return <PrimaryConcernStep />;
    case 8:
      return <ConcernDurationStep />;
    case 9:
      return <DailyRoutineStep />;
    case 10:
      return <SkincareProductsStep />;
    case 11:
      return <NotAloneStep />;
    case 12:
      return <TreatmentFitStep />;
    case 13:
      return <LocationStep />;
    case 14:
      return <IngredientsFitStep />;
    case 15:
      return <AboutYouStep />;
    case 16:
      return <LifestyleStep />;
    case 17:
      return <GlamImproveGoalsStep />;
    case 18:
      return <SkincareJourneyFeelStep />;
    case 19:
      return <SkinConditionWorseningStep />;
    case 20:
      return <SpecialEventStep />;
    case 21:
      return <EventDateStep />;
    case 23:
      return <UploadInstructionStep />;
    case 24:
      return <UploadPhotosStep />;
    case 25:
      return <SkinResultsTimelineStep />;
    default:
      return <StepPlaceholder stepNumber={stepNumber} />;
  }
}
