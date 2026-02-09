import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#14B8A6",
};

export const metadata: Metadata = {
  title: "HostFi — AI-Powered Expense Management for Rental Properties",
  description: "Track, categorize, and optimize every expense across your rental portfolio. AI bill parsing, Schedule E tax prep, anomaly detection, and more. Free for up to 5 properties.",
  manifest: "/manifest.json",
  metadataBase: new URL("https://hostfi.ai"),
  openGraph: {
    title: "HostFi — AI-Powered Expense Management for Rental Properties",
    description: "Track, categorize, and optimize every expense across your rental portfolio. AI bill parsing, Schedule E tax prep, anomaly detection.",
    url: "https://hostfi.ai",
    siteName: "HostFi",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "HostFi — AI-Powered Expense Management for Rental Properties",
    description: "Track, categorize, and optimize every expense across your rental portfolio.",
  },
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HostFi",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased min-h-screen bg-background text-foreground`}>
        {children}
      </body>
    </html>
  );
}
