import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";

export const metadata: Metadata = {
  title: "HostFi vs TurboTenant: STR Expense Tracker vs Tenant Management 2026 | HostFi",
  description: "Compare HostFi and TurboTenant for rental property management. TurboTenant handles tenant screening and rent collection. HostFi handles AI expense tracking for STR operators.",
  alternates: { canonical: "https://hostfi.ai/compare/turbotenant" },
  openGraph: {
    title: "HostFi vs TurboTenant: STR Expense Tracker vs Tenant Management 2026",
    description: "Tenant management vs STR expense automation. See which tool fits your rental business.",
    url: "https://hostfi.ai/compare/turbotenant",
  },
};

export default function CompareTurboTenantPage() {
  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "WebPage",
        "name": "HostFi vs TurboTenant: STR Expense Tracker vs Tenant Management 2026",
        "url": "https://hostfi.ai/compare/turbotenant",
        "breadcrumb": { "@type": "BreadcrumbList", "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://hostfi.ai" },
          { "@type": "ListItem", "position": 2, "name": "Compare", "item": "https://hostfi.ai/compare" },
          { "@type": "ListItem", "position": 3, "name": "HostFi vs TurboTenant" }
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
            HostFi vs TurboTenant
          </h1>
          <p className="text-gray-600 text-lg leading-relaxed max-w-2xl">
            These tools solve completely different problems. TurboTenant helps landlords find and manage tenants. HostFi helps STR operators track and optimize expenses. Here's the breakdown.
          </p>
        </div>

        <div className="bg-gray-50 rounded-2xl p-6 mb-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">The Quick Version</h2>
          <p className="text-gray-600 leading-relaxed">
            <strong>TurboTenant</strong> is a tenant management platform for long-term landlords. It handles rental listings, tenant screening, lease signing, rent collection, and basic accounting. Free for landlords (tenants pay screening fees). Great if you have traditional tenants on 12-month leases.
          </p>
          <p className="text-gray-600 leading-relaxed mt-3">
            <strong>HostFi</strong> is AI-powered expense management for short-term rental operators. It doesn't do tenant screening (STR hosts don't have tenants in the traditional sense). Instead, it uses AI to parse bills, scan receipts, auto-categorize expenses for Schedule E, detect spending anomalies, and integrate with PMS platforms like Guesty, Hostaway, and Hospitable.
          </p>
        </div>

        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Feature Comparison</h2>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="hidden sm:grid grid-cols-3 bg-gray-50 border-b border-gray-200">
              <div className="px-4 py-3 font-semibold text-gray-900">Feature</div>
              <div className="px-4 py-3 font-semibold text-gray-900 text-center">HostFi</div>
              <div className="px-4 py-3 font-semibold text-gray-900 text-center">TurboTenant</div>
            </div>
            <Row feature="AI Receipt Scanning" hostfi={true} competitor={false} />
            <Row feature="AI Bill Parsing (Email)" hostfi={true} competitor={false} />
            <Row feature="Schedule E Auto-Mapping" hostfi={true} competitor={false} />
            <Row feature="PMS Integrations" hostfi="6 platforms" competitor={false} />
            <Row feature="Anomaly Detection" hostfi={true} competitor={false} />
            <Row feature="Ask AI Assistant" hostfi={true} competitor={false} />
            <Row feature="Tenant Screening" hostfi={false} competitor={true} />
            <Row feature="Rental Listings" hostfi={false} competitor={true} />
            <Row feature="Lease Signing" hostfi={false} competitor={true} />
            <Row feature="Rent Collection" hostfi={false} competitor={true} />
            <Row feature="Expense Tracking" hostfi="AI-powered" competitor="Basic" />
            <Row feature="Per-Property P&L" hostfi={true} competitor="Basic" />
            <Row feature="Price" hostfi="Free-$49/mo" competitor="Free-$12.42/mo" />
            <Row feature="Built For" hostfi="Short-Term Rentals" competitor="Long-Term Rentals" isLast />
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Key Differences</h2>
          <div className="space-y-6">
            <div className="border-l-4 border-teal-500 pl-4">
              <h3 className="font-semibold text-gray-900 mb-2">Different Problems Entirely</h3>
              <p className="text-gray-600 text-sm leading-relaxed">TurboTenant's core is finding tenants: listing properties, screening applicants, signing leases, collecting monthly rent. HostFi's core is tracking expenses: parsing bills with AI, scanning receipts, mapping to tax forms, catching anomalies. If you run STRs, you don't have tenants to screen -- you have expenses to manage.</p>
            </div>
            <div className="border-l-4 border-teal-500 pl-4">
              <h3 className="font-semibold text-gray-900 mb-2">Expense Tracking Depth</h3>
              <p className="text-gray-600 text-sm leading-relaxed">TurboTenant added basic expense tracking as an add-on feature. It works for logging a few monthly expenses. HostFi is expense tracking as the core product -- AI bill parsing, receipt OCR, automated categorization, anomaly detection, cross-property benchmarking, and natural language queries about your spending.</p>
            </div>
            <div className="border-l-4 border-teal-500 pl-4">
              <h3 className="font-semibold text-gray-900 mb-2">Tax Preparation</h3>
              <p className="text-gray-600 text-sm leading-relaxed">TurboTenant doesn't map expenses to IRS Schedule E. HostFi auto-maps every expense to the correct line item, supports both property owner and arbitrage operator mappings, and generates tax-ready exports.</p>
            </div>
            <div className="border-l-4 border-teal-500 pl-4">
              <h3 className="font-semibold text-gray-900 mb-2">Can You Use Both?</h3>
              <p className="text-gray-600 text-sm leading-relaxed">If you have both LTR and STR properties, you could use TurboTenant for your long-term tenants and HostFi for your short-term rental expenses. They solve different problems and don't overlap much.</p>
            </div>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Who Should Use What?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Choose TurboTenant if you...</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>&#8226; Need to find and screen tenants</li>
                <li>&#8226; Have long-term rental properties</li>
                <li>&#8226; Want lease signing and rent collection</li>
                <li>&#8226; Only need basic expense logging</li>
                <li>&#8226; Don't do short-term rentals</li>
              </ul>
            </div>
            <div className="border-2 border-teal-200 bg-teal-50/30 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Choose HostFi if you...</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>&#8226; Run Airbnb, VRBO, or other STR properties</li>
                <li>&#8226; Want AI-powered expense automation</li>
                <li>&#8226; Need Schedule E tax prep</li>
                <li>&#8226; Use a PMS like Guesty, Hostaway, or Hospitable</li>
                <li>&#8226; Want anomaly detection and smart alerts</li>
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
