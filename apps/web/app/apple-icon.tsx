import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F3EEFF",
          borderRadius: 36,
          border: "8px solid #6C47FF",
          position: "relative",
        }}
      >
        {/* Screen face */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 122,
            height: 108,
            borderRadius: 24,
            background: "linear-gradient(180deg, #A855F7 0%, #6C47FF 100%)",
          }}
        >
          {/* Left eye */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: "#2D1B69",
              }}
            />
          </div>
          {/* Right eye */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: "#2D1B69",
              }}
            />
          </div>
        </div>
        {/* Antenna dot */}
        <div
          style={{
            position: "absolute",
            top: 4,
            left: 82,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#EC4899",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
