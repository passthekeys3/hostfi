import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reports | HostFi",
  description: "AI-generated monthly financial summaries for your rental properties",
};

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
