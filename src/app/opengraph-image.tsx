import { ImageResponse } from "next/og";
import { getSiteContent } from "@/lib/data/catalog";

export const alt = "Amros Beauty — Milky Glassy Glow skincare";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const { brand } = await getSiteContent();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "radial-gradient(circle at 75% 30%, #ECD3CB 0%, rgba(236,211,203,0) 45%), radial-gradient(circle at 20% 85%, #E2DDF0 0%, rgba(226,221,240,0) 45%), linear-gradient(180deg, #FFFDF9, #F4EEE6)",
          color: "#2A2421",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 12, textTransform: "uppercase", color: "#93503F" }}>KMG · Korean Magic Glow</div>
        <div style={{ fontSize: 112, marginTop: 24, lineHeight: 1 }}>{brand.name}</div>
        <div style={{ fontSize: 56, marginTop: 24, fontStyle: "italic", color: "#564C46" }}>{brand.tagline}</div>
        <div style={{ display: "flex", marginTop: 48, width: 72, height: 72, borderRadius: 72, background: "#F3BD52" }} />
      </div>
    ),
    size,
  );
}
