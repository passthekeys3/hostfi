import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";

export const metadata: Metadata = {
  title: "HostFi vs Stessa: Best STR Expense Tracker 2026 | HostFi",
  description: "Compare HostFi and Stessa for rental property expense tracking. See why STR hosts choose HostFi for AI bill parsing, Schedule E auto-mapping, and short-term rental features.",
  alternates: { canonical: "https://hostfi.ai/compare/stessa" },
  openGraph: {
    title: "HostFi vs Stessa: Best STR Expense Tracker 2026",
    description: "Compare HostFi and Stessa for rental property expense tracking. See why STR hosts choose HostFi.",
    url: "https://hostfi.ai/compare/stessa",
  },
};

export default function CompareStessaPage() {
  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "HostFi vs Stessa: Best STR Expense Tracker 2026",
        "description": "Compare HostFi and Stessa for rental property expense tracking. See why STR hosts choose HostFi for AI bill parsing, Schedule E auto-mapping, and short-term rental features.",
        "url": "https://hostfi.ai/compare/stessa",
        "breadcrumb": {
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://hostfi.ai" },
            { "@type": "ListItem", "position": 2, "name": "Compare", "item": "https://hostfi.ai/compare" },
            { "@type": "ListItem", "position": 3, "name": "HostFi vs Stessa" }
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
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            HostFi vs Stessa
          </h1>
          <p className="text-gray-600 text-lg leading-relaxed max-w-2xl">
            Both HostFi and Stessa help landlords track rental income and expenses. But they're built for different types of investors. Here's an honest comparison.
          </p>
        </div>

        {/* Quick Summary */}
        <div className="bg-gray-50 rounded-2xl p-6 mb-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">The Quick Version</h2>
          <p className="text-gray-600 leading-relaxed">
            <strong>Stessa</strong> is great for buy-and-hold investors with long-term rentals. It's free (owned by Roofstock), focuses on basic expense tracking and portfolio metrics, and works well if you're collecting monthly rent checks from traditional tenants.
          </p>
          <p className="text-gray-600 leading-relaxed mt-3">
            <strong>HostFi</strong> is built specifically for short-term rental operators — Airbnb hosts, VRBO managers, and rental arbitrage operators. It has AI-powered expense categorization, automatic Schedule E mapping, and understands the high-volume, high-complexity nature of STR operations.
          </p>
        </div>

        {/* Feature Comparison */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Feature Comparison</h2>
          
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            {/* Header Row - Desktop only */}
            <div className="hidden sm:grid grid-cols-3 bg-gray-50 border-b border-gray-200">
              <div className="px-4 py-3 font-semibold text-gray-900">Feature</div>
              <div className="px-4 py-3 font-semibold text-gray-900 text-center">HostFi</div>
              <div className="px-4 py-3 font-semibold text-gray-900 text-center">Stessa</div>
            </div>

            <FeatureRow feature="AI Receipt Scanning" hostfi={true} competitor={false} />
            <FeatureRow feature="AI Bill Parsing (Email)" hostfi={true} competitor={false} />
            <FeatureRow feature="Schedule E Auto-Mapping" hostfi={true} competitor={false} />
            <FeatureRow feature="Owner vs Arbitrage Support" hostfi={true} competitor={false} />
            <FeatureRow feature="PMS Integrations" hostfi="Guesty, Hostaway, OwnerRez" competitor={false} />
            <FeatureRow feature="Anomaly Detection" hostfi={true} competitor={false} />
            <FeatureRow feature="Ask AI Assistant" hostfi={true} competitor={false} />
            <FeatureRow feature="Bank Account Linking" hostfi={true} competitor={true} />
            <FeatureRow feature="Per-Property P&L" hostfi={true} competitor={true} />
            <FeatureRow feature="Free Tier" hostfi="3 properties" competitor="Unlimited" />
            <FeatureRow feature="Built For" hostfi="Short-Term Rentals" competitor="Long-Term Rentals" isLast />
          </div>
        </div>

        {/* Key Differences */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Key Differences</h2>
          <div className="space-y-6">
            <DifferenceCard
              title="AI-Powered Expense Processing"
              description="HostFi uses AI to automatically extract and categorize expenses from receipts and forwarded bills. Snap a photo of a cleaning invoice, and it's categorized, assigned to the right property, and mapped to the correct Schedule E line. Stessa requires manual entry or basic bank sync categorization."
            />
            <DifferenceCard
              title="Schedule E Automation"
              description="Every expense in HostFi automatically maps to the correct IRS Schedule E line item. At tax time, you export a report that's ready for your CPA. Stessa uses generic categories that don't align with tax forms — you'll still need to reorganize everything for filing."
            />
            <DifferenceCard
              title="Short-Term Rental Focus"
              description="Stessa was built for traditional landlords: one lease, one tenant, monthly rent. HostFi understands STR complexity — multiple bookings per month, cleaning after every guest, platform fees, seasonal pricing, and the high transaction volume that comes with Airbnb hosting."
            />
            <DifferenceCard
              title="Arbitrage Operator Support"
              description="If you're doing rental arbitrage (leasing a property and subletting on Airbnb), HostFi handles your tax situation correctly — rent paid goes to Line 14, not Line 12. Stessa doesn't distinguish between owners and operators."
            />
          </div>
        </div>

        {/* Who Should Use What */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Who Should Use What?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Choose Stessa if you...</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>• Only have long-term rentals (12-month leases)</li>
                <li>• Want basic expense tracking for free</li>
                <li>• Don't need AI categorization</li>
                <li>• Are comfortable doing manual tax prep</li>
                <li>• Prioritize Roofstock integration</li>
              </ul>
            </div>
            <div className="border-2 border-teal-200 bg-teal-50/30 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Choose HostFi if you...</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>• Run Airbnb, VRBO, or other STR properties</li>
                <li>• Want AI to handle receipt and bill processing</li>
                <li>• Need expenses auto-mapped to Schedule E</li>
                <li>• Do rental arbitrage</li>
                <li>• Use a PMS like Guesty or Hostaway</li>
                <li>• Want anomaly detection for unusual charges</li>
              </ul>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gray-900 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">
            Ready to try HostFi?
          </h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Free for up to 3 properties. Full features, no credit card required.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-900 font-medium rounded-xl text-sm hover:bg-gray-100 transition-colors"
          >
            Get Started Free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-8 mt-16">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs text-gray-400">
          <p>© 2026 HostFi. All Rights Reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-600 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureRow({ feature, hostfi, competitor, isLast = false }: { 
  feature: string; 
  hostfi: boolean | string; 
  competitor: boolean | string;
  isLast?: boolean;
}) {
  return (
    <>
      {/* Desktop row */}
      <div className={`hidden sm:grid grid-cols-3 ${!isLast ? 'border-b border-gray-100' : ''}`}>
        <div className="px-4 py-3 text-gray-700 text-sm">{feature}</div>
        <div className="px-4 py-3 flex justify-center">
          {typeof hostfi === 'boolean' ? (
            hostfi ? <Check className="w-5 h-5 text-teal-600" /> : <X className="w-5 h-5 text-gray-300" />
          ) : (
            <span className="text-sm text-teal-600 font-medium">{hostfi}</span>
          )}
        </div>
        <div className="px-4 py-3 flex justify-center">
          {typeof competitor === 'boolean' ? (
            competitor ? <Check className="w-5 h-5 text-teal-600" /> : <X className="w-5 h-5 text-gray-300" />
          ) : (
            <span className="text-sm text-gray-600">{competitor}</span>
          )}
        </div>
      </div>
      {/* Mobile card */}
      <div className={`sm:hidden p-4 ${!isLast ? 'border-b border-gray-100' : ''}`}>
        <p className="font-medium text-sm text-gray-900 mb-2">{feature}</p>
        <div className="flex justify-between text-xs">
          <span className="flex items-center gap-1.5">
            <span className="text-gray-500">HostFi:</span>
            {typeof hostfi === 'boolean' ? (
              hostfi ? <Check className="w-4 h-4 text-teal-600" /> : <X className="w-4 h-4 text-gray-300" />
            ) : (
              <span className="text-teal-600 font-medium">{hostfi}</span>
            )}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-gray-500">Stessa:</span>
            {typeof competitor === 'boolean' ? (
              competitor ? <Check className="w-4 h-4 text-teal-600" /> : <X className="w-4 h-4 text-gray-300" />
            ) : (
              <span className="text-gray-600">{competitor}</span>
            )}
          </span>
        </div>
      </div>
    </>
  );
}

function DifferenceCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-l-4 border-teal-500 pl-4">
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
    </div>
  );
}
