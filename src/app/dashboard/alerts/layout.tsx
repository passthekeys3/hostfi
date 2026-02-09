import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Alerts — HostFi",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
