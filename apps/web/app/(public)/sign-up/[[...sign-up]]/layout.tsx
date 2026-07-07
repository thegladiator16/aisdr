import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create your AryaSDR account. 50 free credits to start.",
};

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
