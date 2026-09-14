import { ImageResponse } from "next/og";

import { getPublishedPost } from "@/lib/studio/blog";
import { AUTHORS } from "@/lib/seo/authors";
import { SITE } from "@/lib/seo/site";

/**
 * HANDOVER-23 §1.1 — a per-post share image, generated rather than stored.
 *
 * ── The problem ──────────────────────────────────────────────────────────
 * Not one published post has a `hero_image_url`, so every post shared on
 * WhatsApp — the main sharing channel here — fell back to the site-wide
 * brand card. Four different articles produced four identical previews,
 * which is not much better than none: a reader who has already seen the
 * card learns nothing from seeing it again.
 *
 * ── Why generated and not a stored file ──────────────────────────────────
 * §1.1 says "even a simple typographic treatment using the brand palette
 * beats nothing". A generated image beats a stored one here for three
 * reasons: it needs no design work per post, it cannot go stale when a
 * title is edited in the studio, and a new post gets one the moment it
 * publishes without anyone remembering to make it. `hero_image_url` still
 * wins when it is set — see page.tsx — so a real photograph can replace
 * this per post at any time without touching this file.
 *
 * Deliberately typographic, not decorative: at WhatsApp preview size the
 * only thing that survives is the headline, so the headline is the image.
 */

export const alt = "Article preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function BlogOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);

  const title = post?.title ?? SITE.name;
  const author = post ? AUTHORS[post.authorSlug] : undefined;
  const cluster = post?.cluster;

  /* Long titles need a smaller face or they wrap to five lines and the
     descenders clip against the footer rule. Three bands rather than a
     continuous scale, because a continuous one makes similar titles render
     at visibly different sizes for no reason a reader can see. */
  const titleSize = title.length > 78 ? 54 : title.length > 46 ? 64 : 76;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          backgroundColor: "#fff9e5",
          backgroundImage:
            "radial-gradient(circle at 78% -12%, #f6edff 0%, #fff9e5 58%)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          {cluster ? (
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                backgroundColor: "#f0e6fb",
                color: "#662d91",
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                padding: "10px 22px",
                borderRadius: 999,
                marginBottom: 34,
              }}
            >
              {cluster}
            </div>
          ) : null}

          <div
            style={{
              fontSize: titleSize,
              fontWeight: 600,
              color: "#2b2b2b",
              fontFamily: "serif",
              lineHeight: 1.16,
              letterSpacing: "-0.02em",
              maxWidth: 980,
            }}
          >
            {title}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "2px solid #d6cdea",
            paddingTop: 30,
          }}
        >
          <div
            style={{
              fontSize: 30,
              fontStyle: "italic",
              fontFamily: "serif",
              color: "#662d91",
              letterSpacing: "0.02em",
            }}
          >
            {SITE.name}
          </div>
          {author ? (
            /*
              One text child, not three.

              Satori (what `next/og` renders with) throws
              "Expected <div> to have explicit display: flex ... if it has
              more than one child node" — and `{author.name} · {author.title}`
              is three child nodes, not one string. That 500'd this route on
              production while every local check passed, because the route
              cannot render locally at all without a reachable database.

              A template literal collapses it to a single child. `display:
              flex` would also satisfy Satori, but the single string is the
              honest shape: this is one line of text, not a layout.
            */
            <div style={{ fontSize: 26, color: "#4a4a4a" }}>
              {`${author.name} · ${author.title}`}
            </div>
          ) : null}
        </div>
      </div>
    ),
    { ...size },
  );
}
