import { ImageResponse } from "next/og";
import { SITE } from "@/lib/seo/site";

/**
 * Site-wide fallback share image.
 *
 * Next's metadata resolution applies this automatically to any route that
 * doesn't set its own `openGraph.images` — which today is every blog post,
 * since none has a `hero_image_url` yet. Without this, sharing a post on
 * WhatsApp (the main sharing channel here) rendered a bare grey link while
 * still claiming a large-image card. This makes a share never imageless;
 * `app/blog/[slug]/page.tsx` separately keeps the *card type* honest
 * (`summary`, not `summary_large_image`) when there's no post-specific hero.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#662d91",
          backgroundImage:
            "radial-gradient(circle at 15% 20%, #7c3fa8 0%, #662d91 55%)",
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "#fff3da",
            fontFamily: "serif",
            fontStyle: "italic",
            letterSpacing: "-0.02em",
          }}
        >
          {SITE.name}
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 32,
            color: "#e7d9f5",
            maxWidth: 860,
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          {SITE.tagline}
        </div>
      </div>
    ),
    { ...size },
  );
}
