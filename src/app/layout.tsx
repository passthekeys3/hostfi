import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
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
  description: "Track, categorize, and optimize every expense across your rental portfolio. AI bill parsing, Schedule E tax prep, anomaly detection, and more. Free for up to 3 properties.",
  manifest: "/manifest.json",
  metadataBase: new URL("https://hostfi.ai"),
  openGraph: {
    title: "HostFi — AI-Powered Expense Management for Rental Properties",
    description: "Track, categorize, and optimize every expense across your rental portfolio. AI bill parsing, Schedule E tax prep, anomaly detection.",
    url: "https://hostfi.ai",
    siteName: "HostFi",
    type: "website",
    locale: "en_US",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "HostFi — AI-Powered Expense Management for Rental Properties" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "HostFi — AI-Powered Expense Management for Rental Properties",
    description: "Track, categorize, and optimize every expense across your rental portfolio.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://hostfi.ai",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HostFi",
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased min-h-screen bg-background text-foreground`}>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
