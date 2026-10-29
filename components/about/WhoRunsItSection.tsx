import Image from "next/image";

import AnimatedSlideIn from "@/components/home/AnimatedSlideIn";
import { PAYMENT } from "@/lib/seo/site";

/**
 * "Who runs Glam Repairs". Talha, 29 October 2026, with his own photograph.
 *
 * The bank account clients pay into is in his name (PAYMENT.ownerDisclosure),
 * so putting a face and a role to that name on the About page answers the
 * question before it is asked at the payment step. The wording keeps the
 * division of work exact: he runs the business; he does not read
 * photographs or write assessments, which is the practitioner's work.
 */
export default function WhoRunsItSection() {
  return (
    <section className="bg-brand-cream-card px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto grid max-w-4xl items-center gap-8 sm:grid-cols-[220px_1fr] sm:gap-12">
        <AnimatedSlideIn direction="up">
          <Image
            src="/images/team/muhammad-talha.webp"
            alt="Muhammad Talha"
            width={440}
            height={440}
            sizes="(max-width: 640px) 60vw, 220px"
            className="mx-auto aspect-square w-[60vw] max-w-[220px] rounded-[28px] object-cover sm:w-full"
          />
        </AnimatedSlideIn>
        <AnimatedSlideIn direction="up" delay={120}>
          <div className="text-center sm:text-left">
            <h2 className="text-brand-primary">
              <span className="font-sans text-[1.75rem] tracking-[-0.48px] sm:text-[2.25rem]">Who runs</span>{" "}
              <span className="font-serif italic text-[1.75rem] sm:text-[2.25rem]">Glam Repairs</span>
            </h2>
            <p className="mt-4 font-sans text-base leading-relaxed text-brand-ink sm:text-lg">
              <span className="font-serif italic">{PAYMENT.accountTitle}</span> runs Glam Repairs alongside Ayma Arif. He looks
              after the business: payments, the platform, and the practitioners who join it.
            </p>
            <p className="mt-3 font-sans text-base leading-relaxed text-brand-gray sm:text-lg">
              He does not read photographs or write assessments. That is the practitioner&apos;s work, and it stays with them.
              If you pay by bank transfer, his is the name you will see on the account.
            </p>
          </div>
        </AnimatedSlideIn>
      </div>
    </section>
  );
}
