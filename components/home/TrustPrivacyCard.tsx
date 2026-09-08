import Image from "next/image";

type TrustPrivacyCardProps = {
  title: string;
  description: string;
  icon?: string;
};

export default function TrustPrivacyCard({
  title,
  description,
  icon,
}: TrustPrivacyCardProps) {
  return (
    <article className="gr-card-lift relative flex w-full min-h-[18rem] flex-col items-center overflow-visible rounded-2xl bg-brand-cream-card px-5 py-6 pb-16 text-center shadow-sm sm:min-h-[22rem] sm:w-[20rem] sm:px-6 sm:py-7 sm:pb-24 lg:min-h-[24rem] lg:w-[20.5rem]">
      <h3 className="font-serif italic leading-tight text-brand-primary text-2xl sm:text-[1.75rem] lg:text-[2rem]">
        {title}
      </h3>
      <p className="mt-3 flex-1 font-sans leading-normal text-brand-ink text-sm sm:text-base">
        {description}
      </p>
      {icon ? (
        <div className="pointer-events-none absolute bottom-0 left-1/2 z-10 -translate-x-1/2 translate-y-1/2">
          <Image
            src={icon}
            alt=""
            width={396}
            height={459}
            className="h-[9rem] w-auto sm:h-[12rem]"
          />
        </div>
      ) : null}
    </article>
  );
}
