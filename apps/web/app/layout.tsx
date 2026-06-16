import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { Toaster as HotToaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const SITE_URL = "https://aryasdr.in";
const DEFAULT_TITLE = "AryaSDR — AI Sales Development Rep for Indian B2B";
const DEFAULT_DESC =
  "Arya finds leads, writes personalized outreach, handles replies, and books meetings — at a fraction of the cost of a human SDR. Built for Indian B2B founders.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: "%s — AryaSDR",
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
        alt: "AryaSDR — AI Sales Development Rep",
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          {children}
          <Toaster richColors position="top-right" />
          <HotToaster position="top-right" toastOptions={{ duration: 3000, style: { background: '#333', color: '#fff', fontSize: '14px' } }} />
        </body>
      </html>
    </ClerkProvider>
  );
}
