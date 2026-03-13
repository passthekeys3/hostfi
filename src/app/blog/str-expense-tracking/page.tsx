import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "How to Track STR Expenses for Schedule E | HostFi",
  description: "A practical guide to tracking short-term rental expenses for IRS Schedule E. Learn which expenses are deductible, how to categorize them, and how to avoid common mistakes at tax time.",
  alternates: { canonical: "https://hostfi.ai/blog/str-expense-tracking" },
  openGraph: {
    title: "How to Track STR Expenses for Schedule E",
    description: "A practical guide to tracking short-term rental expenses for IRS Schedule E.",
    url: "https://hostfi.ai/blog/str-expense-tracking",
  },
};

export default function STRExpenseTrackingPage() {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "How to Track STR Expenses for Schedule E",
    datePublished: "2026-02-16",
    dateModified: "2026-02-17",
    author: { "@type": "Organization", name: "HostFi Team" },
    publisher: {
      "@type": "Organization",
      name: "HostFi",
      logo: { "@type": "ImageObject", url: "https://hostfi.ai/logo.svg" },
    },
    url: "https://hostfi.ai/blog/str-expense-tracking",
    image: "https://hostfi.ai/og-image.png",
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://hostfi.ai" },
      { "@type": "ListItem", position: 2, name: "Blog", item: "https://hostfi.ai/blog" },
      { "@type": "ListItem", position: 3, name: "How to Track STR Expenses for Schedule E", item: "https://hostfi.ai/blog/str-expense-tracking" },
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
          How to Track STR Expenses for Schedule E
        </h1>
        <p className="text-gray-500 text-sm mb-12">Updated February 2026 · 8 min read</p>

        <div className="prose prose-gray max-w-none text-[15px] leading-relaxed space-y-6">
          <p>
            If you own or operate short-term rentals, you already know the money side can get messy fast. Between cleaning fees, maintenance calls, insurance, and platform payouts, keeping track of what you spent (and where) is a job in itself.
          </p>
          <p>
            The problem is, the IRS doesn't care how busy you are. When tax season hits, they want everything organized on Schedule E, broken down by property, with the right amounts on the right lines. And if you're doing it manually with spreadsheets or shoeboxes of receipts, you're leaving money on the table or setting yourself up for trouble.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">What Is Schedule E?</h2>
          <p>
            Schedule E (Supplemental Income and Loss) is the IRS form where you report income and expenses from rental properties. Each property gets its own column, and each type of expense has a specific line:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Line 5:</strong> Advertising (listing fees, photography)</li>
            <li><strong>Line 6:</strong> Auto and travel (mileage to check on properties)</li>
            <li><strong>Line 7:</strong> Cleaning and maintenance</li>
            <li><strong>Line 8:</strong> Commissions (property management fees)</li>
            <li><strong>Line 9:</strong> Insurance</li>
            <li><strong>Line 10:</strong> Legal and professional fees</li>
            <li><strong>Line 12:</strong> Mortgage interest paid (owners)</li>
            <li><strong>Line 13:</strong> Repairs</li>
            <li><strong>Line 14:</strong> Rent paid to landlord (arbitrage operators)</li>
            <li><strong>Line 16:</strong> Taxes (property taxes)</li>
            <li><strong>Line 17:</strong> Utilities</li>
            <li><strong>Line 19:</strong> Other (supplies, subscriptions, software)</li>
          </ul>
          <p>
            If you have more than 3 properties, you'll need additional Schedule E forms. And every dollar needs to be assigned to the correct property and the correct line. This is where most operators slip up.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">The Most Common Mistakes</h2>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">1. Lumping Everything Together</h3>
          <p>
            "I'll just total it up at the end of the year" is the most expensive sentence in rental property management. When you don't categorize expenses as they happen, you inevitably miss deductions. That $200 locksmith call, the $45/month pest control, the new smoke detectors — they all add up, and they're all deductible.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">2. Mixing Personal and Business Expenses</h3>
          <p>
            If you use the same credit card for groceries and property supplies, you're making your accountant's life harder (and more expensive). Separate accounts for rental expenses is the single best thing you can do for clean books.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">3. Not Keeping Receipts</h3>
          <p>
            The IRS can ask for documentation on any deduction. "I think I spent about $500 on cleaning supplies" won't cut it in an audit. You need receipts, invoices, or bank statements that match your reported numbers.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">4. Wrong Line Items</h3>
          <p>
            Putting mortgage interest on the "Other" line instead of Line 12, or categorizing a repair as an improvement (which must be depreciated) — these mistakes can trigger questions or cost you deductions.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">A Better System</h2>
          <p>
            The operators who make tax time painless share a few habits:
          </p>
          <ol className="list-decimal pl-6 space-y-3">
            <li><strong>Categorize as you go.</strong> Every expense gets tagged with a property and a category the day it happens. Not at the end of the month, not at tax time.</li>
            <li><strong>Scan receipts immediately.</strong> Take a photo the moment you get a receipt. Paper fades, gets lost, goes through the wash.</li>
            <li><strong>Use dedicated accounts.</strong> One bank account or credit card per property (or at minimum, one for all rental expenses separate from personal).</li>
            <li><strong>Review monthly.</strong> A 15-minute monthly review catches miscategorizations, missing entries, and unusual charges before they become problems.</li>
            <li><strong>Export quarterly.</strong> Don't wait until April. Pull a summary every quarter so tax prep is just combining four reports.</li>
          </ol>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">Owners vs. Arbitrage Operators</h2>
          <p>
            One critical distinction that trips people up: if you <strong>own</strong> the property, your mortgage payment splits into interest (Line 12, deductible) and principal (not deductible). If you're doing <strong>rental arbitrage</strong> (renting a property long-term and subletting on Airbnb), your lease payment goes on Line 14 as rent paid.
          </p>
          <p>
            This is a meaningful difference for tax purposes, and your tracking system needs to handle both scenarios correctly.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">How HostFi Handles This</h2>
          <p>
            We built HostFi specifically for this problem. Here's how it works:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>12 expense categories</strong> that map directly to Schedule E line items</li>
            <li><strong>Owner vs. arbitrage distinction</strong> per property, so mortgage and rent route to the correct lines</li>
            <li><strong>AI receipt scanning</strong> — snap a photo, and the expense is categorized and assigned automatically</li>
            <li><strong>Email bill parsing</strong> — forward bills to your HostFi inbox and they're extracted and categorized</li>
            <li><strong>Tax prep export</strong> — one click generates a Schedule E summary organized exactly how your CPA needs it</li>
            <li><strong>Per-property P&L</strong> — know exactly how each property is performing</li>
          </ul>
          <p>
            It's free for up to 3 properties. No credit card required.
          </p>

          {/* CTA */}
          <div className="mt-12 p-8 bg-gray-50 rounded-2xl border border-gray-100 text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Stop Dreading Tax Season</h3>
            <p className="text-gray-500 text-sm mb-6">Join property operators who track expenses in minutes, not hours.</p>
            <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-medium rounded-xl text-sm hover:bg-gray-800 transition-colors">
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="mt-10 pt-8 border-t border-gray-200">
            <p className="text-sm font-semibold text-gray-900 mb-3">Related Reading</p>
            <div className="space-y-2">
              <Link href="/blog/schedule-e-guide" className="block text-sm text-teal-600 hover:text-teal-700 font-medium">
                Schedule E for Rental Properties: The Complete 2026 Guide →
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
              <Link href="/compare/baselane" className="block text-sm text-teal-600 hover:text-teal-700 font-medium">
                HostFi vs Baselane →
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
