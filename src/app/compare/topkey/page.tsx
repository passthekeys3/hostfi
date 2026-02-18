import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";

export const metadata: Metadata = {
  title: "HostFi vs Topkey: Best STR Expense Tracker 2026 | HostFi",
  description: "Compare HostFi and Topkey for rental property expense tracking. See why solo hosts and small operators choose HostFi over enterprise-focused Topkey.",
  alternates: { canonical: "https://hostfi.ai/compare/topkey" },
  openGraph: {
    title: "HostFi vs Topkey: Best STR Expense Tracker 2026",
    description: "Compare HostFi and Topkey for rental property expense tracking. See why solo hosts choose HostFi.",
    url: "https://hostfi.ai/compare/topkey",
  },
};

export default function CompareTopkeyPage() {
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
            HostFi vs Topkey
          </h1>
          <p className="text-gray-600 text-lg leading-relaxed max-w-2xl">
            Topkey is built for enterprise property management companies. HostFi is built for independent STR operators. Here's why that matters.
          </p>
        </div>

        {/* Quick Summary */}
        <div className="bg-gray-50 rounded-2xl p-6 mb-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">The Quick Version</h2>
          <p className="text-gray-600 leading-relaxed">
            <strong>Topkey</strong> is enterprise financial infrastructure for large property management companies. Banking, corporate cards, trust accounting, owner disbursements — the full back-office stack. Designed for companies managing $25K+ in properties with dedicated finance teams. No free tier, enterprise pricing.
          </p>
          <p className="text-gray-600 leading-relaxed mt-3">
            <strong>HostFi</strong> is built for independent hosts and small operators running 3-50 properties. AI-powered expense tracking, automatic Schedule E mapping, and tools designed for the person doing everything themselves. Free tier for up to 3 properties.
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
              <div className="px-4 py-3 font-semibold text-gray-900 text-center">Topkey</div>
            </div>

            <FeatureRow feature="Free Tier" hostfi="3 properties" competitor={false} />
            <FeatureRow feature="Pricing" hostfi="$0-49/mo" competitor="Enterprise ($$$)" />
            <FeatureRow feature="Target User" hostfi="Solo hosts, small operators" competitor="Large PM companies" />
            <FeatureRow feature="AI Receipt Scanning" hostfi={true} competitor={false} />
            <FeatureRow feature="AI Bill Parsing" hostfi={true} competitor={false} />
            <FeatureRow feature="Schedule E Auto-Mapping" hostfi={true} competitor={false} />
            <FeatureRow feature="Arbitrage Support" hostfi={true} competitor={false} />
            <FeatureRow feature="Ask AI Assistant" hostfi={true} competitor={false} />
            <FeatureRow feature="Banking & Cards" hostfi={false} competitor={true} />
            <FeatureRow feature="Trust Accounting" hostfi={false} competitor={true} />
            <FeatureRow feature="Owner Disbursements" hostfi={false} competitor={true} />
            <FeatureRow feature="Setup Complexity" hostfi="5 minutes" competitor="Weeks/months" isLast />
          </div>
        </div>

        {/* Key Differences */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Key Differences</h2>
          <div className="space-y-6">
            <DifferenceCard
              title="Built for Different Scales"
              description="Topkey is financial infrastructure for property management companies with CFOs, accountants, and dedicated back-office staff. If you're a solo host or small operator doing your own books, Topkey is overkill — expensive, complex, and designed for problems you don't have."
            />
            <DifferenceCard
              title="Actually Affordable"
              description="HostFi is free for up to 3 properties, $15/month for Pro, $49/month for Business. Topkey doesn't publish pricing because it's enterprise — expect to pay thousands per month and go through a sales process. Most independent hosts don't need (or want) that."
            />
            <DifferenceCard
              title="AI-First Approach"
              description="HostFi uses AI to automatically categorize expenses, parse bills from email, and map everything to Schedule E. Topkey focuses on banking infrastructure and financial controls — powerful for enterprises, but not the AI automation solo operators need."
            />
            <DifferenceCard
              title="Self-Service vs Enterprise Sales"
              description="You can sign up for HostFi in 2 minutes and start tracking expenses immediately. Topkey requires demos, onboarding calls, integration work, and typically weeks to get fully set up. If you just want to track expenses and get ready for taxes, HostFi is the faster path."
            />
          </div>
        </div>

        {/* Who Should Use What */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Who Should Use What?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Consider Topkey if you...</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>• Manage 100+ properties for multiple owners</li>
                <li>• Need trust accounting and owner disbursements</li>
                <li>• Want corporate cards for your team</li>
                <li>• Have a dedicated finance department</li>
                <li>• Can afford enterprise pricing</li>
              </ul>
            </div>
            <div className="border-2 border-teal-200 bg-teal-50/30 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Choose HostFi if you...</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>• Run 1-50 STR properties yourself</li>
                <li>• Want expense tracking that just works</li>
                <li>• Need Schedule E automation for taxes</li>
                <li>• Don't want enterprise complexity</li>
                <li>• Value AI automation over banking features</li>
                <li>• Want to start free and upgrade as you grow</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Honest Take */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-12">
          <h3 className="font-semibold text-gray-900 mb-2">The Honest Take</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            Topkey is genuinely excellent software — for enterprise property management companies. If you have a finance team, manage properties for dozens of owners, and need banking/cards/trust accounting, it's a great choice. But if you're reading this comparison, you're probably not that person. For independent STR operators who want AI-powered expense tracking without enterprise complexity, HostFi is the better fit.
          </p>
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
            <span className="text-gray-500">Topkey:</span>
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
