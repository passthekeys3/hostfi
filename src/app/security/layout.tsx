import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security — HostFi",
  description: "How HostFi protects your financial data. AES-256-GCM encryption, OAuth CSRF protection, HMAC webhook verification, SOC 2 compliant infrastructure, and row-level data isolation.",
  alternates: { canonical: "https://hostfi.ai/security" },
  openGraph: {
    title: "Security — HostFi",
    description: "How HostFi protects your rental property financial data. Bank-level encryption, no stored banking credentials.",
    url: "https://hostfi.ai/security",
  },
};

export default function SecurityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
