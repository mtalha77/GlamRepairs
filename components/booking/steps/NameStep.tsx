"use client";

import { StepBody, StepHeader } from "@/components/steps";
import { useFunnelStore } from "@/lib/funnel/useFunnelStore";
import { useStepAnswer, useStepGate } from "@/lib/funnel/useStepAnswer";

export default function NameStep() {
  const [name, setName] = useStepAnswer<string>("booking.name", "");
  const setContact = useFunnelStore((state) => state.setContact);
  useStepGate(name.trim().length > 0);

  const handleChange = (value: string) => {
    setName(value);
    setContact({ fullName: value });
  };

  return (
    <div>
      <StepHeader title="What is your name?" />

      <StepBody>
        <label htmlFor="booking-name" className="sr-only">
          Your name
        </label>
        <input
          id="booking-name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Write your name here"
          value={name}
          onChange={(event) => handleChange(event.target.value)}
          className="w-full rounded-2xl border border-brand-light/80 bg-white px-4 py-4 text-sm text-brand-ink shadow-sm outline-none transition-colors placeholder:text-brand-gray/45 focus:border-brand-primary sm:px-5 sm:py-[1.125rem] sm:text-[0.9375rem]"
        />
      </StepBody>
    </div>
  );
}
