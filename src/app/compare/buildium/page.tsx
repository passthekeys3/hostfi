import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";

export const metadata: Metadata = {
  title: "HostFi vs Buildium: STR Expense Management Comparison 2026 | HostFi",
  description: "Compare HostFi and Buildium for rental property management. Buildium is full-service PM software starting at $58/mo. HostFi is focused AI expense tracking for STR operators at $15/mo.",
  alternates: { canonical: "https://hostfi.ai/compare/buildium" },
  openGraph: {
    title: "HostFi vs Buildium: STR Expense Management Comparison 2026",
    description: "Full-service PM software vs focused STR expense tracking. See which fits your needs.",
    url: "https://hostfi.ai/compare/buildium",
  },
};

export default function CompareBuildiumPage() {
  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "WebPage",
        "name": "HostFi vs Buildium: STR Expense Management Comparison 2026",
        "url": "https://hostfi.ai/compare/buildium",
        "breadcrumb": { "@type": "BreadcrumbList", "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://hostfi.ai" },
          { "@type": "ListItem", "position": 2, "name": "Compare", "item": "https://hostfi.ai/compare" },
          { "@type": "ListItem", "position": 3, "name": "HostFi vs Buildium" }
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
            HostFi vs Buildium
          </h1>
          <p className="text-gray-600 text-lg leading-relaxed max-w-2xl">
            Buildium is a full-service property management platform designed for professional property managers with 50+ units. HostFi is focused expense management for STR operators who need smart financial tracking, not a full PM suite.
          </p>
        </div>

        <div className="bg-gray-50 rounded-2xl p-6 mb-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">The Quick Version</h2>
          <p className="text-gray-600 leading-relaxed">
            <strong>Buildium</strong> is an all-in-one property management platform that handles leasing, maintenance requests, tenant portals, accounting, and more. It starts at $58/month and scales to $375+/month. It's built for property managers running large portfolios of long-term rentals.
          </p>
          <p className="text-gray-600 leading-relaxed mt-3">
            <strong>HostFi</strong> does one thing exceptionally well: expense management for STR operators. AI-powered bill parsing, receipt scanning, Schedule E auto-mapping, anomaly detection, and PMS integration. Starts free, Pro is $15/month. If you already have a PMS handling your bookings, HostFi handles the financial side.
          </p>
        </div>

        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Feature Comparison</h2>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="hidden sm:grid grid-cols-3 bg-gray-50 border-b border-gray-200">
              <div className="px-4 py-3 font-semibold text-gray-900">Feature</div>
              <div className="px-4 py-3 font-semibold text-gray-900 text-center">HostFi</div>
              <div className="px-4 py-3 font-semibold text-gray-900 text-center">Buildium</div>
            </div>
            <Row feature="AI Receipt Scanning" hostfi={true} competitor={false} />
            <Row feature="AI Bill Parsing (Email)" hostfi={true} competitor={false} />
            <Row feature="Schedule E Auto-Mapping" hostfi={true} competitor={false} />
            <Row feature="Owner vs Arbitrage Support" hostfi={true} competitor={false} />
            <Row feature="PMS Integrations" hostfi="6 platforms" competitor="N/A (is a PMS)" />
            <Row feature="Anomaly Detection" hostfi={true} competitor={false} />
            <Row feature="Ask AI Assistant" hostfi={true} competitor={false} />
            <Row feature="Tenant Portal" hostfi={false} competitor={true} />
            <Row feature="Maintenance Requests" hostfi={false} competitor={true} />
            <Row feature="Leasing & Screening" hostfi={false} competitor={true} />
            <Row feature="Per-Property P&L" hostfi={true} competitor={true} />
            <Row feature="Starting Price" hostfi="Free" competitor="$58/mo" />
            <Row feature="Built For" hostfi="STR Expense Tracking" competitor="Full Property Management" isLast />
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Key Differences</h2>
          <div className="space-y-6">
            <div className="border-l-4 border-teal-500 pl-4">
              <h3 className="font-semibold text-gray-900 mb-2">Scope and Complexity</h3>
              <p className="text-gray-600 text-sm leading-relaxed">Buildium is a full property management suite -- leasing, tenant screening, maintenance workflows, accounting, owner portals. That's powerful if you're managing 100+ apartments. But if you're an STR host with 5-15 properties already using a PMS like Guesty or Hostaway, Buildium is massive overkill. HostFi slots in beside your existing PMS to handle the expense side.</p>
            </div>
            <div className="border-l-4 border-teal-500 pl-4">
              <h3 className="font-semibold text-gray-900 mb-2">Price</h3>
              <p className="text-gray-600 text-sm leading-relaxed">Buildium starts at $58/month (Essential) and goes to $375/month (Premium). HostFi starts free and Pro is $15/month. For an STR operator who just needs smart expense tracking and tax prep, that's a 75%+ savings.</p>
            </div>
            <div className="border-l-4 border-teal-500 pl-4">
              <h3 className="font-semibold text-gray-900 mb-2">AI Automation</h3>
              <p className="text-gray-600 text-sm leading-relaxed">Buildium's accounting is traditional -- manual entry or bank feed categorization. HostFi uses AI to read your bills, scan receipts, detect anomalies, and answer questions about your financial data in plain English. Different era of technology.</p>
            </div>
            <div className="border-l-4 border-teal-500 pl-4">
              <h3 className="font-semibold text-gray-900 mb-2">STR Focus</h3>
              <p className="text-gray-600 text-sm leading-relaxed">Buildium is built for the LTR world: lease agreements, tenant communication, move-in checklists. HostFi understands STR operations: high guest turnover, cleaning after every stay, platform fees from Airbnb and VRBO, seasonal revenue swings, and the specific tax implications for both owners and arbitrage operators.</p>
            </div>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Who Should Use What?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Choose Buildium if you...</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>&#8226; Manage 50+ long-term rental units</li>
                <li>&#8226; Need tenant portals and lease management</li>
                <li>&#8226; Want maintenance request workflows</li>
                <li>&#8226; Are a professional property manager</li>
                <li>&#8226; Need tenant screening built in</li>
              </ul>
            </div>
            <div className="border-2 border-teal-200 bg-teal-50/30 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Choose HostFi if you...</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>&#8226; Run Airbnb, VRBO, or other STR properties</li>
                <li>&#8226; Already have a PMS handling bookings</li>
                <li>&#8226; Want AI-powered expense automation</li>
                <li>&#8226; Need Schedule E tax prep without the accounting degree</li>
                <li>&#8226; Want focused expense tracking, not a full PM suite</li>
                <li>&#8226; Prefer $15/mo over $58+/mo</li>
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
