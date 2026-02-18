import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";

export const metadata: Metadata = {
  title: "HostFi vs AppFolio — Best Alternative for Airbnb Hosts | HostFi",
  description: "Compare HostFi and AppFolio for rental property expense tracking. AppFolio targets 50+ unit long-term PMs. HostFi is built for Airbnb hosts with AI bill parsing, Schedule E tax prep, and STR integrations.",
  alternates: { canonical: "https://hostfi.ai/compare/appfolio" },
  openGraph: {
    title: "HostFi vs AppFolio — Best Alternative for Airbnb Hosts",
    description: "Compare HostFi and AppFolio for rental property expense tracking. See why STR hosts choose HostFi.",
    url: "https://hostfi.ai/compare/appfolio",
  },
};

export default function CompareAppfolioPage() {
  return (
    <div className="min-h-screen bg-white">
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
            HostFi vs AppFolio
          </h1>
          <p className="text-gray-600 text-lg leading-relaxed max-w-2xl">
            AppFolio is an enterprise property management platform built for traditional long-term rental managers. HostFi is built for short-term rental operators. Here's why they serve completely different markets.
          </p>
        </div>

        {/* Quick Summary */}
        <div className="bg-gray-50 rounded-2xl p-6 mb-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">The Quick Version</h2>
          <p className="text-gray-600 leading-relaxed">
            <strong>AppFolio</strong> is enterprise property management software for large-scale long-term rental operators — think apartment complexes, commercial buildings, and property management companies with 50+ units. It starts around $400-500/month minimum, includes full accounting, leasing, tenant screening, and maintenance workflows. It has zero Airbnb or short-term rental integrations.
          </p>
          <p className="text-gray-600 leading-relaxed mt-3">
            <strong>HostFi</strong> is built specifically for Airbnb hosts and short-term rental operators with 1-50 properties. It focuses on AI-powered expense tracking, receipt scanning, and Schedule E tax prep — not leasing or tenant management. It integrates with OwnerRez, Guesty, and Hostaway. Free for up to 3 properties, $15-49/month beyond that.
          </p>
        </div>

        {/* Feature Comparison */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Feature Comparison</h2>
          
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            {/* Header Row */}
            <div className="grid grid-cols-3 bg-gray-50 border-b border-gray-200">
              <div className="px-4 py-3 font-semibold text-gray-900">Feature</div>
              <div className="px-4 py-3 font-semibold text-gray-900 text-center">HostFi</div>
              <div className="px-4 py-3 font-semibold text-gray-900 text-center">AppFolio</div>
            </div>

            <FeatureRow feature="AI Receipt Scanning" hostfi={true} competitor={false} />
            <FeatureRow feature="AI Bill Parsing (Email)" hostfi={true} competitor={false} />
            <FeatureRow feature="Schedule E Auto-Mapping" hostfi={true} competitor={false} />
            <FeatureRow feature="Airbnb/VRBO Integration" hostfi={true} competitor={false} />
            <FeatureRow feature="STR PMS Integrations" hostfi="Guesty, Hostaway, OwnerRez" competitor="None" />
            <FeatureRow feature="Anomaly Detection" hostfi={true} competitor={false} />
            <FeatureRow feature="Ask AI Assistant" hostfi={true} competitor="Coming Soon" />
            <FeatureRow feature="Per-Property P&L" hostfi={true} competitor={true} />
            <FeatureRow feature="Full GL Accounting" hostfi={false} competitor={true} />
            <FeatureRow feature="Tenant Screening" hostfi={false} competitor={true} />
            <FeatureRow feature="Lease Management" hostfi={false} competitor={true} />
            <FeatureRow feature="Maintenance Workflows" hostfi={false} competitor={true} />
            <FeatureRow feature="Minimum Units" hostfi="No minimum" competitor="50 units" />
            <FeatureRow feature="Pricing" hostfi="Free – $49/mo" competitor="$400+/mo" />
            <FeatureRow feature="Self-Serve Signup" hostfi={true} competitor="Sales demo required" />
            <FeatureRow feature="Built For" hostfi="Short-Term Rentals" competitor="Long-Term Rentals" isLast />
          </div>
        </div>

        {/* Key Differences */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Key Differences</h2>
          <div className="space-y-6">
            <DifferenceCard
              title="Different Markets, Different Problems"
              description="AppFolio solves the problems of traditional property managers: leasing apartments, screening tenants, handling maintenance requests, collecting monthly rent. HostFi solves problems specific to Airbnb operators: tracking high-volume expenses across multiple properties, parsing cleaning invoices, catching utility anomalies between guests, and preparing for Schedule E tax filing. They're simply different products for different customers."
            />
            <DifferenceCard
              title="No STR Integrations in AppFolio"
              description="AppFolio has zero integrations with short-term rental platforms. No Airbnb. No VRBO. No OwnerRez, Guesty, or Hostaway. If you run STRs, you can't sync your bookings or automate revenue tracking. HostFi was built from day one for STR operators, with deep PMS integrations that pull in reservations, guest fees, and platform payouts automatically."
            />
            <DifferenceCard
              title="AI-Powered Expense Processing vs Enterprise Workflows"
              description="AppFolio's AI focuses on workflow automation for large teams — routing maintenance requests, automating lease renewals, etc. HostFi's AI is laser-focused on expense management: scanning receipts, parsing forwarded bills, auto-categorizing transactions, and mapping everything to the correct IRS Schedule E line item. Different AI for different problems."
            />
            <DifferenceCard
              title="Pricing: 10x–30x More Expensive"
              description="AppFolio requires a 50-unit minimum and costs roughly $400-1000+/month depending on features. For a small STR operator with 5 properties, that's absurd — you'd be paying for tenant screening, lease management, and enterprise support you don't need. HostFi is free for up to 3 properties, $15/month for Pro, and $49/month for Business. No minimums, no sales calls."
            />
          </div>
        </div>

        {/* Who Should Use What */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Who Should Use What?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Choose AppFolio if you...</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>• Manage 50+ long-term rental units</li>
                <li>• Need tenant screening and lease management</li>
                <li>• Run a property management company</li>
                <li>• Require full double-entry GL accounting</li>
                <li>• Have budget for $400+/month software</li>
                <li>• Don't operate any short-term rentals</li>
              </ul>
            </div>
            <div className="border-2 border-teal-200 bg-teal-50/30 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Choose HostFi if you...</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>• Run Airbnb, VRBO, or other STR properties</li>
                <li>• Have 1-50 properties (no minimum)</li>
                <li>• Want AI to handle receipt and bill processing</li>
                <li>• Need expenses auto-mapped to Schedule E</li>
                <li>• Use a PMS like Guesty, Hostaway, or OwnerRez</li>
                <li>• Want to get started today without a sales demo</li>
              </ul>
            </div>
          </div>
        </div>

        {/* AppFolio Strengths */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Where AppFolio Wins</h2>
          <div className="bg-gray-50 rounded-xl p-6">
            <p className="text-gray-600 text-sm leading-relaxed mb-4">
              To be fair, AppFolio is excellent at what it does. If you're a traditional property manager with a large portfolio of long-term rentals, AppFolio offers:
            </p>
            <ul className="space-y-2 text-gray-600 text-sm">
              <li>• <strong>20+ years in market</strong> — trusted by thousands of property management companies</li>
              <li>• <strong>Full-featured accounting</strong> — double-entry GL, financial statements, trust accounting</li>
              <li>• <strong>End-to-end leasing</strong> — listing syndication, applications, tenant screening, lease signing</li>
              <li>• <strong>Maintenance management</strong> — work order tracking, vendor coordination, inspections</li>
              <li>• <strong>Enterprise support</strong> — dedicated CSMs, phone support, onboarding assistance</li>
              <li>• <strong>Public company stability</strong> — NASDAQ listed, ~$800M revenue, not going anywhere</li>
            </ul>
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
    <div className={`grid grid-cols-3 ${!isLast ? 'border-b border-gray-100' : ''}`}>
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
