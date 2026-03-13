import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "HostFi vs Competitors: STR Expense Tracker Comparisons | HostFi",
  description: "See how HostFi compares to Stessa, Landlord Studio, AppFolio, Topkey, Baselane, Buildium, and TurboTenant for short-term rental expense management.",
  alternates: { canonical: "https://hostfi.ai/compare" },
  openGraph: {
    title: "HostFi vs Competitors: STR Expense Tracker Comparisons",
    description: "Honest comparisons of HostFi against popular rental property management and expense tracking tools.",
    url: "https://hostfi.ai/compare",
  },
};

const comparisons = [
  {
    slug: "stessa",
    name: "Stessa",
    tagline: "Built for buy-and-hold investors. HostFi is built for STR operators.",
    highlight: "Free (Roofstock-owned) vs HostFi's STR-specific AI features",
  },
  {
    slug: "landlord-studio",
    name: "Landlord Studio",
    tagline: "Great for traditional landlords. Less ideal for short-term rental complexity.",
    highlight: "LTR-focused vs HostFi's STR-native expense tracking",
  },
  {
    slug: "appfolio",
    name: "AppFolio",
    tagline: "Enterprise property management. Overkill (and overpriced) for most STR operators.",
    highlight: "$300+/mo enterprise PM vs HostFi's $15/mo STR focus",
  },
  {
    slug: "topkey",
    name: "Topkey",
    tagline: "STR financial ops with corporate cards. Different approach to the same problem.",
    highlight: "Card-first model vs HostFi's expense-tracking-first approach",
  },
  {
    slug: "baselane",
    name: "Baselane",
    tagline: "Banking + bookkeeping for landlords. Built for LTR, not the STR grind.",
    highlight: "Banking bundle vs HostFi's AI-powered expense automation",
  },
  {
    slug: "buildium",
    name: "Buildium",
    tagline: "Full-service PM software. Way more than most STR hosts need.",
    highlight: "$58+/mo full PM suite vs HostFi's focused expense management",
  },
  {
    slug: "turbotenant",
    name: "TurboTenant",
    tagline: "Tenant screening and rent collection. Not expense management.",
    highlight: "Tenant management vs HostFi's expense tracking and tax prep",
  },
];

export default function ComparePage() {
  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "HostFi Competitor Comparisons",
        "description": "Compare HostFi to other rental property expense tracking and management tools.",
        "url": "https://hostfi.ai/compare",
        "breadcrumb": {
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://hostfi.ai" },
            { "@type": "ListItem", "position": 2, "name": "Compare" }
          ]
        }
      }) }} />

      {/* Nav */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="HostFi" className="w-8 h-8" />
            <span className="font-bold text-lg text-gray-900">HostFi</span>
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            ← Back to Home
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            How HostFi Compares
          </h1>
          <p className="text-gray-600 text-lg leading-relaxed max-w-2xl">
            Honest, side-by-side comparisons with the tools STR operators consider most. 
            We built HostFi because none of these solved the specific pain of short-term rental expense management.
          </p>
        </div>

        <div className="grid gap-4">
          {comparisons.map((comp) => (
            <Link
              key={comp.slug}
              href={`/compare/${comp.slug}`}
              className="group block p-6 rounded-2xl border border-gray-200 hover:border-teal-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 group-hover:text-teal-600 transition-colors mb-1">
                    HostFi vs {comp.name}
                  </h2>
                  <p className="text-gray-600 mb-2">{comp.tagline}</p>
                  <p className="text-sm text-gray-400">{comp.highlight}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-teal-500 transition-colors mt-1 flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <p className="text-gray-500 mb-4">Ready to try the STR expense tracker that actually gets it?</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 transition-colors"
          >
            Start Free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
