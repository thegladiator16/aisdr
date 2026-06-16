import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing for Indian B2B teams. Starter ₹15,000/mo, Growth ₹30,000/mo, Enterprise custom. 50 free credits to start.",
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
