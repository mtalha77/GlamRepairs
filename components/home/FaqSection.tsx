"use client";

import { useState } from "react";
import AnimatedSlideIn from "@/components/home/AnimatedSlideIn";

export type FaqItem = {
  question: string;
  answer: string;
};

const defaultFaqItems: FaqItem[] = [
  {
    question: "Is this an AI tool?",
    answer:
      "No. Every assessment is reviewed manually by a certified aesthetics professional. There are no algorithms, automated reports, or AI-generated routines. Everything you receive has been written specifically for your skin.",
  },
  {
    question: "Who reviews my photos?",
    answer:
      "Ayma Arif, Certified Aesthetics Practitioner, with a BS in Cosmetology & Dermatology Science and experience across multiple clinics in Pakistan.",
  },
  {
    question: "How long does it take to get my assessment?",
    answer:
      "The Clarity plan is delivered within 24 hours. The Transform plan is delivered within 24 hours, with priority review.",
  },
  {
    question: "Do you recommend specific brands?",
    answer:
      "No. We guide you on ingredient types and product categories so you can choose whatever is available and affordable to you, without any brand bias.",
  },
  {
    question: "What if I'm not satisfied?",
    answer:
      "We'll revise your assessment. Your skin is our responsibility until you're confident in your routine.",
  },
  {
    question: "Are my photos private?",
    answer:
      "Completely. Your photos are reviewed only by a certified aesthetics professional, stored under an anonymous case ID, and never shared or sold. You can request deletion of your data at any time.",
  },
];

type FaqAccordionItemProps = {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
};

function FaqAccordionItem({ item, isOpen, onToggle }: FaqAccordionItemProps) {
  return (
    <div className="rounded-[20px] bg-brand-surface px-4 py-4 sm:px-7 sm:py-6">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-start justify-between gap-4 text-left"
      >
        <span
          className={`text-base font-bold leading-snug transition-colors duration-300 sm:text-lg ${
            isOpen ? "text-brand-primary" : "text-black"
          }`}
        >
          {item.question}
        </span>
        <span
          className="mt-0.5 shrink-0 text-xl font-light leading-none text-black transition-transform duration-300"
          aria-hidden
        >
          {isOpen ? "−" : "+"}
        </span>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <p
            className={`pt-4 text-base font-light leading-relaxed text-black transition-opacity duration-300 sm:text-[15px] motion-reduce:transition-none ${
              isOpen ? "opacity-100" : "opacity-0"
            }`}
          >
            {item.answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function FaqSection({
  items = defaultFaqItems,
}: {
  /** Overrides the shared FAQ set — used by /about for its own 7 Q&As. */
  items?: FaqItem[];
}) {
  const [openItems, setOpenItems] = useState<Set<number>>(() => new Set([0]));

  const toggleItem = (index: number) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <section className="w-full bg-white pt-6 pb-12 sm:pt-10 sm:pb-20 lg:pt-12 lg:pb-24">
      <div className="grid w-full gap-8 px-4 sm:gap-12 sm:px-10 lg:grid-cols-[minmax(0,36%)_minmax(0,64%)] lg:items-start lg:gap-12 lg:px-16 xl:px-20">
        <AnimatedSlideIn direction="left">
          <h2 className="font-serif text-[2rem] leading-[1.1] tracking-normal text-brand-primary sm:text-[3.25rem] lg:text-[3.5rem]">
            Frequently asked questions
          </h2>
        </AnimatedSlideIn>

        <div className="flex w-full min-w-0 flex-col gap-4 sm:gap-5">
          {items.map((item, index) => (
            <AnimatedSlideIn
              key={item.question}
              direction="left"
              delay={index * 120}
            >
              <FaqAccordionItem
                item={item}
                isOpen={openItems.has(index)}
                onToggle={() => toggleItem(index)}
              />
            </AnimatedSlideIn>
          ))}
        </div>
      </div>
    </section>
  );
}
