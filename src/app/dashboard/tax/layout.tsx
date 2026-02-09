import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tax Prep | HostFi",
  description: "Schedule E tax preparation with automatic expense mapping for rental properties",
};

export default function TaxLayout({ children }: { children: React.ReactNode }) {
  return children;
}
