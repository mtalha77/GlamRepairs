import Image from "next/image";

const dayPhotos = [
  {
    label: "Day 0",
    src: "/images/onboarding-intro-1.webp",
    alt: "Skin at day zero",
    width: 155,
    height: 190,
    className: "z-10 -mr-5 sm:-mr-6",
  },
  {
    label: "Day 30",
    src: "/images/onboarding-intro-2.webp",
    alt: "Skin at day thirty",
    width: 163,
    height: 195,
    className: "z-20",
  },
] as const;

export default function ProgramIntroHero() {
  return (
    <div className="relative mx-auto flex h-[11rem] w-full max-w-[18rem] items-end justify-center sm:h-[12rem] sm:max-w-[19rem]">
      {dayPhotos.map((photo) => (
        <div
          key={photo.label}
          className={`relative w-[5.75rem] shrink-0 sm:w-[6.25rem] ${photo.className}`}
        >
          <Image
            src={photo.src}
            alt={photo.alt}
            width={photo.width}
            height={photo.height}
            className="h-auto w-full"
            priority
          />
          <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-medium text-brand-gray sm:text-[10px]">
            {photo.label}
          </span>
        </div>
      ))}
    </div>
  );
}
