import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "How to Calculate True Profit Per STR Property | HostFi",
  description: "Most Airbnb hosts don't know their real profit per property. Here's how to calculate it correctly, including hidden costs most operators miss.",
  alternates: { canonical: "https://hostfi.ai/blog/str-profit-per-property" },
  openGraph: {
    title: "How to Calculate True Profit Per STR Property",
    description: "Calculate your real Airbnb profit per property. Revenue minus ALL costs, not just the obvious ones.",
    url: "https://hostfi.ai/blog/str-profit-per-property",
  },
};

export default function STRProfitPerPropertyPage() {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "How to Calculate True Profit Per STR Property",
    datePublished: "2026-03-13",
    dateModified: "2026-03-13",
    author: { "@type": "Organization", name: "HostFi Team" },
    publisher: { "@type": "Organization", name: "HostFi", logo: { "@type": "ImageObject", url: "https://hostfi.ai/logo.svg" } },
    url: "https://hostfi.ai/blog/str-profit-per-property",
    image: "https://hostfi.ai/og-image.png",
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://hostfi.ai" },
      { "@type": "ListItem", position: 2, name: "Blog", item: "https://hostfi.ai/blog" },
      { "@type": "ListItem", position: 3, name: "How to Calculate True Profit Per STR Property", item: "https://hostfi.ai/blog/str-profit-per-property" },
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
          How to Calculate True Profit Per STR Property
        </h1>
        <p className="text-gray-500 text-sm mb-12">March 2026 · 10 min read</p>

        <div className="prose prose-gray max-w-none text-[15px] leading-relaxed space-y-6">
          <p>
            Ask most Airbnb hosts what their profit margin is and you'll get one of two answers: a vague "pretty good" or a number based on revenue minus mortgage. Neither is real profit.
          </p>
          <p>
            True profit means revenue minus every cost: mortgage or rent, cleaning, utilities, platform fees, insurance, maintenance, supplies, software, depreciation, and your time. When you calculate it correctly, some properties are stars and some are bleeding money. Knowing the difference changes every decision you make.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">The Formula</h2>
          <div className="bg-gray-50 rounded-xl p-6 my-6 font-mono text-sm">
            <p className="text-gray-900 font-semibold">True Profit = Gross Revenue - Platform Fees - Operating Expenses - Fixed Costs - CapEx Reserve</p>
          </div>
          <p>Let's break down each component.</p>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">Gross Revenue</h2>
          <p>This is the total amount guests paid, before any platform fees. Not what hit your bank account. Include:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Nightly rate income from all platforms (Airbnb, VRBO, Booking.com, direct)</li>
            <li>Cleaning fees collected from guests</li>
            <li>Extra guest fees</li>
            <li>Pet fees</li>
            <li>Any other ancillary income</li>
          </ul>
          <p>
            Many hosts use their Airbnb payout as "revenue." That's wrong -- it already has platform fees deducted. Use the gross booking amount so you can see true fee percentages.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">Platform Fees</h2>
          <p>What each platform takes from your bookings:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Airbnb:</strong> 3% host fee (on host-only pricing) or split with guest</li>
            <li><strong>VRBO:</strong> 5% host fee (standard) or 8% if guest doesn't pay a service fee</li>
            <li><strong>Booking.com:</strong> 15% commission (significantly higher)</li>
            <li><strong>Direct bookings:</strong> Payment processor fees (Stripe 2.9% + $0.30)</li>
          </ul>
          <p>
            On $100K gross revenue, platform fees alone can be $3,000-15,000 depending on your channel mix. This is why many operators push for direct bookings.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">Operating Expenses (Variable)</h2>
          <p>These scale with occupancy -- the more guests, the higher these costs:</p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Cleaning</h3>
          <p>
            Typically your largest variable cost. Calculate per-turn: if you pay $130 per clean and have 18 turnovers per month, that's $2,340/month. Some hosts charge guests a cleaning fee that covers this, some don't. Either way, track the actual cost.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Supplies and Consumables</h3>
          <p>
            Toiletries, coffee, paper goods, cleaning supplies for mid-stay cleans. $5-15 per guest stay adds up. At 18 stays/month, that's $90-270/month.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Laundry</h3>
          <p>
            If you outsource linen service: $15-35 per set per turn. If you do it in-unit: detergent, water, electricity, and wear on the machines. Either way, it's a real cost.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">Fixed Costs (Monthly)</h2>
          <p>These stay roughly the same regardless of occupancy:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Mortgage/rent</strong> -- your biggest fixed cost</li>
            <li><strong>Utilities</strong> -- base cost + variable component from guest usage</li>
            <li><strong>Insurance</strong> -- STR-specific liability insurance</li>
            <li><strong>Internet</strong> -- required for guests</li>
            <li><strong>Software</strong> -- PMS, pricing tool, expense tracker, channel manager</li>
            <li><strong>Property taxes</strong> (owners) or HOA fees</li>
            <li><strong>Permits and licenses</strong> -- STR permit, business license</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">The Costs Most Operators Forget</h2>
          <p>
            These are the ones that separate a "pretty good" estimate from actual profit:
          </p>
          <ol className="list-decimal pl-6 space-y-3">
            <li><strong>Furniture replacement reserve.</strong> Guest wear is real. Budget 5-10% of revenue annually for furniture, mattress, and linen replacement.</li>
            <li><strong>Maintenance reserve.</strong> Something breaks every month. Budget $100-200/month per property for repairs.</li>
            <li><strong>Vacancy cost.</strong> Even at 85% occupancy, 15% of the month generates zero revenue. Your mortgage/rent doesn't stop.</li>
            <li><strong>Seasonality.</strong> Don't calculate profit on your best month. Use trailing 12-month averages.</li>
            <li><strong>Your time.</strong> If you're self-managing, your time has value. At 5 hours/week per property and $50/hour equivalent, that's $1,000/month you're "paying" yourself.</li>
            <li><strong>Opportunity cost of capital.</strong> If you put $20K into furnishing a unit, that money could be earning 5% in a HYSA. The $1,000/year you're NOT earning is a real cost of the business.</li>
          </ol>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">Example: True Profit Calculation</h2>
          <p>Here's a real-world example for a 2BR apartment in a mid-tier market:</p>

          <div className="overflow-x-auto my-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 pr-4 font-semibold text-gray-900">Line Item</th>
                  <th className="text-right py-3 pl-4 font-semibold text-gray-900">Monthly</th>
                  <th className="text-right py-3 pl-4 font-semibold text-gray-900">Annual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr><td className="py-2.5 pr-4 font-medium text-gray-900">Gross Revenue</td><td className="py-2.5 pl-4 text-right text-teal-600 font-medium">$5,200</td><td className="py-2.5 pl-4 text-right text-teal-600 font-medium">$62,400</td></tr>
                <tr><td className="py-2.5 pr-4 text-gray-600">Platform fees (3.5% avg)</td><td className="py-2.5 pl-4 text-right text-red-500">-$182</td><td className="py-2.5 pl-4 text-right text-red-500">-$2,184</td></tr>
                <tr><td className="py-2.5 pr-4 text-gray-600">Mortgage</td><td className="py-2.5 pl-4 text-right text-red-500">-$1,800</td><td className="py-2.5 pl-4 text-right text-red-500">-$21,600</td></tr>
                <tr><td className="py-2.5 pr-4 text-gray-600">Cleaning (16 turns x $120)</td><td className="py-2.5 pl-4 text-right text-red-500">-$1,920</td><td className="py-2.5 pl-4 text-right text-red-500">-$23,040</td></tr>
                <tr><td className="py-2.5 pr-4 text-gray-600">Utilities</td><td className="py-2.5 pl-4 text-right text-red-500">-$280</td><td className="py-2.5 pl-4 text-right text-red-500">-$3,360</td></tr>
                <tr><td className="py-2.5 pr-4 text-gray-600">Insurance</td><td className="py-2.5 pl-4 text-right text-red-500">-$120</td><td className="py-2.5 pl-4 text-right text-red-500">-$1,440</td></tr>
                <tr><td className="py-2.5 pr-4 text-gray-600">Supplies</td><td className="py-2.5 pl-4 text-right text-red-500">-$150</td><td className="py-2.5 pl-4 text-right text-red-500">-$1,800</td></tr>
                <tr><td className="py-2.5 pr-4 text-gray-600">Internet</td><td className="py-2.5 pl-4 text-right text-red-500">-$65</td><td className="py-2.5 pl-4 text-right text-red-500">-$780</td></tr>
                <tr><td className="py-2.5 pr-4 text-gray-600">Software (PMS + pricing + HostFi)</td><td className="py-2.5 pl-4 text-right text-red-500">-$55</td><td className="py-2.5 pl-4 text-right text-red-500">-$660</td></tr>
                <tr><td className="py-2.5 pr-4 text-gray-600">Maintenance reserve</td><td className="py-2.5 pl-4 text-right text-red-500">-$150</td><td className="py-2.5 pl-4 text-right text-red-500">-$1,800</td></tr>
                <tr><td className="py-2.5 pr-4 text-gray-600">Furniture replacement reserve (7%)</td><td className="py-2.5 pl-4 text-right text-red-500">-$364</td><td className="py-2.5 pl-4 text-right text-red-500">-$4,368</td></tr>
                <tr className="border-t-2 border-gray-300"><td className="py-2.5 pr-4 font-semibold text-gray-900">True Net Profit</td><td className="py-2.5 pl-4 text-right font-bold text-gray-900">$114</td><td className="py-2.5 pl-4 text-right font-bold text-gray-900">$1,368</td></tr>
                <tr><td className="py-2.5 pr-4 text-gray-500 text-xs">True margin</td><td className="py-2.5 pl-4 text-right text-gray-500 text-xs">2.2%</td><td className="py-2.5 pl-4 text-right text-gray-500 text-xs">2.2%</td></tr>
              </tbody>
            </table>
          </div>

          <p>
            $114/month in true profit. Not the $3,400/month ($5,200 - $1,800 mortgage) most operators would quote. The difference is cleaning costs, reserves, and all the "small" expenses that add up.
          </p>
          <p>
            This property might still be worth operating -- you're building equity, getting tax benefits from depreciation, and the property is appreciating. But the <em>cash flow</em> is $114, not $3,400. Knowing that changes how you think about adding properties, raising prices, or cutting costs.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">What to Do When a Property Isn't Profitable</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Raise your nightly rate.</strong> Many hosts underprice. A $10/night increase at 80% occupancy = $240/month more revenue.</li>
            <li><strong>Optimize cleaning costs.</strong> Can you negotiate a better per-turn rate? Could a cleaner do 2 of your units back-to-back at a discount?</li>
            <li><strong>Charge a realistic cleaning fee.</strong> If you're paying $130/clean, don't charge guests $50. Cover your actual cost.</li>
            <li><strong>Reduce vacancy.</strong> Fill gaps with discounted last-minute bookings. 50% of your nightly rate is better than $0.</li>
            <li><strong>Cut underperforming platforms.</strong> If Booking.com's 15% commission is killing your margin on that unit, focus on Airbnb and direct bookings.</li>
            <li><strong>Exit the unit.</strong> Sometimes the numbers just don't work. Better to know at month 3 than month 12.</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">Per-Property P&L Is Not Optional</h2>
          <p>
            If you have multiple properties, you need per-property P&L, not aggregate numbers. An aggregate profit of $500/month across 5 properties could mean one property making $2,000 and four losing $375 each. Without per-property visibility, you're flying blind.
          </p>
          <p>
            Track by property. Review monthly. Make decisions based on real numbers.
          </p>

          <div className="mt-12 p-8 bg-gray-50 rounded-2xl border border-gray-100 text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-2">See Your True Profit Per Property</h3>
            <p className="text-gray-500 text-sm mb-6">HostFi tracks revenue and expenses per property with automatic categorization. Know your real numbers.</p>
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
              <Link href="/blog/automate-str-bookkeeping" className="block text-sm text-teal-600 hover:text-teal-700 font-medium">
                How to Automate Airbnb Bookkeeping in 2026 →
              </Link>
              <Link href="/blog/rental-arbitrage-expenses" className="block text-sm text-teal-600 hover:text-teal-700 font-medium">
                Rental Arbitrage Expense Guide →
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
