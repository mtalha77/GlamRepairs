import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

import { BOOKING_START_HREF } from "@/components/booking/bookingConfig";

const CTA_IMAGE = "/images,svgs/cta_ginger_woman.png";
const FOOTER_LOGO = "/svgs/GLAM REPAIR LOGO-08 2 (1).svg";

const contactEmail = "glamrepairs@gmail.com";

const pageLinks = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "Contact Us", href: "/contact" },
  { label: "Pricing", href: "/pricing" },
];

const resourceLinks = [
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Editorial policy", href: "/editorial-policy" },
  { label: "Blog", href: "/blog" },
];

const socialLinks = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/glam.repairs/",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/glamrepairs/",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
      </svg>
    ),
  },
  {
    label: "Facebook",
    href: "https://web.facebook.com/profile.php?id=61590698607527",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.012 4.388 11.004 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
];

function CtaSection() {
  return (
    <section className="relative overflow-hidden px-4 pt-16 sm:px-6 sm:pt-20 lg:pt-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[100%]"
        style={{
          background:
            "radial-gradient(140% 95% at 50% -5%, rgba(255,255,255,1) 0%, rgba(255,255,255,0.9) 30%, rgba(255,255,255,0.55) 55%, rgba(255,255,255,0) 85%)",
        }}
      />
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <h2 className="text-brand-primary">
          <span className="font-serif italic text-[1.625rem] sm:text-[2.4rem] lg:text-[2.8rem]">
            Healthy Skin
          </span>{" "}
          <span className="font-sans tracking-[-0.02em] text-[1.75rem] sm:text-[2.75rem] lg:text-[3.25rem]">
            starts with
          </span>{" "}
          <span className="font-serif italic text-[1.75rem] sm:text-[2.75rem] lg:text-[3.25rem]">
            understanding
          </span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl font-sans tracking-[-0.01em] text-brand-ink text-base sm:mt-5 sm:text-lg lg:text-[1.375rem]">
          Let our skincare specialists create a treatment plan{" "}
          <span className="font-serif italic">tailored</span> to your{" "}
          <span className="font-serif italic">needs.</span>
        </p>
        <Link
          href={BOOKING_START_HREF}
          className="mt-7 inline-block rounded-full bg-brand-cream px-9 py-3.5 font-sans text-sm font-medium uppercase tracking-[0.02em] text-brand-primary transition-colors hover:bg-[#ffe9b8] sm:mt-8 sm:text-[15px]"
        >
          Get My Skin Assessment
        </Link>
      </div>

      <div className="relative z-10 mx-auto -mb-px mt-6 w-full max-w-2xl sm:mt-8">
        <Image
          src={CTA_IMAGE}
          alt="Woman with healthy, radiant skin"
          width={886}
          height={642}
          sizes="(max-width: 1024px) 90vw, 640px"
          className="mx-auto h-auto w-full max-w-[28rem] object-contain sm:max-w-[34rem] lg:max-w-[40rem]"
          style={{
            WebkitMaskImage:
              "linear-gradient(to bottom, black 78%, transparent 100%)",
            maskImage: "linear-gradient(to bottom, black 78%, transparent 100%)",
          }}
          priority={false}
        />
      </div>
    </section>
  );
}

function FooterHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-serif text-base italic text-brand-primary">{children}</h3>
  );
}

function FooterLinkList({
  links,
}: {
  links: { label: string; href: string }[];
}) {
  return (
    <ul className="mt-4 space-y-3">
      {links.map((link) => (
        <li key={link.label}>
          <Link
            href={link.href}
            className="font-sans text-[17px] text-[#242424] transition-colors hover:text-brand-primary"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function Footer() {
  return (
    <footer className="w-full bg-[#f3ecfb]">
      <CtaSection />

      <div className="px-4 pt-12 pb-6 sm:px-8 sm:pt-14 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-md">
              <Image
                src={FOOTER_LOGO}
                alt="Glam Repairs"
                width={121}
                height={45}
                className="h-12 w-auto sm:h-14"
              />
              <p className="mt-4 max-w-full font-sans text-sm leading-relaxed tracking-[0.01em] text-brand-primary/80 sm:max-w-[24rem]">
                Our platform provides access to virtual primary care, virtual
                urgent care, behavioral health counseling, healthcare advocacy,
                specialist messaging, and healthcare discount benefits.
              </p>
            </div>

            <div className="lg:text-left">
              <p className="font-sans text-sm font-medium text-black">
                Connect with us at
              </p>
              <a
                href={`mailto:${contactEmail}`}
                className="mt-1 block font-serif text-[1.75rem] italic tracking-[-0.02em] text-black transition-opacity hover:opacity-80 sm:text-[2.25rem] lg:text-[2.625rem]"
              >
                {contactEmail}
              </a>
              <ul className="mt-4 flex gap-3">
                {socialLinks.map((social) => (
                  <li key={social.label}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.label}
                      className="flex size-10 items-center justify-center rounded-full bg-white text-brand-primary shadow-sm transition-colors hover:bg-brand-primary hover:text-white"
                    >
                      {social.icon}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-8 lg:mt-16">
            <div>
              <FooterHeading>Pages</FooterHeading>
              <FooterLinkList links={pageLinks} />
            </div>
            <div>
              <FooterHeading>Resources</FooterHeading>
              <FooterLinkList links={resourceLinks} />
            </div>
          </div>

          <div className="mt-12 border-t border-brand-primary/15 pt-4 sm:mt-16">
            <div className="flex flex-col gap-2 text-xs text-[#242424] sm:flex-row sm:items-center sm:justify-between">
              <p>© 2026 Glam Repair, LLC. All rights reserved.</p>
              <div className="flex gap-5">
                <Link href="/privacy" className="transition-colors hover:text-brand-primary">
                  Privacy policy
                </Link>
                <Link href="/terms" className="transition-colors hover:text-brand-primary">
                  Terms &amp; Conditions
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
