import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Talk to the AryaSDR team. Sales inquiries, demos, partnerships — we typically respond within 1 business day.",
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
