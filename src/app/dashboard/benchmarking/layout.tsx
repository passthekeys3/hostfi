import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Benchmarking — HostFi",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
