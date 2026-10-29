import { ImageResponse } from "next/og";

/**
 * The share card for /join — HANDOVER-54 §2.3. Shared on WhatsApp, the page
 * used to preview as the client pitch ("Online skin assessment, read by a
 * certified practitioner"); this is the recruitment pitch.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "GlamRepairs for practitioners: paid per 15 minute consultation, from home";

export default function JoinOpengraphImage() {
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
          backgroundColor: "#662d91",
          backgroundImage: "radial-gradient(circle at 85% 15%, #7c3fa8 0%, #662d91 60%)",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, color: "#e7d9f5", letterSpacing: "0.12em", textTransform: "uppercase" }}>
          GlamRepairs · For practitioners
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 700, lineHeight: 1.08, letterSpacing: "-0.02em", maxWidth: 980 }}>
            Use your qualification from home, in the evening.
          </div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 36, color: "#fff3da" }}>
            Paid for every 15 minute consultation. Monthly. Your own hours.
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#e7d9f5" }}>glamrepairs.com/join</div>
      </div>
    ),
    { ...size },
  );
}
