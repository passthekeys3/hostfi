import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — HostFi",
  description: "HostFi privacy policy. How we collect, use, and protect your data. We never sell your information or share it with third parties for marketing.",
  alternates: { canonical: "https://hostfi.ai/privacy" },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
