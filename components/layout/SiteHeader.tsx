"use client";

import { usePathname } from "next/navigation";

import Navbar from "@/components/home/Navbar";

/**
 * The site header, mounted once for every route in the `(site)` group.
 *
 * ── Why this needs a client component at all ─────────────────────────────
 * `Navbar` is `absolute inset-x-0 top-0` and transparent. That is not a
 * detail: on the three pages that open with a full-bleed dark photograph the
 * nav is MEANT to sit on top of the image, in white, reserving no space. On
 * every other page there is no photograph to sit on, so the same nav has to
 * render in the purple palette AND push the page down by its own height, or
 * it lands on top of the first heading.
 *
 * Those two behaviours cannot be chosen in a server layout, because a layout
 * does not know which child route rendered. So the decision is made here from
 * `usePathname()`, which is also what `Navbar` itself already uses for its
 * active-link state — this adds no new client boundary.
 *
 * ── The spacer ───────────────────────────────────────────────────────────
 * `h-[4.5rem] md:h-20 xl:h-24` is not a guess: it mirrors the nav's own
 * height classes exactly. If the nav's height changes, both have to change.
 * This is the pattern /pricing was already using inline before this layout
 * existed; it has just moved here so the other eleven routes get it too.
 */

/**
 * Routes whose first element is a dark full-bleed hero image, where the nav
 * overlays the photograph instead of sitting above it.
 *
 * Matched exactly, not by prefix. `/about` is a dark hero; a hypothetical
 * `/about/team` would not be, and should opt in explicitly rather than
 * inherit the transparent treatment and lose its own top spacing.
 */
const DARK_HERO_ROUTES = new Set(["/", "/about", "/contact"]);

export default function SiteHeader() {
  const pathname = usePathname();

  if (DARK_HERO_ROUTES.has(pathname)) {
    // No wrapper and no spacer. The nav positions against the layout's
    // `relative` root, which starts at the top of the page — the same place
    // the hero starts — so the overlay is pixel-identical to the old
    // per-hero `<Navbar />` it replaces.
    return <Navbar />;
  }

  return (
    <div className="relative z-30 bg-white">
      <Navbar theme="light" />
      <div className="h-[4.5rem] md:h-20 xl:h-24" aria-hidden />
    </div>
  );
}
