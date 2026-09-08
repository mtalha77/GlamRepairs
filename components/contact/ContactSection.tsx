import Image from "next/image";
import Link from "next/link";

import ContactForm from "@/components/contact/ContactForm";
import { contactReachOut } from "@/components/contact/contactContent";
import { SITE } from "@/lib/seo/site";

export default function ContactSection() {
  return (
    <section className="w-full overflow-x-hidden bg-white px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-12 lg:px-10 lg:pb-24 lg:pt-14 xl:px-12">
      <div className="mx-auto w-full max-w-[86rem]">
        <div className="w-full min-w-0 rounded-[10px] bg-[#fefaf2] px-4 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="grid w-full min-w-0 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] lg:items-start lg:gap-12 xl:gap-16">
            <div className="min-w-0 max-w-xl">
              <h2 className="font-serif text-[1.75rem] tracking-normal text-brand-primary sm:text-[2.375rem] lg:text-[2.625rem]">
                {contactReachOut.title}
              </h2>
              <p className="mt-3 max-w-md text-base font-light leading-relaxed text-brand-ink sm:mt-4 sm:text-lg">
                {contactReachOut.description}
              </p>

              <div className="mt-8 flex min-w-0 items-start gap-3 sm:mt-10 sm:items-center sm:gap-4">
                <Image
                  src={contactReachOut.emailIcon}
                  alt=""
                  width={41}
                  height={41}
                  className="mt-0.5 h-9 w-9 shrink-0 object-contain sm:mt-0 sm:h-10 sm:w-10"
                />
                <Link
                  href={contactReachOut.emailHref}
                  className="min-w-0 break-all font-serif text-[1.125rem] italic leading-snug tracking-normal text-brand-ink transition-opacity hover:opacity-80 sm:text-[1.5rem] sm:tracking-[0.04em] lg:text-[2rem] lg:tracking-[0.1em]"
                >
                  {contactReachOut.emailDisplay}
                </Link>
              </div>

              {/* HOTFIX-8 — the phone number, at the same visual weight as
                  the email. Two separate actions rather than one: `tel:`
                  often does nothing on desktop, and in Pakistan a labelled
                  "WhatsApp" link converts better than a bare number because
                  it says which channel we actually answer. Both derive from
                  SITE.phone, the number the Google Business Profile lists. */}
              <div className="mt-6 flex min-w-0 flex-wrap items-center gap-3 sm:mt-7 sm:gap-4">
                <a
                  href={`tel:${SITE.phone.e164}`}
                  className="min-w-0 font-serif text-[1.125rem] italic leading-snug tracking-normal text-brand-ink transition-opacity hover:opacity-80 sm:text-[1.5rem] sm:tracking-[0.04em] lg:text-[2rem] lg:tracking-[0.1em]"
                >
                  {SITE.phone.display}
                </a>
                <a
                  href={`https://wa.me/${SITE.phone.digits}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center rounded-full border border-brand-primary px-4 py-2 font-sans text-sm font-medium text-brand-primary transition-colors hover:bg-brand-primary hover:text-white"
                >
                  WhatsApp
                </a>
              </div>
            </div>

            <div className="min-w-0 w-full rounded-[10px] bg-white px-4 py-6 sm:bg-[#fefaf2] sm:px-8 sm:py-9 lg:px-9 lg:py-10">
              <ContactForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
