import { ImageResponse } from "next/og";

import { getPublicPractitioner } from "@/lib/practitioners/directory";

/**
 * The share card for a practitioner's profile (Handover 67 §6.5): their
 * photograph, name, role and country. A page carrying a person's name
 * should not share as a grey link. Colours are inline because ImageResponse
 * cannot read the stylesheet, as in app/join/opengraph-image.tsx.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A Glam Repairs practitioner";

/** Fetched first and embedded, so a missing photo drops out rather than failing the image. */
async function photoDataUrl(url: string | null): Promise<string | null> {
  if (!url || !/^https:\/\//.test(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/jpeg";
    if (!/^image\/(jpeg|png|webp)/.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 4_000_000) return null;
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function PractitionerOpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await getPublicPractitioner(slug, null);
  const p = found?.card;
  const photo = await photoDataUrl(p?.photo ?? null);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: "64px 72px",
          backgroundColor: "#662d91",
          backgroundImage: "radial-gradient(circle at 85% 15%, #7c3fa8 0%, #662d91 60%)",
          color: "#ffffff",
        }}
      >
        {photo ? (
          <img
            src={photo}
            alt=""
            width={360}
            height={440}
            style={{ width: 360, height: 440, objectFit: "cover", borderRadius: 28, marginRight: 64 }}
          />
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", fontSize: 26, color: "#e7d9f5", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Glam Repairs · Practitioner
          </div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 64, fontWeight: 700, lineHeight: 1.08, letterSpacing: "-0.02em" }}>
            {p?.name ?? "Glam Repairs"}
          </div>
          <div style={{ display: "flex", marginTop: 20, fontSize: 34, color: "#fff3da" }}>
            {p ? `${p.role}${p.countryName ? `, ${p.countryName}` : ""}` : "Online skin assessment"}
          </div>
          {p?.focus.length ? (
            <div style={{ display: "flex", marginTop: 28, fontSize: 26, color: "#e7d9f5" }}>Reads most often: {p.focus.join(", ")}</div>
          ) : null}
          <div style={{ display: "flex", marginTop: 40, fontSize: 24, color: "#e7d9f5" }}>glamrepairs.com/practitioners</div>
        </div>
      </div>
    ),
    size,
  );
}
