import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Rental Arbitrage Expense Guide: What to Track and How to Deduct | HostFi",
  description: "Complete guide to tracking expenses for Airbnb rental arbitrage. Which costs are deductible, how to handle rent payments on Schedule E, and common mistakes that cost operators money.",
  alternates: { canonical: "https://hostfi.ai/blog/rental-arbitrage-expenses" },
  openGraph: {
    title: "Rental Arbitrage Expense Guide: What to Track and How to Deduct",
    description: "Everything arbitrage operators need to know about expense tracking and tax deductions.",
    url: "https://hostfi.ai/blog/rental-arbitrage-expenses",
  },
};

export default function RentalArbitrageExpensesPage() {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Rental Arbitrage Expense Guide: What to Track and How to Deduct",
    datePublished: "2026-03-13",
    dateModified: "2026-03-13",
    author: { "@type": "Organization", name: "HostFi Team" },
    publisher: { "@type": "Organization", name: "HostFi", logo: { "@type": "ImageObject", url: "https://hostfi.ai/logo.svg" } },
    url: "https://hostfi.ai/blog/rental-arbitrage-expenses",
    image: "https://hostfi.ai/og-image.png",
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://hostfi.ai" },
      { "@type": "ListItem", position: 2, name: "Blog", item: "https://hostfi.ai/blog" },
      { "@type": "ListItem", position: 3, name: "Rental Arbitrage Expense Guide", item: "https://hostfi.ai/blog/rental-arbitrage-expenses" },
    ],
  };

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <header className="border-b border-gray-100 px-5 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="HostFi" className="w-8 h-8" />
            <span className="text-lg font-bold text-gray-900">HostFi</span>
          </Link>
          <Link href="/login" className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
            Get Started Free
          </Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-5 py-16">
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-8 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> All Posts
        </Link>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-4">
          Rental Arbitrage Expense Guide: What to Track and How to Deduct
        </h1>
        <p className="text-gray-500 text-sm mb-12">March 2026 · 11 min read</p>

        <div className="prose prose-gray max-w-none text-[15px] leading-relaxed space-y-6">
          <p>
            Rental arbitrage is a different animal from owning property. You're leasing a unit long-term, furnishing it, and subletting it on Airbnb or VRBO. The business model works when your nightly revenue exceeds your rent plus operating costs. But the expense profile is completely different from a property owner's, and most accounting tools don't handle it correctly.
          </p>
          <p>
            This guide covers exactly what expenses arbitrage operators deal with, how they're categorized for taxes, and the mistakes that cost operators money.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">How Arbitrage Expenses Differ From Owner Expenses</h2>
          <p>
            The fundamental difference: you don't own the property. That changes everything about your tax treatment.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>No mortgage interest deduction</strong> (Line 12) -- you don't have a mortgage</li>
            <li><strong>No property tax deduction</strong> (Line 17) -- your landlord pays those</li>
            <li><strong>No depreciation on the building</strong> (Line 19) -- you don't own it</li>
            <li><strong>Rent paid IS deductible</strong> (Line 14) -- this is your biggest expense and it goes here</li>
            <li><strong>Furniture depreciation</strong> -- you bought the furniture, so you CAN depreciate it (5-7 years)</li>
          </ul>
          <p>
            Most expense trackers treat all rental operators the same. If your software puts your rent payment on Line 12 (mortgage interest), you're filing incorrectly. That's an audit risk.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">The Complete Arbitrage Expense List</h2>

          <h3 className="text-lg font-semibold text-gray-900 mt-8 mb-3">Startup Costs (One-Time)</h3>
          <p>These hit hard in month one but are generally deductible (some must be amortized over 15 years if total startup costs exceed $5,000):</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Security deposit (not deductible -- it's a refundable deposit, not an expense)</li>
            <li>First and last month's rent (deductible as paid)</li>
            <li>Furniture and decor ($3,000-8,000 per unit, depreciate over 5-7 years or Section 179)</li>
            <li>Kitchen setup (cookware, dishes, utensils, appliances)</li>
            <li>Linens and towels (initial purchase)</li>
            <li>Smart lock installation</li>
            <li>Professional photography ($200-500)</li>
            <li>LLC formation and business licenses</li>
          </ul>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 my-8">
            <p className="text-sm text-blue-800">
              <strong>Section 179 tip:</strong> If you buy furniture for a rental unit, you can often deduct the full cost in year one using Section 179 instead of depreciating over 5-7 years. This is a significant tax advantage for arbitrage operators furnishing new units. Talk to your CPA about whether this makes sense for your situation.
            </p>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mt-8 mb-3">Monthly Fixed Costs</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Rent</strong> -- your largest expense, typically 40-60% of gross revenue. Deducted on Schedule E Line 14</li>
            <li><strong>Utilities</strong> -- electricity, gas, water, internet. Some leases include utilities, some don't</li>
            <li><strong>Insurance</strong> -- STR-specific liability insurance ($50-150/month per unit)</li>
            <li><strong>Software subscriptions</strong> -- PMS, channel manager, pricing tool, expense tracker</li>
            <li><strong>WiFi</strong> -- non-negotiable for Airbnb guests</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-900 mt-8 mb-3">Per-Stay Variable Costs</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Cleaning</strong> -- $80-200 per turnover depending on unit size and market</li>
            <li><strong>Laundry</strong> -- if you outsource linen service, $15-30 per set</li>
            <li><strong>Consumables</strong> -- toiletries, coffee, paper goods ($5-15 per stay)</li>
            <li><strong>Platform fees</strong> -- Airbnb 3% host fee, VRBO variable</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-900 mt-8 mb-3">Occasional/Maintenance Costs</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>Furniture replacement (wear from guests)</li>
            <li>Appliance repair</li>
            <li>Lock replacement or rekeying</li>
            <li>Touch-up paint</li>
            <li>Carpet cleaning or replacement</li>
            <li>Guest damage not covered by platform insurance</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">Arbitrage Unit Economics Example</h2>
          <p>Here's what a typical arbitrage unit in a mid-tier market looks like monthly:</p>

          <div className="overflow-x-auto my-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 pr-4 font-semibold text-gray-900">Category</th>
                  <th className="text-right py-3 pl-4 font-semibold text-gray-900">Monthly</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr><td className="py-2.5 pr-4 text-gray-600">Gross Revenue (Airbnb + VRBO)</td><td className="py-2.5 pl-4 text-right font-medium text-teal-600">$4,500</td></tr>
                <tr><td className="py-2.5 pr-4 text-gray-600">Rent</td><td className="py-2.5 pl-4 text-right text-red-500">-$2,200</td></tr>
                <tr><td className="py-2.5 pr-4 text-gray-600">Cleaning (15 turnovers x $120)</td><td className="py-2.5 pl-4 text-right text-red-500">-$1,800</td></tr>
                <tr><td className="py-2.5 pr-4 text-gray-600">Platform fees (3%)</td><td className="py-2.5 pl-4 text-right text-red-500">-$135</td></tr>
                <tr><td className="py-2.5 pr-4 text-gray-600">Utilities</td><td className="py-2.5 pl-4 text-right text-red-500">-$250</td></tr>
                <tr><td className="py-2.5 pr-4 text-gray-600">Insurance</td><td className="py-2.5 pl-4 text-right text-red-500">-$100</td></tr>
                <tr><td className="py-2.5 pr-4 text-gray-600">Supplies & consumables</td><td className="py-2.5 pl-4 text-right text-red-500">-$75</td></tr>
                <tr><td className="py-2.5 pr-4 text-gray-600">Software (PMS, pricing, etc.)</td><td className="py-2.5 pl-4 text-right text-red-500">-$50</td></tr>
                <tr className="border-t-2 border-gray-300"><td className="py-2.5 pr-4 font-semibold text-gray-900">Net Profit Before Tax</td><td className="py-2.5 pl-4 text-right font-bold text-gray-900">-$110</td></tr>
              </tbody>
            </table>
          </div>

          <p>
            That example shows a break-even/slightly negative month, which is common when you factor in cleaning at every turnover. The math only works with high occupancy (85%+) and optimized pricing. This is exactly why tracking every expense matters -- you need to know your true per-unit economics to decide whether to keep or exit a unit.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">Common Arbitrage Tax Mistakes</h2>
          <ol className="list-decimal pl-6 space-y-3">
            <li><strong>Putting rent on Line 12</strong> -- Line 12 is mortgage interest. Rent goes on Line 14. Using the wrong line tells the IRS you own the property when you don't.</li>
            <li><strong>Deducting the security deposit</strong> -- A refundable security deposit is not an expense. It's an asset you'll get back (hopefully). Don't deduct it.</li>
            <li><strong>Missing furniture depreciation</strong> -- You can't deduct building depreciation (you don't own it), but you CAN depreciate the furniture you bought. Many arbitrage operators forget this.</li>
            <li><strong>Not tracking per-unit P&L</strong> -- If one unit is bleeding money, you need to know immediately. Aggregate numbers hide underperformers.</li>
            <li><strong>Commingling personal and business accounts</strong> -- This makes expense tracking a nightmare and is an audit flag. Use a separate bank account and credit card for each unit or at minimum for the business.</li>
          </ol>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">How to Track Arbitrage Expenses</h2>
          <p>
            The challenge with arbitrage is volume. You might have 5-10 units, each generating 15-20 bookings per month. That's 75-200 cleaning transactions alone, plus utilities, rent payments, supplies, and maintenance. Spreadsheets fall apart fast.
          </p>
          <p>
            What you need:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Automatic categorization (so you're not manually sorting 200+ transactions monthly)</li>
            <li>Per-property P&L (to spot underperforming units)</li>
            <li>Arbitrage-specific tax mapping (Line 14 for rent, not Line 12)</li>
            <li>Receipt capture (for cleaning, supplies, and maintenance receipts)</li>
            <li>PMS integration (to pull revenue data automatically)</li>
          </ul>

          <div className="mt-12 p-8 bg-gray-50 rounded-2xl border border-gray-100 text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Built for Arbitrage Operators</h3>
            <p className="text-gray-500 text-sm mb-6">HostFi auto-maps rent to Line 14 and handles arbitrage tax treatment correctly. Free for up to 3 properties.</p>
            <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-medium rounded-xl text-sm hover:bg-gray-800 transition-colors">
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="mt-10 pt-8 border-t border-gray-200">
            <p className="text-sm font-semibold text-gray-900 mb-3">Related Reading</p>
            <div className="space-y-2">
              <Link href="/blog/airbnb-tax-deductions" className="block text-sm text-teal-600 hover:text-teal-700 font-medium">
                Airbnb Tax Deductions: Complete List for 2026 →
              </Link>
              <Link href="/blog/schedule-e-guide" className="block text-sm text-teal-600 hover:text-teal-700 font-medium">
                Schedule E for Rental Properties: The Complete 2026 Guide →
              </Link>
              <Link href="/blog/str-expense-tracking" className="block text-sm text-teal-600 hover:text-teal-700 font-medium">
                How to Track STR Expenses for Schedule E →
              </Link>
            </div>
            <p className="text-sm font-semibold text-gray-900 mb-3 mt-6">Compare Tools</p>
            <div className="space-y-2">
              <Link href="/compare/stessa" className="block text-sm text-teal-600 hover:text-teal-700 font-medium">
                HostFi vs Stessa →
              </Link>
              <Link href="/compare" className="block text-sm text-teal-600 hover:text-teal-700 font-medium">
                See All Comparisons →
              </Link>
            </div>
          </div>
        </div>
      </article>

      <footer className="border-t border-gray-100 px-5 py-8">
        <div className="max-w-3xl mx-auto flex items-center justify-between text-xs text-gray-400">
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
