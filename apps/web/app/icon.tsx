import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 14,
          border: "3px solid #6C47FF",
          position: "relative",
        }}
      >
        {/* Screen face */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 40,
            borderRadius: 10,
            background: "linear-gradient(180deg, #A855F7 0%, #6C47FF 100%)",
            position: "relative",
          }}
        >
          {/* Left eye */}
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 4,
            }}
          >
            <div
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "#2D1B69",
              }}
            />
          </div>
          {/* Right eye */}
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 5,
                height: 5,
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
            top: -4,
            left: 26,
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#EC4899",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
