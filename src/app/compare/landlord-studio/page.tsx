import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";

export const metadata: Metadata = {
  title: "HostFi vs Landlord Studio: Best STR Expense Tracker 2026 | HostFi",
  description: "Compare HostFi and Landlord Studio for rental property expense tracking. See why STR hosts choose HostFi's AI categorization and Schedule E auto-mapping over basic receipt scanning.",
  alternates: { canonical: "https://hostfi.ai/compare/landlord-studio" },
  openGraph: {
    title: "HostFi vs Landlord Studio: Best STR Expense Tracker 2026",
    description: "Compare HostFi and Landlord Studio for rental property expense tracking. See why STR hosts choose HostFi.",
    url: "https://hostfi.ai/compare/landlord-studio",
  },
};

export default function CompareLandlordStudioPage() {
  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "WebPage",
        "name": "HostFi vs Landlord Studio: Best STR Expense Tracker 2026",
        "url": "https://hostfi.ai/compare/landlord-studio",
        "breadcrumb": { "@type": "BreadcrumbList", "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://hostfi.ai" },
          { "@type": "ListItem", "position": 2, "name": "Compare", "item": "https://hostfi.ai/compare" },
          { "@type": "ListItem", "position": 3, "name": "HostFi vs Landlord Studio" }
        ]}
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
            HostFi vs Landlord Studio
          </h1>
          <p className="text-gray-600 text-lg leading-relaxed max-w-2xl">
            Landlord Studio is a solid mobile-first tool for traditional landlords. HostFi is built for the higher complexity of short-term rentals. Here's how they compare.
          </p>
        </div>

        {/* Quick Summary */}
        <div className="bg-gray-50 rounded-2xl p-6 mb-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">The Quick Version</h2>
          <p className="text-gray-600 leading-relaxed">
            <strong>Landlord Studio</strong> ($12/month) is a mobile-first app for landlords. Good receipt scanning, basic expense tracking, and simple reports. Targets traditional landlords with long-term tenants. Limited STR features, no AI categorization, no Schedule E auto-mapping.
          </p>
          <p className="text-gray-600 leading-relaxed mt-3">
            <strong>HostFi</strong> (free for 3 properties) is built specifically for STR operators. AI-powered categorization, automatic Schedule E line mapping, email bill parsing, anomaly detection, and integrations with property management systems. More features at a lower cost.
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
              <div className="px-4 py-3 font-semibold text-gray-900 text-center">Landlord Studio</div>
            </div>

            <FeatureRow feature="AI Receipt Scanning" hostfi={true} competitor="Basic OCR" />
            <FeatureRow feature="AI Expense Categorization" hostfi={true} competitor={false} />
            <FeatureRow feature="Email Bill Parsing" hostfi={true} competitor={false} />
            <FeatureRow feature="Schedule E Auto-Mapping" hostfi={true} competitor={false} />
            <FeatureRow feature="Owner vs Arbitrage Support" hostfi={true} competitor={false} />
            <FeatureRow feature="PMS Integrations" hostfi="Guesty, Hostaway, OwnerRez" competitor={false} />
            <FeatureRow feature="Anomaly Detection" hostfi={true} competitor={false} />
            <FeatureRow feature="Ask AI Assistant" hostfi={true} competitor={false} />
            <FeatureRow feature="Basic Receipt Scanning" hostfi={true} competitor={true} />
            <FeatureRow feature="Per-Property P&L" hostfi={true} competitor={true} />
            <FeatureRow feature="Mobile App" hostfi="Coming Q2" competitor={true} />
            <FeatureRow feature="Free Tier" hostfi="3 properties" competitor="14-day trial" />
            <FeatureRow feature="Paid Pricing" hostfi="$15-49/mo" competitor="$12/mo" isLast />
          </div>
        </div>

        {/* Key Differences */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Key Differences</h2>
          <div className="space-y-6">
            <DifferenceCard
              title="AI vs Basic Scanning"
              description="Landlord Studio has receipt scanning, but it's basic OCR — it reads the text but doesn't understand it. HostFi's AI actually categorizes expenses, assigns them to properties, and maps them to Schedule E lines automatically. The difference is minutes vs. seconds per expense."
            />
            <DifferenceCard
              title="Schedule E Automation"
              description="This is the big one. HostFi auto-maps every expense to the correct IRS Schedule E line item. Cleaning → Line 7. Utilities → Line 17. Platform fees → Line 19. At tax time, export and hand to your CPA. Landlord Studio uses generic categories that require manual reorganization for taxes."
            />
            <DifferenceCard
              title="Email Bill Parsing"
              description="Forward your utility bills to HostFi, and they're automatically extracted, categorized, and assigned. Landlord Studio doesn't have this — you'll need to manually enter bill amounts or scan paper copies."
            />
            <DifferenceCard
              title="STR-Specific Features"
              description="HostFi integrates with property management systems (Guesty, Hostaway, OwnerRez), detects anomalies in your expenses, and handles the owner vs. arbitrage distinction for taxes. Landlord Studio is built for traditional landlords with long-term leases — it doesn't understand STR complexity."
            />
            <DifferenceCard
              title="Better Free Tier"
              description="HostFi is completely free for up to 3 properties with all features. Landlord Studio only offers a 14-day trial, then it's $12/month. If you have 1-3 properties, HostFi costs nothing."
            />
          </div>
        </div>

        {/* Who Should Use What */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Who Should Use What?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Choose Landlord Studio if you...</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>• Only have long-term rental properties</li>
                <li>• Want a mobile-first experience today</li>
                <li>• Don't need AI categorization</li>
                <li>• Are comfortable with manual tax prep</li>
                <li>• Don't use a PMS</li>
              </ul>
            </div>
            <div className="border-2 border-teal-200 bg-teal-50/30 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Choose HostFi if you...</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>• Run Airbnb, VRBO, or other STR properties</li>
                <li>• Want AI to categorize and map expenses</li>
                <li>• Need automatic Schedule E preparation</li>
                <li>• Do rental arbitrage (not just ownership)</li>
                <li>• Use Guesty, Hostaway, or OwnerRez</li>
                <li>• Want a real free tier, not just a trial</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Price Comparison */}
        <div className="bg-gray-50 rounded-xl p-6 mb-12">
          <h3 className="font-semibold text-gray-900 mb-4">Price Breakdown</h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <p className="font-medium text-gray-900 mb-2">HostFi</p>
              <ul className="space-y-1 text-gray-600">
                <li>• Free: 3 properties, all features</li>
                <li>• Pro ($15/mo): 10 properties</li>
                <li>• Business ($49/mo): Unlimited</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-gray-900 mb-2">Landlord Studio</p>
              <ul className="space-y-1 text-gray-600">
                <li>• 14-day free trial only</li>
                <li>• $12/month after trial</li>
                <li>• Limited features vs HostFi</li>
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
            <span className="text-gray-500">Landlord Studio:</span>
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
