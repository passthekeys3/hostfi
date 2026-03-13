import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";

export const metadata: Metadata = {
  title: "HostFi vs Baselane: Best STR Expense Tracker 2026 | HostFi",
  description: "Compare HostFi and Baselane for rental property expense tracking. Baselane bundles banking with bookkeeping for landlords. HostFi is built for short-term rental operators with AI expense automation.",
  alternates: { canonical: "https://hostfi.ai/compare/baselane" },
  openGraph: {
    title: "HostFi vs Baselane: Best STR Expense Tracker 2026",
    description: "Compare HostFi and Baselane for rental property management. See which is better for STR operators.",
    url: "https://hostfi.ai/compare/baselane",
  },
};

export default function CompareBaselanePage() {
  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "WebPage",
        "name": "HostFi vs Baselane: Best STR Expense Tracker 2026",
        "url": "https://hostfi.ai/compare/baselane",
        "breadcrumb": { "@type": "BreadcrumbList", "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://hostfi.ai" },
          { "@type": "ListItem", "position": 2, "name": "Compare", "item": "https://hostfi.ai/compare" },
          { "@type": "ListItem", "position": 3, "name": "HostFi vs Baselane" }
        ]}
      }) }} />

      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="HostFi" className="w-8 h-8" />
            <span className="font-bold text-lg text-gray-900">HostFi</span>
          </Link>
          <Link href="/compare" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            ← All Comparisons
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            HostFi vs Baselane
          </h1>
          <p className="text-gray-600 text-lg leading-relaxed max-w-2xl">
            Baselane bundles banking, bookkeeping, and rent collection for landlords. HostFi focuses on AI-powered expense management for short-term rental operators. Different tools for different businesses.
          </p>
        </div>

        <div className="bg-gray-50 rounded-2xl p-6 mb-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">The Quick Version</h2>
          <p className="text-gray-600 leading-relaxed">
            <strong>Baselane</strong> is a banking-first platform for landlords. It offers integrated checking accounts, debit cards, rent collection, and bookkeeping. It works well if you want your banking and property management in one place with long-term tenants paying monthly rent.
          </p>
          <p className="text-gray-600 leading-relaxed mt-3">
            <strong>HostFi</strong> is expense-management-first for STR operators. It uses AI to parse bills and receipts, auto-maps everything to IRS Schedule E, connects to your PMS (Guesty, Hostaway, Hospitable), and catches expense anomalies. It doesn't try to be your bank -- it focuses on being the best at tracking and categorizing your rental expenses.
          </p>
        </div>

        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Feature Comparison</h2>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="hidden sm:grid grid-cols-3 bg-gray-50 border-b border-gray-200">
              <div className="px-4 py-3 font-semibold text-gray-900">Feature</div>
              <div className="px-4 py-3 font-semibold text-gray-900 text-center">HostFi</div>
              <div className="px-4 py-3 font-semibold text-gray-900 text-center">Baselane</div>
            </div>
            <Row feature="AI Receipt Scanning" hostfi={true} competitor={false} />
            <Row feature="AI Bill Parsing (Email)" hostfi={true} competitor={false} />
            <Row feature="Schedule E Auto-Mapping" hostfi={true} competitor="Basic" />
            <Row feature="Owner vs Arbitrage Support" hostfi={true} competitor={false} />
            <Row feature="PMS Integrations" hostfi="6 platforms" competitor={false} />
            <Row feature="Anomaly Detection" hostfi={true} competitor={false} />
            <Row feature="Ask AI Assistant" hostfi={true} competitor={false} />
            <Row feature="Integrated Banking" hostfi={false} competitor={true} />
            <Row feature="Rent Collection" hostfi={false} competitor={true} />
            <Row feature="Debit Cards" hostfi={false} competitor={true} />
            <Row feature="Bank Sync (Plaid)" hostfi={true} competitor="Native banking" />
            <Row feature="Per-Property P&L" hostfi={true} competitor={true} />
            <Row feature="Price" hostfi="Free-$49/mo" competitor="Free" />
            <Row feature="Built For" hostfi="Short-Term Rentals" competitor="Long-Term Rentals" isLast />
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Key Differences</h2>
          <div className="space-y-6">
            <div className="border-l-4 border-teal-500 pl-4">
              <h3 className="font-semibold text-gray-900 mb-2">Banking vs Expense Management</h3>
              <p className="text-gray-600 text-sm leading-relaxed">Baselane wants to be your bank. HostFi wants to be your expense brain. Baselane offers checking accounts, debit cards, and wire transfers. HostFi uses AI to parse your bills, scan your receipts, and auto-categorize everything. Different philosophies -- Baselane centralizes money flow, HostFi automates expense intelligence.</p>
            </div>
            <div className="border-l-4 border-teal-500 pl-4">
              <h3 className="font-semibold text-gray-900 mb-2">STR Complexity</h3>
              <p className="text-gray-600 text-sm leading-relaxed">Baselane's bookkeeping works great for one tenant paying $2,000/month. But STR operators deal with 20+ guests per month, cleaning fees after every stay, platform commissions, seasonal pricing swings, and supply restocking. HostFi is built for that transaction volume and complexity.</p>
            </div>
            <div className="border-l-4 border-teal-500 pl-4">
              <h3 className="font-semibold text-gray-900 mb-2">Tax Prep</h3>
              <p className="text-gray-600 text-sm leading-relaxed">Baselane offers basic categorization. HostFi maps every expense to the exact IRS Schedule E line item, with separate mappings for property owners and arbitrage operators. At tax time, you get an export that's ready for your CPA.</p>
            </div>
            <div className="border-l-4 border-teal-500 pl-4">
              <h3 className="font-semibold text-gray-900 mb-2">PMS Integration</h3>
              <p className="text-gray-600 text-sm leading-relaxed">Baselane doesn't connect to property management systems. HostFi integrates with Guesty, Hostaway, OwnerRez, Hospitable, and Lodgify to sync properties, reservations, and revenue automatically.</p>
            </div>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Who Should Use What?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Choose Baselane if you...</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>&#8226; Want banking and bookkeeping in one platform</li>
                <li>&#8226; Have long-term rental tenants paying monthly</li>
                <li>&#8226; Need rent collection and payment tracking</li>
                <li>&#8226; Want a free integrated debit card</li>
                <li>&#8226; Don't need AI-powered expense categorization</li>
              </ul>
            </div>
            <div className="border-2 border-teal-200 bg-teal-50/30 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Choose HostFi if you...</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>&#8226; Run Airbnb, VRBO, or other STR properties</li>
                <li>&#8226; Want AI to handle receipt and bill processing</li>
                <li>&#8226; Need expenses auto-mapped to Schedule E</li>
                <li>&#8226; Use a PMS like Guesty, Hostaway, or Hospitable</li>
                <li>&#8226; Want anomaly detection and smart expense alerts</li>
                <li>&#8226; Do rental arbitrage</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Ready to try HostFi?</h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">Free for up to 3 properties. Full features, no credit card required.</p>
          <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-900 font-medium rounded-xl text-sm hover:bg-gray-100 transition-colors">
            Get Started Free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <footer className="border-t border-gray-100 px-6 py-8 mt-16">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs text-gray-400">
          <p>&copy; 2026 HostFi. All Rights Reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-600 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Row({ feature, hostfi, competitor, isLast = false }: { feature: string; hostfi: boolean | string; competitor: boolean | string; isLast?: boolean }) {
  return (
    <div className={`grid grid-cols-3 ${!isLast ? 'border-b border-gray-100' : ''}`}>
      <div className="px-4 py-3 text-gray-700 text-sm">{feature}</div>
      <div className="px-4 py-3 flex justify-center">
        {typeof hostfi === 'boolean' ? (hostfi ? <Check className="w-5 h-5 text-teal-600" /> : <X className="w-5 h-5 text-gray-300" />) : <span className="text-sm text-teal-600 font-medium">{hostfi}</span>}
      </div>
      <div className="px-4 py-3 flex justify-center">
        {typeof competitor === 'boolean' ? (competitor ? <Check className="w-5 h-5 text-teal-600" /> : <X className="w-5 h-5 text-gray-300" />) : <span className="text-sm text-gray-600">{competitor}</span>}
      </div>
    </div>
  );
}
