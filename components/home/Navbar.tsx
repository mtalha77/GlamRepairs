"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo, {
  NAVBAR_LOGO_CLASS,
  NAVBAR_LOGO_COLOR_CLASS,
} from "@/components/home/Logo";

export const onboardingHref = "/onboarding/step/1";

const navPillBase =
  "inline-flex h-[39px] items-center justify-center whitespace-nowrap rounded-[50px] font-sans uppercase leading-none transition-colors";

/**
 * The pill row and the Get Started pill are sized separately.
 *
 * Handover 65 §1: the logo used to be absolutely centred, so it reserved no
 * space and any extra link ran underneath it. It now sits in its own track
 * on the left (logo | links | Get Started), so the row can only ever push,
 * never overlap. Budget at 1280px with today's five links: logo ~120px,
 * links ~673px, Get Started ~155px, against 1180px of row; a sixth label of
 * average length still fits. Below xl the smaller type keeps it inside 924px.
 */
const navLinkPill = `${navPillBase} px-[14px] text-[13px] xl:px-[20px] xl:text-[16px]`;
const navCtaPill = `${navPillBase} px-[25px] text-[16px]`;

export type NavLink = {
  label: string;
  href: string;
  /**
   * Shown in the desktop pill row, where horizontal space is the binding
   * constraint (see navLinkPill). Falls back to `label`. The full label is
   * always used in the mobile menu, which has the width for it.
   */
  shortLabel?: string;
};

export const navLinks: NavLink[] = [
  { label: "About", href: "/about" },
  // Talha, 30 October 2026: the practitioners, beside About.
  { label: "Practitioners", href: "/practitioners" },
  /**
   * HANDOVER-22 §3 — between About and Pricing on purpose. A visitor who has
   * just read who we are and is about to see a price is exactly the person
   * who needs to know what the price buys, and the sample answers that
   * better than the pricing page can.
   */
  {
    label: "See a real assessment",
    href: "/sample-assessment",
    shortLabel: "Sample",
  },
  { label: "Pricing", href: "/compare" },
  { label: "Contact", href: "/contact" },
];

type NavbarProps = {
  className?: string;
  theme?: "dark" | "light";
};

export default function Navbar({ className = "", theme = "dark" }: NavbarProps) {
  const isLight = theme === "light";
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  /*
   * Closes the menu on navigation. This became load-bearing in HOTFIX-25
   * §1.1: the Navbar used to be rendered inside each page, so moving from
   * /about to /pricing unmounted and remounted it and `menuOpen` reset to
   * false for free. It now lives in the shared (site) layout and persists
   * across every public navigation, so this effect is the only thing that
   * closes the panel — including on browser back/forward, which no onClick
   * handler sees. Do not delete it to satisfy react-hooks/set-state-in-effect
   * (which already flagged it before this change); the menu would stay open
   * over the next page.
   */
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const isLinkActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const linkPillClass = (active: boolean) => {
    if (isLight) {
      return `${navLinkPill} ${
        active
          ? "bg-[#ead7ff] text-brand-primary"
          : "bg-transparent text-brand-primary/80 hover:text-brand-primary"
      }`;
    }

    return `${navLinkPill} text-white ${
      active
        ? "bg-white/5"
        : "bg-transparent opacity-80 hover:opacity-100"
    }`;
  };

  const getStartedClass = isLight
    ? `${navCtaPill} bg-[#ead7ff] text-brand-primary hover:bg-[#e0c8f5]`
    : `${navCtaPill} bg-[rgba(234,215,255,0.5)] text-white hover:bg-[rgba(234,215,255,0.7)]`;

  const logoVariant = isLight ? "color" : "white";
  const logoClass = isLight ? NAVBAR_LOGO_COLOR_CLASS : NAVBAR_LOGO_CLASS;

  /*
   * The mobile menu needed a light variant — HOTFIX-25 §1.1.
   *
   * It only ever had the dark one: a `bg-black/40` panel with white links.
   * On a dark photograph that reads correctly, which is why it went
   * unnoticed — /pricing was the only light-theme page that had a header at
   * all, and nobody opened its burger. Moving the header onto every public
   * route would have shipped that panel to eleven light pages, where
   * `black/40` over white composites to roughly #999 and puts white text at
   * about 2.9:1 — below the 4.5:1 minimum, on the primary navigation, on
   * mobile, which is the majority of this site's traffic.
   *
   * The light palette here is the desktop light palette, unchanged:
   * #ead7ff / brand-primary for the active and CTA pills, #f3ecfb on hover.
   *
   * ⚠️ The DARK variant is deliberately left exactly as it was, including
   * its CTA — `rgba(234,215,255,0.5)` behind white text is low contrast
   * there too, but it is the homepage's existing look over a photograph
   * whose luminance varies per breakpoint. Changing it is a design decision
   * for Talha, not a side effect of moving the header. Flagged, not touched.
   */
  const menuPanelClass = isLight
    ? "border-brand-lavender/60 bg-white/95 shadow-brand-lg"
    : "border-white/20 bg-black/40";

  const menuLinkBase =
    "rounded-full px-4 py-2 text-center font-sans text-[15px] uppercase leading-none transition-colors";

  const menuCtaClass = isLight
    ? "bg-[#ead7ff] text-brand-primary hover:bg-[#e0c8f5]"
    : "bg-[rgba(234,215,255,0.5)] text-white hover:bg-[rgba(234,215,255,0.7)]";

  return (
    /*
     * A <header>, not a <nav> — HOTFIX-25 §1.1.
     *
     * This element is the site's banner landmark, and it did not exist
     * before: the whole site had a `navigation` landmark and no `banner`
     * one. That had a second, measurable consequence — with no <header>
     * anywhere in the page, an SEO crawl looking for the site header on
     * /sample-assessment found the only <header> present (the sample
     * report card's own) and reported a header with zero links and zero
     * images. The banner now exists on every public route, so that class
     * of false positive is gone as well.
     *
     * The link rows inside are the <nav>s. There are two, desktop and
     * mobile, and they are never both exposed: the desktop row is
     * `hidden lg:flex` (display:none, so out of the a11y tree below lg)
     * and the mobile menu only renders when open and is `lg:hidden`.
     * They still get distinct labels so a landmark list is never
     * ambiguous.
     */
    <header
      className={`absolute inset-x-0 top-0 z-30 h-[4.5rem] md:h-20 xl:h-24 ${className}`.trim()}
    >
      {/*
        Handover 65 §1.2: over a photograph the white links depended on
        whatever part of the image happened to sit behind them. A soft scrim
        gives them a floor without boxing the header in. Dark theme only;
        the light header already sits on white.
      */}
      {isLight ? null : (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[150%] bg-gradient-to-b from-black/45 via-black/20 to-transparent"
        />
      )}
      <nav
        aria-label="Main"
        className="mx-auto hidden h-full max-w-[1440px] items-center gap-6 px-[50px] lg:flex"
      >
        <Link href="/" aria-label="Glam Repairs home" className="shrink-0">
          <Logo className={logoClass} variant={logoVariant} />
        </Link>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-[8px] xl:gap-[15px]">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={linkPillClass(isLinkActive(link.href))}
            >
              {link.shortLabel ?? link.label}
            </Link>
          ))}
        </div>

        <Link href={onboardingHref} className={`${getStartedClass} shrink-0`}>
          Get Started
        </Link>
      </nav>

      <div className="flex h-full items-center justify-between px-5 sm:px-8 lg:hidden">
        <Link href="/" aria-label="Glam Repairs home" className="inline-flex min-h-11 items-center">
          <Logo className={logoClass} variant={logoVariant} />
        </Link>

        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          className={`flex min-h-11 min-w-11 items-center justify-center p-2 ${
            isLight ? "text-brand-primary" : "text-white"
          }`}
        >
          <span
            className={`burger-toggle ${menuOpen ? "is-open" : ""}`}
            aria-hidden
          >
            <span className="burger-bar burger-bar--top" />
            <span className="burger-bar burger-bar--middle" />
            <span className="burger-bar burger-bar--bottom" />
          </span>
        </button>
      </div>

      {menuOpen ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={closeMenu}
            className="fixed inset-0 z-20 bg-black/20 lg:hidden"
          />
          <nav
            aria-label="Main (mobile)"
            className={`absolute right-5 top-full z-30 mt-2 flex w-[210px] flex-col gap-2 rounded-2xl border p-4 backdrop-blur-md sm:right-8 lg:hidden ${menuPanelClass}`}
          >
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={closeMenu}
                className={`${menuLinkBase} ${
                  isLight
                    ? `text-brand-primary hover:bg-[#f3ecfb] ${
                        isLinkActive(link.href) ? "bg-[#ead7ff]" : ""
                      }`
                    : `text-white hover:bg-white/10 ${
                        isLinkActive(link.href) ? "bg-white/10" : ""
                      }`
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={onboardingHref}
              onClick={closeMenu}
              className={`${menuLinkBase} ${menuCtaClass}`}
            >
              Get Started
            </Link>
          </nav>
        </>
      ) : null}
    </header>
  );
}
