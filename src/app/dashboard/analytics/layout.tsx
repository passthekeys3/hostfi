import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics — HostFi",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
