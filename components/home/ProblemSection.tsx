import Image from "next/image";
import ProblemCardsGroup from "@/components/home/ProblemCardsGroup";
import ProblemSectionHeader from "@/components/home/ProblemSectionHeader";

const WOMAN_IMAGE = "/images,svgs/woman-hands-shoulder.webp";

const OVAL_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 840 749"><ellipse cx="420" cy="374.5" rx="226" ry="468.125" fill="white" transform="rotate(45 420 374.5)"/></svg>',
)}")`;

const problemCards = [
  {
    icon: "/svgs/Group (1).svg",
    title: "Clinic visits cost too much",
    description:
      "Paying thousands for a consultation - just to leave with a generic prescription & zero follow-up. You deserve better than that.",
    variant: "purple" as const,
    direction: "left" as const,
    className:
      "lg:absolute lg:top-[6%] lg:left-[2%] lg:max-w-[14rem] lg:translate-x-[80px] xl:max-w-[15rem] xl:left-[6%]",
  },
  {
    icon: "/svgs/Vector (4).svg",
    title: "Advice doesn't match your skin",
    description:
      "A routine built for 'oily skin' isn't built for your oily skin. Generic advice ignores your history, climate, diet, and lifestyle.",
    variant: "cream" as const,
    direction: "left" as const,
    className:
      "lg:absolute lg:top-[78%] lg:left-[2%] lg:z-20 lg:max-w-[14rem] lg:translate-x-[20px] xl:max-w-[15rem] xl:left-[5%]",
  },
  {
    icon: "/svgs/Vector (4).svg",
    title: "Everyone is selling you something",
    description:
      "Most 'skin advice' online is just influencer marketing in disguise. We recommend what works for your skin - not what pays us a commission.",
    variant: "purple" as const,
    direction: "right" as const,
    className:
      "lg:absolute lg:top-[30%] lg:right-[6%] lg:max-w-[14rem] xl:max-w-[15rem] xl:right-[5%]",
  },
];

export default function ProblemSection() {
  return (
    <section className="relative overflow-hidden bg-brand-surface-alt px-4 pt-12 pb-16 sm:px-6 sm:pt-20 sm:pb-24 lg:px-12 lg:pt-24 lg:pb-32">
      <div
        aria-hidden
        // HOTFIX-41 §5 — below `sm` this 320px blob sat mostly past the
        // right edge, laid out and painted off-screen for nothing.
        className="pointer-events-none absolute -right-16 bottom-0 hidden h-80 w-80 rounded-full bg-brand-light/35 blur-3xl sm:block"
      />

      <div className="relative mx-auto max-w-7xl">
        <ProblemSectionHeader />

        <div className="relative mt-8 sm:mt-12 lg:mt-10 lg:min-h-[880px]">
          {/* HOTFIX-41 §2 — the illustration is decoration around the
              three cards, and on a phone it stacked above them as its own
              300px block. It returns from `sm`, where it sits among them. */}
          <div className="relative z-[1] hidden justify-center sm:-mt-6 sm:flex lg:absolute lg:inset-x-0 lg:top-[44%] lg:-translate-y-1/2 lg:-mt-0">
            <div className="relative aspect-[840/749] w-full max-w-[20rem] sm:max-w-[38rem] lg:max-w-[46rem] xl:max-w-[52rem] 2xl:max-w-[58rem]">
              <Image
                src={WOMAN_IMAGE}
                alt="Woman touching her shoulder during skincare self-care"
                fill
                sizes="(max-width: 640px) 544px, 928px"
                className="object-cover object-center"
                style={{
                  WebkitMaskImage: OVAL_MASK,
                  maskImage: OVAL_MASK,
                  WebkitMaskSize: "100% 100%",
                  maskSize: "100% 100%",
                  WebkitMaskRepeat: "no-repeat",
                  maskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  maskPosition: "center",
                }}
                priority={false}
              />
              <Image
                src="/svgs/curve (2).svg"
                alt=""
                width={570}
                height={553}
                className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-auto w-[66%] max-w-none"
                style={{
                  transform:
                    "translate(-32%, calc(-50% - 19%)) scale(1) rotate(-5deg)",
                  transformOrigin: "center center",
                }}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 z-10 hidden h-[125%] w-[38%] -translate-x-1/2 -translate-y-1/2 rotate-[40deg] rounded-[50%] border-2 border-brand-primary"
              />
            </div>
          </div>

          <ProblemCardsGroup cards={problemCards} />
        </div>
      </div>
    </section>
  );
}
