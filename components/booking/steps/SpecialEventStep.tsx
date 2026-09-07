"use client";

import {
  StepBody,
  StepChoiceCard,
  StepChoiceList,
  StepHeader,
  StepRequiredError,
} from "@/components/steps";
import {
  useStepAnswer,
  useStepGate,
  useStepRequiredError,
} from "@/lib/funnel/useStepAnswer";
import { useFunnelStore } from "@/lib/funnel/useFunnelStore";

type SpecialEventChoice =
  | "vacation"
  | "wedding"
  | "holiday"
  | "sporting-event"
  | "reunion"
  | "family-occasion"
  | "other"
  | "none";

type EventOption = {
  value: SpecialEventChoice;
  label: string;
  icon?: string;
};

// HOTFIX-9 §1 — "no event" first. Most people do not have one coming up,
// so the majority answer is one tap instead of a scan through seven options
// they are going to reject.
const eventOptions: EventOption[] = [
  { value: "none", label: "No, ready to look and feel my best" },
  { value: "vacation", label: "Vacation", icon: "/svgs/Group (26).svg" },
  { value: "wedding", label: "Wedding", icon: "/svgs/Group 2085660850.svg" },
  { value: "holiday", label: "Holiday", icon: "/svgs/Group 2085660851.svg" },
  {
    value: "sporting-event",
    label: "Sporting event",
    icon: "/svgs/Group 2085660852.svg",
  },
  { value: "reunion", label: "Reunion", icon: "/svgs/Group 2085660918.svg" },
  {
    value: "family-occasion",
    label: "Family occasion",
    icon: "/svgs/Layer_x0020_1 (1).svg",
  },
  { value: "other", label: "Other" },
];

export default function SpecialEventStep() {
  const [selectedEvent, setSelectedEvent] = useStepAnswer<SpecialEventChoice | null>(
    "booking.specialEvent",
    null,
  );
  const setAnswer = useFunnelStore((state) => state.setAnswer);
  useStepGate(selectedEvent !== null);
  const error = useStepRequiredError(
    selectedEvent === null,
    "Please select an option.",
  );

  return (
    <div>
      <StepHeader
        title="Do you have a special event coming up?"
        subtitle="Having something to look forward to can be a great motivator for reaching your goal"
      />

      <StepBody>
        <StepChoiceList spacing="compact">
          {eventOptions.map((option) => (
            <StepChoiceCard
              key={option.value}
              variant="icon"
              iconSize="medium"
              labelStyle="snug"
              icon={option.icon}
              label={option.label}
              selected={selectedEvent === option.value}
              onSelect={() => {
                setSelectedEvent(option.value);
                // HOTFIX-9 §1 — someone can pick Wedding, set a date, come
                // back and switch to "none". Without this the stale date
                // rides along into the practitioner's case notes as the
                // date of an event that does not exist.
                if (option.value === "none") {
                  setAnswer("booking.eventDate", "");
                }
              }}
            />
          ))}
        </StepChoiceList>
        <StepRequiredError message={error} />
      </StepBody>
    </div>
  );
}
