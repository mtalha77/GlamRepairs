"use client";

import { StepBody, StepHeader, StepRequiredError } from "@/components/steps";
import {
  useStepAnswer,
  useStepGate,
  useStepRequiredError,
} from "@/lib/funnel/useStepAnswer";
import { useFunnelStore } from "@/lib/funnel/useFunnelStore";

function toLocalISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function EventDateStep() {
  const [eventDate, setEventDate] = useStepAnswer<string>(
    "booking.eventDate",
    "",
  );

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = toLocalISODate(tomorrow);

  // HOTFIX-9 §1 — the nav skips this step entirely when there is no event,
  // but a manual URL or a browser Back can still land here. Never hold
  // someone behind a required date for an event they said they do not have.
  const hasNoEvent = useFunnelStore(
    (state) => state.answers["booking.specialEvent"] === "none",
  );

  const isEmpty = eventDate === "";
  const isFuture = !isEmpty && eventDate >= minDate;
  useStepGate(hasNoEvent || isFuture);

  const requiredError = useStepRequiredError(
    !hasNoEvent && isEmpty,
    "Event date is required.",
  );
  const futureError =
    !isEmpty && !isFuture ? "Please choose a future date." : undefined;
  const error = requiredError ?? futureError;

  return (
    <div>
      <StepHeader
        title="When is your event?"
        subtitle="We will keep this important event in mind for your journey"
      />

      <StepBody>
        <label htmlFor="event-date" className="sr-only">
          Event date
        </label>
        <input
          id="event-date"
          name="eventDate"
          type="date"
          min={minDate}
          value={eventDate}
          onChange={(event) => setEventDate(event.target.value)}
          aria-invalid={error ? true : undefined}
          className={`w-full rounded-2xl border bg-white px-4 py-4 text-sm text-brand-ink shadow-sm outline-none transition-colors placeholder:text-brand-gray/50 sm:px-5 sm:py-[1.125rem] sm:text-[0.9375rem] ${
            error
              ? "border-brand-error focus:border-brand-error"
              : "border-brand-light/80 focus:border-brand-primary"
          }`}
        />
        <StepRequiredError message={error} />
      </StepBody>
    </div>
  );
}
