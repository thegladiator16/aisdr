import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing. Starter $199/mo, Growth $349/mo, Enterprise custom. 50 free credits to start, no credit card needed.",
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
