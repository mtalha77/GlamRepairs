import Image from "next/image";

/**
 * Navbar logo heights: mobile → sm → md (iPad) → lg (desktop) → xl.
 *
 * Handover 65 §3.1: both logos used to be SVGs wrapping a 4096x4096 PNG
 * (674KB and 556KB), and the white one only filled ~58% of its own box, so
 * the two variants needed different height classes to look the same size.
 * They are now raster files cropped to the artwork (under 10KB each), so one
 * class gives both variants the same visible height as before.
 */
export const NAVBAR_LOGO_CLASS = "h-7 sm:h-8 md:h-[37px] lg:h-[42px] xl:h-[49px]";

/** Kept as an alias: the two variants no longer need different boxes. */
export const NAVBAR_LOGO_COLOR_CLASS = NAVBAR_LOGO_CLASS;

type LogoProps = {
  className?: string;
  variant?: "white" | "color";
};

/** Rendered at 112px tall: 2x the largest place either is shown. */
export const LOGO_ASSET = {
  white: { src: "/images/brand/logo-white.webp", width: 274, height: 112 },
  color: { src: "/images/brand/logo-color.webp", width: 307, height: 112 },
} as const;

export default function Logo({ className = "", variant = "white" }: LogoProps) {
  const asset = LOGO_ASSET[variant];
  return (
    <Image
      src={asset.src}
      alt="Glam Repairs"
      width={asset.width}
      height={asset.height}
      priority
      // Already the right size and format; the optimizer would only add a hop.
      unoptimized
      className={`w-auto ${className}`.trim()}
    />
  );
}
