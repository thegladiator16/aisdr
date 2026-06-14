import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI SDR Agent — Meet Arya, Your AI Sales Development Rep",
  description:
    "Arya finds leads, writes personalized outreach, handles replies, and books meetings — at a fraction of the cost of a human SDR. Built for Indian B2B founders.",
  keywords: [
    "AI SDR",
    "sales development representative",
    "B2B outreach",
    "cold email automation",
    "India",
    "WhatsApp outreach",
    "lead generation",
  ],
  authors: [{ name: "AI SDR Agent" }],
  openGraph: {
    type: "website",
    url: "https://aisdr-web.vercel.app",
    title: "AI SDR Agent — Meet Arya, Your AI Sales Development Rep",
    description:
      "Arya finds leads, writes personalized outreach, handles replies, and books meetings — at a fraction of the cost of a human SDR. Built for Indian B2B founders.",
    siteName: "AI SDR Agent",
    images: [
      {
        url: "https://aisdr-web.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "AI SDR Agent — Meet Arya",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI SDR Agent — Meet Arya, Your AI Sales Development Rep",
    description:
      "Arya finds leads, writes personalized outreach, handles replies, and books meetings at a fraction of the cost of a human SDR.",
    images: ["https://aisdr-web.vercel.app/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
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
        </body>
      </html>
    </ClerkProvider>
  );
}
