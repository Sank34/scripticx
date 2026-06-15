import { ImageResponse } from "next/og";

import { absoluteUrl, siteConfig } from "@/lib/metadata";

export const alt =
  "ScripticX — interactive programming platform powered by MiniScript+";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImageTemplate() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#ffffff",
          color: "#111111",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          padding: "72px",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(34,197,94,0.14), rgba(255,255,255,0) 62%)",
            border: "2px solid #e4e4e7",
            borderRadius: "42px",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            justifyContent: "space-between",
            padding: "64px",
            width: "100%",
          }}
        >
          {/* ImageResponse renders standard image elements instead of next/image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="ScripticX"
            height="82"
            src={absoluteUrl(siteConfig.logo)}
            style={{ objectFit: "contain", objectPosition: "left" }}
            width="406"
          />

          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div
              style={{
                fontSize: "64px",
                fontWeight: 750,
                letterSpacing: "-2px",
                lineHeight: 1.05,
                maxWidth: "900px",
              }}
            >
              Learn programming by understanding how code works.
            </div>
            <div
              style={{
                color: "#52525b",
                fontSize: "29px",
                lineHeight: 1.35,
                maxWidth: "900px",
              }}
            >
              MiniScript+ · step-by-step execution · automatic evaluation · live coding
            </div>
          </div>

          <div
            style={{
              alignItems: "center",
              color: "#166534",
              display: "flex",
              fontSize: "22px",
              fontWeight: 650,
              gap: "12px",
            }}
          >
            <span
              style={{
                background: "#22c55e",
                borderRadius: "999px",
                display: "flex",
                height: "12px",
                width: "12px",
              }}
            />
            platform.scripticx.org
          </div>
        </div>
      </div>
    ),
    size
  );
}
