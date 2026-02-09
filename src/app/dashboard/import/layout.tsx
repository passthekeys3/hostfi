import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Import Expenses | HostFi",
  description: "Import expenses from CSV files into HostFi",
};

export default function ImportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
