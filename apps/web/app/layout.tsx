import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  preload: true,
});

const SITE_URL = "https://aryasdr.in";
const DEFAULT_TITLE = "AryaSDR: AI Sales Development Rep for Indian B2B";
const DEFAULT_DESC =
  "Arya finds leads, writes personalized outreach, handles replies, and books meetings, at a fraction of the cost of a human SDR. Built for Indian B2B founders.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: "%s | AryaSDR",
  },
  description: DEFAULT_DESC,
  keywords: [
    "AI SDR",
    "sales development representative",
    "B2B outreach",
    "cold email automation",
    "India",
    "WhatsApp outreach",
    "lead generation",
    "AryaSDR",
  ],
  authors: [{ name: "AryaSDR" }],
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
    siteName: "AryaSDR",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AryaSDR: AI Sales Development Rep",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  // icons auto-generated from app/icon.tsx + app/apple-icon.tsx
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#6C47FF",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className={inter.variable}>
        <head>
          {/* Preconnect + dns-prefetch to third-party origins the app uses
              on hot paths — cuts the initial-handshake cost when Clerk boots,
              Razorpay checkout opens, or any Neon/Upstash call is made. */}
          <link rel="preconnect" href="https://clerk.aryasdr.in" crossOrigin="" />
          <link rel="preconnect" href="https://checkout.razorpay.com" crossOrigin="" />
          <link rel="dns-prefetch" href="https://api.razorpay.com" />
          <link rel="dns-prefetch" href="https://accounts.google.com" />
          <link rel="dns-prefetch" href="https://apis.google.com" />
        </head>
        <body className={inter.className}>
          {children}
          <Toaster richColors position="top-right" />
        </body>
      </html>
    </ClerkProvider>
  );
}
