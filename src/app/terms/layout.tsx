import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — HostFi",
  description: "HostFi terms of service. Cancel anytime, no contracts, no fees. Your data stays accessible for 30 days after cancellation.",
  alternates: { canonical: "https://hostfi.ai/terms" },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
