import * as React from "react";

export type BrandLogoName =
  | "gmail"
  | "google-calendar"
  | "hubspot"
  | "salesforce"
  | "slack"
  | "linkedin"
  | "whatsapp";

type BrandLogoProps = {
  brand: BrandLogoName;
  className?: string;
  title?: string;
};

/**
 * Brand-accurate inline SVG marks in the Simple Icons style.
 * Self-contained (no external refs). Consumer controls sizing/background
 * via className on the wrapping <svg>.
 */
export function BrandLogo({ brand, className, title }: BrandLogoProps) {
  const common = {
    className,
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    role: "img" as const,
    "aria-label": title ?? BRAND_LABEL[brand],
  };

  switch (brand) {
    case "gmail":
      // Envelope with the four canonical Gmail brand colors
      return (
        <svg {...common}>
          <title>{title ?? "Gmail"}</title>
          <path
            d="M1.5 5.457A2.457 2.457 0 0 1 3.957 3H4.5v13.5A1.5 1.5 0 0 1 3 18H1.5V5.457Z"
            fill="#4285F4"
          />
          <path
            d="M22.5 5.457A2.457 2.457 0 0 0 20.043 3H19.5v13.5a1.5 1.5 0 0 0 1.5 1.5h1.5V5.457Z"
            fill="#34A853"
          />
          <path d="M4.5 3 12 8.727 19.5 3v6L12 14.727 4.5 9V3Z" fill="#EA4335" />
          <path d="M4.5 9 12 14.727 19.5 9V18H4.5V9Z" fill="#FBBC04" />
          <path d="M4.5 3v6L12 14.727 19.5 9V3L12 8.727 4.5 3Z" fill="#C5221F" opacity="0.1" />
        </svg>
      );

    case "google-calendar":
      // White page with Google-blue "31" and a colored corner accent
      return (
        <svg {...common}>
          <title>{title ?? "Google Calendar"}</title>
          <rect x="3" y="3" width="18" height="18" rx="2" fill="#FFFFFF" />
          <path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3H3V5Z" fill="#4285F4" />
          <path d="M3 16h18v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3Z" fill="#EA4335" opacity="0.9" />
          <path d="M17 3h2a2 2 0 0 1 2 2v3h-4V3Z" fill="#FBBC04" />
          <path d="M3 8h4V3H5a2 2 0 0 0-2 2v3Z" fill="#34A853" />
          <rect x="3" y="8" width="18" height="8" fill="#FFFFFF" />
          <text
            x="12"
            y="15.4"
            textAnchor="middle"
            fontFamily="Arial, Helvetica, sans-serif"
            fontWeight="700"
            fontSize="6.5"
            fill="#4285F4"
          >
            31
          </text>
        </svg>
      );

    case "hubspot":
      // HubSpot sprocket — center circle with three orbiting nodes
      return (
        <svg {...common}>
          <title>{title ?? "HubSpot"}</title>
          <g fill="#FF7A59">
            <path d="M18.164 8.13V5.816a1.79 1.79 0 1 0-1.055 0V8.13a5.075 5.075 0 0 0-2.41.996L8.34 4.086a2.02 2.02 0 1 0-.62.91l6.253 4.866a5.079 5.079 0 0 0 .077 5.729l-1.902 1.902a1.635 1.635 0 1 0 .746.746l1.88-1.88a5.083 5.083 0 1 0 3.39-8.229Zm-.527 7.63a2.61 2.61 0 1 1 0-5.219 2.61 2.61 0 0 1 0 5.219Z" />
          </g>
        </svg>
      );

    case "salesforce":
      // Salesforce cloud silhouette
      return (
        <svg {...common}>
          <title>{title ?? "Salesforce"}</title>
          <path
            fill="#00A1E0"
            d="M10.006 4.196a4.15 4.15 0 0 1 3.003-1.29c1.514 0 2.836.845 3.542 2.098a5.083 5.083 0 0 1 2.076-.443 5.148 5.148 0 0 1 5.15 5.148 5.15 5.15 0 0 1-1.037 3.107 4.685 4.685 0 0 1 .966 2.856 4.72 4.72 0 0 1-4.71 4.72 4.66 4.66 0 0 1-2.052-.471 5.152 5.152 0 0 1-4.482 2.6 5.113 5.113 0 0 1-2.36-.573 4.183 4.183 0 0 1-3.848 2.554 4.187 4.187 0 0 1-4.098-3.334 3.923 3.923 0 0 1-.812.086A4 4 0 0 1 .8 14.762a4.008 4.008 0 0 1 1.985-3.464 4.598 4.598 0 0 1-.383-1.842 4.616 4.616 0 0 1 4.616-4.62c1.174 0 2.223.44 3.03 1.166l-.042.194Z"
          />
        </svg>
      );

    case "slack":
      // Slack 4-color hash mark
      return (
        <svg {...common}>
          <title>{title ?? "Slack"}</title>
          <g>
            <path
              fill="#E01E5A"
              d="M5.042 15.165a2.522 2.522 0 0 1-2.52 2.523A2.522 2.522 0 0 1 0 15.165a2.52 2.52 0 0 1 2.522-2.52h2.52v2.52Zm1.271 0a2.52 2.52 0 0 1 2.52-2.52 2.522 2.522 0 0 1 2.523 2.52v6.313A2.522 2.522 0 0 1 8.833 24a2.522 2.522 0 0 1-2.52-2.522v-6.313Z"
            />
            <path
              fill="#36C5F0"
              d="M8.833 5.042a2.522 2.522 0 0 1-2.52-2.52A2.522 2.522 0 0 1 8.833 0a2.522 2.522 0 0 1 2.523 2.522v2.52H8.833Zm0 1.271a2.52 2.52 0 0 1 2.523 2.52 2.522 2.522 0 0 1-2.523 2.523H2.522A2.522 2.522 0 0 1 0 8.833a2.52 2.52 0 0 1 2.522-2.52h6.311Z"
            />
            <path
              fill="#2EB67D"
              d="M18.956 8.833a2.52 2.52 0 0 1 2.522-2.52A2.522 2.522 0 0 1 24 8.833a2.522 2.522 0 0 1-2.522 2.523h-2.522v-2.523Zm-1.272 0a2.522 2.522 0 0 1-2.522 2.523 2.522 2.522 0 0 1-2.52-2.523V2.522A2.522 2.522 0 0 1 15.162 0a2.522 2.522 0 0 1 2.522 2.522v6.311Z"
            />
            <path
              fill="#ECB22E"
              d="M15.162 18.956a2.522 2.522 0 0 1 2.522 2.522A2.522 2.522 0 0 1 15.162 24a2.522 2.522 0 0 1-2.52-2.522v-2.522h2.52Zm0-1.272a2.522 2.522 0 0 1-2.52-2.522 2.522 2.522 0 0 1 2.52-2.52h6.316A2.522 2.522 0 0 1 24 15.162a2.522 2.522 0 0 1-2.522 2.522h-6.316Z"
            />
          </g>
        </svg>
      );

    case "linkedin":
      // LinkedIn "in" mark on brand blue rounded square
      return (
        <svg {...common}>
          <title>{title ?? "LinkedIn"}</title>
          <rect width="24" height="24" rx="4" fill="#0A66C2" />
          <path
            fill="#FFFFFF"
            d="M7.06 9.5H4.24V19H7.06V9.5ZM5.65 5.2A1.63 1.63 0 1 0 5.65 8.46 1.63 1.63 0 0 0 5.65 5.2ZM19.76 13.61c0-2.47-1.32-3.63-3.08-3.63a2.66 2.66 0 0 0-2.42 1.33h-.04V9.5H11.5V19h2.82v-4.7c0-1.24.24-2.44 1.78-2.44s1.55 1.42 1.55 2.52V19h2.82v-5.39Z"
          />
        </svg>
      );

    case "whatsapp":
      // WhatsApp green speech bubble with phone glyph
      return (
        <svg {...common}>
          <title>{title ?? "WhatsApp"}</title>
          <path
            fill="#25D366"
            d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.76.46 3.46 1.34 4.97L2 22l5.25-1.38a9.86 9.86 0 0 0 4.78 1.22h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Zm0 18.13h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.03-.2-.31a8.2 8.2 0 0 1-1.26-4.37c0-4.54 3.7-8.23 8.24-8.23a8.19 8.19 0 0 1 5.83 2.41 8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.21-8.25 8.21Z"
          />
          <path
            fill="#FFFFFF"
            d="M16.56 14.24c-.25-.12-1.47-.72-1.7-.8-.23-.09-.4-.13-.56.13-.17.25-.65.8-.79.97-.15.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23a7.5 7.5 0 0 1-1.39-1.72c-.14-.25-.02-.38.11-.5.11-.11.25-.29.38-.44.13-.15.16-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.42-.14-.01-.31-.01-.48-.01a.92.92 0 0 0-.67.31c-.23.25-.87.85-.87 2.08 0 1.22.89 2.4 1.02 2.57.12.17 1.75 2.67 4.23 3.74.59.25 1.05.4 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.23-.17-.48-.29Z"
          />
        </svg>
      );

    default:
      return null;
  }
}

const BRAND_LABEL: Record<BrandLogoName, string> = {
  gmail: "Gmail",
  "google-calendar": "Google Calendar",
  hubspot: "HubSpot",
  salesforce: "Salesforce",
  slack: "Slack",
  linkedin: "LinkedIn",
  whatsapp: "WhatsApp",
};

export default BrandLogo;
