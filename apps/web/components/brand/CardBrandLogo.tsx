import * as React from "react";

export type CardBrand = "VISA" | "MC" | "AMEX" | "DISCOVER" | "RUPAY";

type CardBrandLogoProps = {
  brand: CardBrand;
  className?: string;
  title?: string;
};

const BRAND_LABEL: Record<CardBrand, string> = {
  VISA: "Visa",
  MC: "Mastercard",
  AMEX: "American Express",
  DISCOVER: "Discover",
  RUPAY: "RuPay",
};

/**
 * Brand-accurate inline SVG marks for the major card networks accepted at
 * checkout. Rendered fully inline (no external images) so they work under
 * our strict CSP and never trigger a network request.
 *
 * These are simplified, Simple-Icons–style approximations of each network's
 * public mark — recognizable at a glance without reproducing the exact
 * trademarked artwork. Consumer controls outer sizing / spacing via
 * className; the intrinsic viewBox is 40x24 (standard card-chip aspect).
 */
export function CardBrandLogo({ brand, className, title }: CardBrandLogoProps) {
  const common = {
    className,
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 40 24",
    role: "img" as const,
    "aria-label": title ?? BRAND_LABEL[brand],
  };

  switch (brand) {
    case "VISA":
      return (
        <svg {...common}>
          <title>{title ?? BRAND_LABEL.VISA}</title>
          <rect width="40" height="24" rx="3" fill="#1A1F71" />
          <text
            x="20"
            y="17"
            textAnchor="middle"
            fontFamily="Helvetica, Arial, sans-serif"
            fontSize="11"
            fontWeight="900"
            fontStyle="italic"
            fill="#FFFFFF"
            letterSpacing="0.6"
          >
            VISA
          </text>
        </svg>
      );

    case "MC":
      return (
        <svg {...common}>
          <title>{title ?? BRAND_LABEL.MC}</title>
          <rect
            width="40"
            height="24"
            rx="3"
            fill="#FFFFFF"
            stroke="#E5E7EB"
            strokeWidth="0.5"
          />
          <circle cx="16" cy="12" r="7" fill="#EB001B" />
          <circle cx="24" cy="12" r="7" fill="#F79E1B" />
          {/* Lens where the two circles intersect — painted in MC orange
              so the classic three-tone mark reads correctly. */}
          <path
            d="M20 6.26 A7 7 0 0 1 20 17.74 A7 7 0 0 0 20 6.26 Z"
            fill="#FF5F00"
          />
        </svg>
      );

    case "AMEX":
      return (
        <svg {...common}>
          <title>{title ?? BRAND_LABEL.AMEX}</title>
          <rect width="40" height="24" rx="3" fill="#006FCF" />
          <text
            x="20"
            y="16"
            textAnchor="middle"
            fontFamily="Helvetica, Arial, sans-serif"
            fontSize="9"
            fontWeight="800"
            fill="#FFFFFF"
            letterSpacing="0.5"
          >
            AMEX
          </text>
        </svg>
      );

    case "DISCOVER":
      return (
        <svg {...common}>
          <title>{title ?? BRAND_LABEL.DISCOVER}</title>
          <rect
            width="40"
            height="24"
            rx="3"
            fill="#FFFFFF"
            stroke="#E5E7EB"
            strokeWidth="0.5"
          />
          {/* Signature orange sphere behind the wordmark — the most
              recognizable element of the Discover mark. */}
          <circle cx="30" cy="12" r="5" fill="#FF6000" />
          <text
            x="4"
            y="15.5"
            fontFamily="Helvetica, Arial, sans-serif"
            fontSize="5.8"
            fontWeight="800"
            fill="#111827"
            letterSpacing="0.15"
          >
            DISCOVER
          </text>
        </svg>
      );

    case "RUPAY":
      return (
        <svg {...common}>
          <title>{title ?? BRAND_LABEL.RUPAY}</title>
          <rect
            width="40"
            height="24"
            rx="3"
            fill="#FFFFFF"
            stroke="#E5E7EB"
            strokeWidth="0.5"
          />
          {/* Two-tone wordmark: navy "Ru" + saffron "Pay" — the RuPay
              network's signature Indian-flag inspired palette. */}
          <text
            x="4.5"
            y="16.5"
            fontFamily="Helvetica, Arial, sans-serif"
            fontSize="9"
            fontWeight="900"
            fontStyle="italic"
          >
            <tspan fill="#0F2C6C">Ru</tspan>
            <tspan fill="#F26522">Pay</tspan>
          </text>
          {/* Small saffron accent bar under "Pay" — echoes the official
              RuPay logo's angular flourish. */}
          <rect x="22" y="18" width="10" height="1.5" fill="#F26522" rx="0.5" />
        </svg>
      );
  }
}
