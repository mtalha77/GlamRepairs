import Footer from "@/components/home/Footer";
import SiteHeader from "@/components/layout/SiteHeader";

/**
 * Shared chrome for every public page — HOTFIX-25 §1.1.
 *
 * ── Why a route group ────────────────────────────────────────────────────
 * `(site)` is a route group, so it changes nothing about any URL:
 * `app/(site)/pricing/page.tsx` still serves `/pricing`. What it buys is a
 * layout boundary that covers the public pages and nothing else. The routes
 * deliberately left OUTSIDE it, at `app/`, are the ones that must NOT get
 * site chrome:
 *
 *   /onboarding/*  the funnel — its own shell, its own progress bar, and a
 *                  nav bar full of exit links is the last thing it needs
 *   /studio/*      the practitioner console, behind auth
 *   /booking, /gift/[code], /p/[token], /preview/*
 *                  single-purpose pages reached by link, not by browsing
 *
 * ── What this replaces ───────────────────────────────────────────────────
 * Before this, the header was rendered inside three hero components and
 * directly on /pricing — four pages out of fifteen. Eleven public pages had
 * no way to reach any other page except the footer, and six had no footer
 * either, so /terms, /privacy and /editorial-policy were dead ends with zero
 * outbound links. Those per-page copies are gone; this is now the only place
 * either element is rendered on a public route.
 *
 * ── The `relative` root ──────────────────────────────────────────────────
 * Load-bearing. `Navbar` is `absolute inset-x-0 top-0`, and on the dark-hero
 * routes `SiteHeader` renders it with no wrapper of its own, so this element
 * is the containing block that puts it at the top of the page. Remove
 * `relative` and the nav positions against the viewport instead, which looks
 * correct until the page scrolls.
 */
export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="relative">
      <SiteHeader />
      {children}
      <Footer />
    </div>
  );
}
