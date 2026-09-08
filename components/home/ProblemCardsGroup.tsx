"use client";

import AnimatedProblemCard from "@/components/home/AnimatedProblemCard";

type ProblemCardData = {
  icon: string;
  title: string;
  description: string;
  variant: "purple" | "cream";
  direction?: "left" | "right";
  className?: string;
};

type ProblemCardsGroupProps = {
  cards: ProblemCardData[];
};

export default function ProblemCardsGroup({ cards }: ProblemCardsGroupProps) {
  return (
    <div className="relative z-10 mt-8 flex flex-col gap-4 sm:mt-10 sm:gap-6 lg:contents lg:mt-0">
      {cards.map((card, index) => (
        <AnimatedProblemCard
          key={card.title}
          {...card}
          delay={index * 70}
        />
      ))}
    </div>
  );
}
