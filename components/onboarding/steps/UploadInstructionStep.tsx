import Image from "next/image";
import { StepHeader } from "@/components/steps";

const wrongPhoto = "/onboarding/photo-guide-wrong.jpg";
const correctPhoto = "/onboarding/photo-guide-correct.png";

const photoTips = [
  {
    lead: "Natural light only",
    rest: ". Stand near a window. Avoid flash or overhead lights.",
  },
  {
    lead: "No filters, no makeup",
    rest: ". Your skin needs to be visible as it is.",
  },
  {
    lead: "Photos to take",
    rest: " Front View, Side View, Concern Area",
  },
  {
    lead: "Hold the camera at eye level",
    rest: ", not above or below.",
  },
] as const;

function PhotoExample({
  src,
  alt,
  badge,
}: {
  src: string;
  alt: string;
  badge: "wrong" | "correct";
}) {
  return (
    <div className="relative aspect-[224/300] w-full overflow-visible rounded-[1.25rem]">
      <div className="absolute inset-0 overflow-hidden rounded-[1.25rem]">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 640px) 45vw, 224px"
          className="object-cover"
        />
      </div>
      <span
        className={`absolute bottom-0 left-1/2 z-10 flex h-7 w-7 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full text-white sm:h-8 sm:w-8 ${
          badge === "wrong" ? "bg-brand-error" : "bg-brand-success"
        }`}
      >
        {badge === "wrong" ? (
          <svg aria-hidden viewBox="0 0 12 12" className="h-3.5 w-3.5" fill="none">
            <path
              d="M3 3L9 9M9 3L3 9"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg aria-hidden viewBox="0 0 12 10" className="h-3 w-3.5" fill="none">
            <path
              d="M1 5.2L4.2 8.4L11 1.6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
    </div>
  );
}

function TipCheckIcon() {
  return (
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-accent text-white sm:h-[1.375rem] sm:w-[1.375rem]">
      <svg aria-hidden viewBox="0 0 12 10" className="h-2.5 w-3" fill="none">
        <path
          d="M1 5.2L4.2 8.4L11 1.6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export default function UploadInstructionStep() {
  return (
    <div>
      <StepHeader
        title="How to take your photos"
        subtitle="Upload clear photos for an accurate skin assessment."
        subtitleClassName="mt-2 text-sm leading-relaxed text-brand-ink sm:mt-2.5 sm:text-[0.9375rem]"
      />

      <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-7 sm:gap-4">
        <PhotoExample
          src={wrongPhoto}
          alt="Example of an incorrect skin photo with mirror selfie"
          badge="wrong"
        />
        <PhotoExample
          src={correctPhoto}
          alt="Example of a correct skin photo with natural light"
          badge="correct"
        />
      </div>

      <h2 className="mt-7 text-xl font-normal text-brand-ink sm:mt-8 sm:text-[1.375rem]">
        Upload instruction
      </h2>

      <ul className="mt-4 space-y-3.5 sm:mt-5 sm:space-y-4">
        {photoTips.map((tip) => (
          <li key={tip.lead} className="flex items-start gap-3">
            <TipCheckIcon />
            <p className="text-sm leading-relaxed text-brand-ink sm:text-[0.9375rem]">
              <span className="font-medium">{tip.lead}</span>
              <span className="font-light text-brand-gray">{tip.rest}</span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
