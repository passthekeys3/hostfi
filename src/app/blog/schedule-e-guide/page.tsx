import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Schedule E for Rental Properties: The Complete 2026 Guide | HostFi",
  description: "Everything rental property owners and STR operators need to know about IRS Schedule E. Line-by-line breakdown, common deductions, and how to avoid audit triggers.",
  alternates: { canonical: "https://hostfi.ai/blog/schedule-e-guide" },
  openGraph: {
    title: "Schedule E for Rental Properties: The Complete 2026 Guide",
    description: "Line-by-line breakdown of Schedule E for rental property owners and STR operators.",
    url: "https://hostfi.ai/blog/schedule-e-guide",
  },
};

export default function ScheduleEGuidePage() {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Schedule E for Rental Properties: The Complete 2026 Guide",
    datePublished: "2026-02-16",
    dateModified: "2026-02-17",
    author: { "@type": "Organization", name: "HostFi Team" },
    publisher: {
      "@type": "Organization",
      name: "HostFi",
      logo: { "@type": "ImageObject", url: "https://hostfi.ai/logo.svg" },
    },
    url: "https://hostfi.ai/blog/schedule-e-guide",
    image: "https://hostfi.ai/og-image.png",
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://hostfi.ai" },
      { "@type": "ListItem", position: 2, name: "Blog", item: "https://hostfi.ai/blog" },
      { "@type": "ListItem", position: 3, name: "Schedule E for Rental Properties: The Complete 2026 Guide", item: "https://hostfi.ai/blog/schedule-e-guide" },
    ],
  };

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {/* Nav */}
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
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-8 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to HostFi
        </Link>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-4">
          Schedule E for Rental Properties: The Complete 2026 Guide
        </h1>
        <p className="text-gray-500 text-sm mb-12">Updated February 2026 · 12 min read</p>

        <div className="prose prose-gray max-w-none text-[15px] leading-relaxed space-y-6">
          <p>
            Whether you own one rental house or run a portfolio of short-term rentals, Schedule E is where the IRS wants to see your numbers. It's not complicated once you understand the layout, but getting it wrong can mean overpaying taxes or raising red flags.
          </p>
          <p>
            This guide walks through every section that matters for rental property operators, with specific notes for both traditional landlords and STR/Airbnb hosts.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">Who Files Schedule E?</h2>
          <p>
            Anyone who receives rental income from real estate files Schedule E as part of their Form 1040. This includes:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Traditional landlords (long-term rentals)</li>
            <li>Short-term rental operators (Airbnb, VRBO, Furnished Finder)</li>
            <li>Rental arbitrage operators (leasing then subletting)</li>
            <li>Vacation rental owners</li>
            <li>Property managers reporting on behalf of owners</li>
          </ul>
          <p>
            <strong>Important exception:</strong> If your average rental period is 7 days or less AND you provide substantial services (daily cleaning, concierge, meals), the IRS may classify your income as active business income on Schedule C instead. Most Airbnb hosts still file Schedule E, but check with your CPA if you're running a hotel-like operation.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">Part I: Income and Expenses (Lines 1-21)</h2>
          <p>
            This is where all the action happens. Each property gets its own column (up to 3 per form, use additional forms for more properties).
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-8 mb-3">Income (Lines 3-4)</h3>
          <p>
            <strong>Line 3 — Rents Received:</strong> Total rental income for the year. For Airbnb/VRBO hosts, this is your gross booking revenue (what guests paid, including cleaning fees). The platform's service fee is NOT subtracted here — that's an expense on Line 19.
          </p>
          <p>
            <strong>Line 4 — Royalties Received:</strong> Not applicable for most rental operators. Skip this.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-8 mb-3">Expenses (Lines 5-19)</h3>
          <p>
            This is where proper categorization saves you money. Every line is a specific deduction category:
          </p>

          <div className="overflow-x-auto my-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 pr-4 font-semibold text-gray-900">Line</th>
                  <th className="text-left py-3 pr-4 font-semibold text-gray-900">Category</th>
                  <th className="text-left py-3 font-semibold text-gray-900">Common Examples for STR Operators</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr><td className="py-2.5 pr-4 text-gray-500">5</td><td className="py-2.5 pr-4">Advertising</td><td className="py-2.5 text-gray-600">Listing photography, Furnished Finder subscription, direct booking site</td></tr>
                <tr><td className="py-2.5 pr-4 text-gray-500">6</td><td className="py-2.5 pr-4">Auto and Travel</td><td className="py-2.5 text-gray-600">Mileage to properties, flights for property checks (if out of state)</td></tr>
                <tr><td className="py-2.5 pr-4 text-gray-500">7</td><td className="py-2.5 pr-4">Cleaning and Maintenance</td><td className="py-2.5 text-gray-600">Turnover cleaning, lawn care, HVAC service, pest control</td></tr>
                <tr><td className="py-2.5 pr-4 text-gray-500">8</td><td className="py-2.5 pr-4">Commissions</td><td className="py-2.5 text-gray-600">Property management fees (typically 20-30% for STRs)</td></tr>
                <tr><td className="py-2.5 pr-4 text-gray-500">9</td><td className="py-2.5 pr-4">Insurance</td><td className="py-2.5 text-gray-600">Landlord policy, STR-specific insurance (Proper, CBIZ), umbrella</td></tr>
                <tr><td className="py-2.5 pr-4 text-gray-500">10</td><td className="py-2.5 pr-4">Legal and Professional</td><td className="py-2.5 text-gray-600">CPA fees, attorney, LLC formation, permit applications</td></tr>
                <tr><td className="py-2.5 pr-4 text-gray-500">11</td><td className="py-2.5 pr-4">Management Fees</td><td className="py-2.5 text-gray-600">PMS software (Guesty, Hospitable), channel manager fees</td></tr>
                <tr><td className="py-2.5 pr-4 text-gray-500">12</td><td className="py-2.5 pr-4">Mortgage Interest</td><td className="py-2.5 text-gray-600">Interest portion of mortgage payment (owners only, from Form 1098)</td></tr>
                <tr><td className="py-2.5 pr-4 text-gray-500">13</td><td className="py-2.5 pr-4">Repairs</td><td className="py-2.5 text-gray-600">Plumbing fix, appliance repair, drywall patch, lock replacement</td></tr>
                <tr><td className="py-2.5 pr-4 text-gray-500">14</td><td className="py-2.5 pr-4">Rent Paid</td><td className="py-2.5 text-gray-600">Monthly lease payment (arbitrage operators only)</td></tr>
                <tr><td className="py-2.5 pr-4 text-gray-500">15</td><td className="py-2.5 pr-4">Supplies</td><td className="py-2.5 text-gray-600">Linens, toiletries, coffee, kitchen supplies, welcome gifts</td></tr>
                <tr><td className="py-2.5 pr-4 text-gray-500">16</td><td className="py-2.5 pr-4">Taxes</td><td className="py-2.5 text-gray-600">Property tax, occupancy/hotel tax, business license fee</td></tr>
                <tr><td className="py-2.5 pr-4 text-gray-500">17</td><td className="py-2.5 pr-4">Utilities</td><td className="py-2.5 text-gray-600">Electric, gas, water, sewer, trash, internet, cable</td></tr>
                <tr><td className="py-2.5 pr-4 text-gray-500">18</td><td className="py-2.5 pr-4">Depreciation</td><td className="py-2.5 text-gray-600">Building value / 27.5 years (owners), furniture / 5-7 years</td></tr>
                <tr><td className="py-2.5 pr-4 text-gray-500">19</td><td className="py-2.5 pr-4">Other</td><td className="py-2.5 text-gray-600">Platform fees (Airbnb 3%), smart locks, security cameras, HostFi subscription</td></tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">Repairs vs. Improvements: The Most Expensive Mistake</h2>
          <p>
            This is the single biggest area where rental operators get it wrong. The distinction matters because:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Repairs</strong> are fully deductible in the year they happen (Line 13)</li>
            <li><strong>Improvements</strong> must be depreciated over 27.5 years (Line 18)</li>
          </ul>
          <p>
            A <strong>repair</strong> restores something to its original condition. Fixing a leaky faucet, patching drywall, replacing a broken window.
          </p>
          <p>
            An <strong>improvement</strong> adds value, extends the life, or adapts the property to a new use. New roof, kitchen remodel, adding a bathroom, converting a garage to a bedroom.
          </p>
          <p>
            The gray area is real. Replacing one broken appliance is a repair. Replacing ALL appliances as part of a renovation is likely an improvement. When in doubt, document your reasoning and discuss with your CPA.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">STR-Specific Deductions People Miss</h2>
          <ol className="list-decimal pl-6 space-y-3">
            <li><strong>Platform service fees.</strong> Airbnb charges hosts 3%. VRBO charges more. These are deductible on Line 19.</li>
            <li><strong>Photography.</strong> Professional photos for your listing are advertising expenses (Line 5).</li>
            <li><strong>Smart home devices.</strong> Smart locks, thermostats, noise monitors, security cameras — all deductible as supplies or other expenses.</li>
            <li><strong>Guest supplies.</strong> Everything you provide guests — toiletries, coffee, snacks, linens — is deductible on Line 15.</li>
            <li><strong>Software subscriptions.</strong> PMS tools, pricing software (PriceLabs, Wheelhouse), accounting tools, HostFi — Line 19.</li>
            <li><strong>Travel to properties.</strong> If you drive to check on or maintain properties, that mileage is deductible at 70 cents/mile (2026 rate) on Line 6.</li>
            <li><strong>Home office.</strong> If you manage your STR business from home, a portion of your home expenses may be deductible (this goes on Schedule C, not Schedule E).</li>
          </ol>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">Audit Red Flags to Avoid</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Reporting a loss every year.</strong> The IRS gets suspicious if your rental properties never turn a profit. Make sure your expenses are legitimate and well-documented.</li>
            <li><strong>Round numbers.</strong> "$5,000 for repairs" looks estimated. "$4,847.23 for repairs" looks real. Track to the penny.</li>
            <li><strong>No documentation.</strong> Keep receipts, invoices, and bank statements for at least 3 years (7 if you want to be safe).</li>
            <li><strong>Large repair deductions.</strong> A $15,000 "repair" will likely get scrutinized. Make sure you can prove it wasn't an improvement.</li>
            <li><strong>Personal use days.</strong> If you use the property personally for more than 14 days OR 10% of rental days, your deductions get limited. Track personal use carefully.</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">How to Make This Painless</h2>
          <p>
            The operators who spend 15 minutes at tax time instead of 15 hours all do the same thing: they track expenses as they happen, categorized correctly, assigned to the right property.
          </p>
          <p>
            HostFi does this automatically. Every expense you enter or scan is categorized into the correct Schedule E line item. At tax time, you export a summary report and hand it to your CPA. Done.
          </p>
          <p>
            We handle the owner vs. arbitrage distinction (Line 12 vs. Line 14), separate all 15 expense categories, and flag anything that looks unusual before you file.
          </p>

          {/* CTA */}
          <div className="mt-12 p-8 bg-gray-50 rounded-2xl border border-gray-100 text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Schedule E on Autopilot</h3>
            <p className="text-gray-500 text-sm mb-6">HostFi auto-maps every expense to the correct Schedule E line. Free for up to 3 properties.</p>
            <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-medium rounded-xl text-sm hover:bg-gray-800 transition-colors">
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="mt-10 pt-8 border-t border-gray-200">
            <p className="text-sm font-semibold text-gray-900 mb-3">Related Reading</p>
            <div className="space-y-2">
              <Link href="/blog/str-expense-tracking" className="block text-sm text-teal-600 hover:text-teal-700 font-medium">
                How to Track STR Expenses for Schedule E →
              </Link>
              <Link href="/blog/airbnb-expense-tracker" className="block text-sm text-teal-600 hover:text-teal-700 font-medium">
                Best Airbnb Expense Tracker for Hosts in 2026 →
              </Link>
            </div>
            <p className="text-sm font-semibold text-gray-900 mb-3 mt-6">Compare Tools</p>
            <div className="space-y-2">
              <Link href="/compare/stessa" className="block text-sm text-teal-600 hover:text-teal-700 font-medium">
                HostFi vs Stessa →
              </Link>
              <Link href="/compare/buildium" className="block text-sm text-teal-600 hover:text-teal-700 font-medium">
                HostFi vs Buildium →
              </Link>
              <Link href="/compare" className="block text-sm text-teal-600 hover:text-teal-700 font-medium">
                See All Comparisons →
              </Link>
            </div>
          </div>
        </div>
      </article>

      {/* Footer */}
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
