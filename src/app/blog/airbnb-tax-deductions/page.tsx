import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Airbnb Tax Deductions: Complete List for Hosts in 2026 | HostFi",
  description: "Every tax deduction Airbnb hosts can claim in 2026. Cleaning, supplies, platform fees, depreciation, home office, and more. With Schedule E line-item mapping.",
  alternates: { canonical: "https://hostfi.ai/blog/airbnb-tax-deductions" },
  openGraph: {
    title: "Airbnb Tax Deductions: Complete List for Hosts in 2026",
    description: "Every deduction Airbnb and STR hosts can claim. Organized by Schedule E line item.",
    url: "https://hostfi.ai/blog/airbnb-tax-deductions",
  },
};

export default function AirbnbTaxDeductionsPage() {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Airbnb Tax Deductions: Complete List for Hosts in 2026",
    datePublished: "2026-03-13",
    dateModified: "2026-03-13",
    author: { "@type": "Organization", name: "HostFi Team" },
    publisher: { "@type": "Organization", name: "HostFi", logo: { "@type": "ImageObject", url: "https://hostfi.ai/logo.svg" } },
    url: "https://hostfi.ai/blog/airbnb-tax-deductions",
    image: "https://hostfi.ai/og-image.png",
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://hostfi.ai" },
      { "@type": "ListItem", position: 2, name: "Blog", item: "https://hostfi.ai/blog" },
      { "@type": "ListItem", position: 3, name: "Airbnb Tax Deductions 2026", item: "https://hostfi.ai/blog/airbnb-tax-deductions" },
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
          Airbnb Tax Deductions: Complete List for Hosts in 2026
        </h1>
        <p className="text-gray-500 text-sm mb-12">March 2026 · 14 min read</p>

        <div className="prose prose-gray max-w-none text-[15px] leading-relaxed space-y-6">
          <p>
            Running an Airbnb is a business, and the IRS treats it like one. That means most of the money you spend to operate your rental is deductible. The trick is knowing what counts, where it goes on your tax return, and what documentation you need to back it up.
          </p>
          <p>
            This is a complete list of deductions available to short-term rental hosts in 2026, organized by IRS Schedule E line item. Whether you own the property or do rental arbitrage, this guide covers both.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 my-8">
            <p className="text-sm text-amber-800">
              <strong>Important:</strong> This is educational content, not tax advice. Your tax situation is unique. Work with a CPA or tax professional who understands rental properties. This guide helps you understand what's deductible so you can have better conversations with your tax pro and keep better records throughout the year.
            </p>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">Line 5: Rents Received</h2>
          <p>
            Not a deduction, but important: this is your gross rental income. For Airbnb hosts, this includes the total payout you received from all platforms minus their service fees. If you also collect cleaning fees from guests, those count as income too.
          </p>
          <p>
            If you use multiple platforms (Airbnb, VRBO, Booking.com, direct bookings), all revenue from all sources goes here.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">Line 6: Advertising</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Airbnb and VRBO service fees (the percentage they take from each booking)</li>
            <li>Professional photography for your listing</li>
            <li>Your own website or direct booking site costs</li>
            <li>Social media advertising for your rental</li>
            <li>Listing optimization tools</li>
            <li>Business cards or print materials</li>
          </ul>
          <p>
            Platform fees are one of the biggest deductions most hosts miss. If Airbnb takes 3% from your payout, that's a deductible advertising expense. Over 12 months and multiple properties, this adds up fast.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">Line 8: Cleaning and Maintenance</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Turnover cleaning between guests (your biggest recurring expense)</li>
            <li>Deep cleaning services</li>
            <li>Laundry service for linens and towels</li>
            <li>Cleaning supplies (detergent, sponges, trash bags)</li>
            <li>Lawn care and landscaping</li>
            <li>Pool maintenance and chemicals</li>
            <li>HVAC maintenance and filter replacements</li>
            <li>Pest control treatments</li>
            <li>Pressure washing</li>
            <li>Carpet cleaning</li>
          </ul>
          <p>
            For most STR operators, Line 8 is the largest expense category. If you're paying $100-150 per turnover and hosting 20+ stays per month across your portfolio, this alone can be $2,000-3,000/month.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">Line 9: Insurance</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Short-term rental insurance (Proper, CBIZ, etc.)</li>
            <li>Homeowner's or landlord insurance</li>
            <li>Umbrella liability policy</li>
            <li>Commercial general liability (if applicable)</li>
            <li>Workers' comp (if you have employees)</li>
          </ul>
          <p>
            Standard homeowner's insurance usually doesn't cover STR activity. If you're operating without STR-specific insurance, you're exposed. The premium is fully deductible.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">Line 10: Legal and Professional Fees</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>CPA or tax preparer fees (related to rental activity)</li>
            <li>Attorney fees for lease review, LLC formation, contracts</li>
            <li>Bookkeeping services (including software like HostFi)</li>
            <li>Property management software subscriptions</li>
            <li>Real estate consultant fees</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">Line 11: Management Fees</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Property management company fees (typically 20-30% of revenue)</li>
            <li>Co-host compensation</li>
            <li>Virtual assistant fees (for guest communication, booking management)</li>
          </ul>
          <p>
            If you self-manage, this line might be zero. But any fees paid to others who help manage your rentals go here.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">Line 12: Mortgage Interest (Owners Only)</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Mortgage interest on the rental property</li>
            <li>Interest on home equity loans used for the rental</li>
            <li>Points paid on the rental property mortgage</li>
          </ul>
          <p>
            This is for property owners only. If you do rental arbitrage (lease the unit and sublet on Airbnb), your rent goes on Line 14 instead.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">Line 14: Other Interest / Rent Paid (Arbitrage Operators)</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Monthly rent paid to the landlord (arbitrage operators)</li>
            <li>Interest on business loans used for the rental operation</li>
            <li>Interest on business credit cards used for rental expenses</li>
          </ul>
          <p>
            For arbitrage operators, your monthly lease payment is your biggest single expense and it's fully deductible. This is the line that makes the arbitrage tax math work.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">Line 15: Repairs</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Plumbing fixes (leaky faucet, running toilet)</li>
            <li>Electrical repairs</li>
            <li>Appliance repair (not replacement)</li>
            <li>Drywall patching and painting (maintenance, not improvement)</li>
            <li>Lock rekeying or smart lock battery replacement</li>
            <li>Window repair</li>
            <li>Grout and caulk replacement</li>
          </ul>
          <p>
            The IRS distinguishes between repairs (restoring something to working condition) and improvements (making it better than before). Repairs are deducted immediately. Improvements must be depreciated over time. A new faucet replacing a broken one = repair. Upgrading all plumbing fixtures for aesthetics = improvement.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">Line 16: Supplies</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Guest toiletries (shampoo, conditioner, soap, lotion)</li>
            <li>Paper goods (toilet paper, paper towels, tissues)</li>
            <li>Coffee, tea, and kitchen staples you provide</li>
            <li>Welcome gifts or baskets</li>
            <li>Linens and towels (when replacing, not initial purchase)</li>
            <li>Kitchen supplies (sponges, dish soap, foil, bags)</li>
            <li>Light bulbs and batteries</li>
            <li>Smoke detector and CO detector batteries</li>
            <li>Guidebook printing</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">Line 17: Taxes</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Property taxes (owners)</li>
            <li>Local transient occupancy tax (TOT)</li>
            <li>State and local sales tax on rental income</li>
            <li>Business license fees</li>
            <li>STR permit fees</li>
          </ul>
          <p>
            Many cities charge a transient occupancy tax (hotel tax) on short-term rentals. Airbnb collects and remits this in some jurisdictions but not all. If you're paying it yourself, it's deductible.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">Line 18: Utilities</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Electricity</li>
            <li>Gas / heating</li>
            <li>Water and sewer</li>
            <li>Trash and recycling</li>
            <li>Internet / WiFi (required for most guests)</li>
            <li>Cable or streaming subscriptions provided to guests</li>
            <li>Phone line (if property has a dedicated line)</li>
          </ul>
          <p>
            For STR operators, utilities are typically higher than long-term rentals because guests use more electricity, water, and heating/cooling. This makes them a significant deduction.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">Line 19: Depreciation</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Building depreciation (27.5 years for residential rental property)</li>
            <li>Furniture and fixtures (5-7 year depreciation)</li>
            <li>Appliances (5-7 years)</li>
            <li>Landscaping improvements (15 years)</li>
            <li>Cost segregation study accelerated items</li>
          </ul>
          <p>
            Depreciation is a non-cash deduction that reduces your taxable income. Even though you're not writing a check, you're deducting a portion of the property's value each year. This is one of the biggest tax advantages of owning rental property.
          </p>
          <p>
            A cost segregation study can accelerate depreciation on certain components (carpeting, fixtures, landscaping) from 27.5 years to 5-15 years, creating significantly larger deductions in the early years. Worth it for properties valued over $500K.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">Line 20: Other Expenses</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Travel to your rental property (mileage or actual expenses)</li>
            <li>Home office deduction (if you manage rentals from home)</li>
            <li>Smart home devices (smart locks, thermostats, security cameras)</li>
            <li>Parking fees at the property</li>
            <li>HOA fees (owners)</li>
            <li>Security system monitoring</li>
            <li>Key management service</li>
            <li>Channel manager software</li>
            <li>Dynamic pricing tool subscriptions (PriceLabs, Wheelhouse, Beyond)</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">Deductions People Miss</h2>
          <p>Based on working with hundreds of STR operators, these are the most commonly missed deductions:</p>
          <ol className="list-decimal pl-6 space-y-3">
            <li><strong>Platform fees</strong> — Airbnb's 3% host fee and VRBO's fees are deductible advertising expenses. On $100K in bookings, that's $3,000+ you might be missing.</li>
            <li><strong>Mileage</strong> — Every trip to the property for cleaning, maintenance, restocking, or inspections. Track it. The 2026 IRS mileage rate is 70 cents per mile.</li>
            <li><strong>Software subscriptions</strong> — PriceLabs, Guesty, Hostaway, HostFi, your channel manager, smart lock apps. They all count.</li>
            <li><strong>Startup costs</strong> — Furniture, initial supplies, photography for your first listing, and LLC formation costs from when you started.</li>
            <li><strong>Internet and streaming</strong> — WiFi is essentially required for Airbnb guests. If you provide Netflix or streaming, that's deductible too.</li>
          </ol>

          <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">Record-Keeping Tips</h2>
          <p>The IRS can audit rental property returns for up to 3 years (6 if they suspect significant underreporting). Keep records of everything:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Save every receipt.</strong> Photograph them immediately. Paper fades.</li>
            <li><strong>Use a separate bank account</strong> for rental income and expenses. Commingling personal and business funds is an audit red flag.</li>
            <li><strong>Track mileage as it happens.</strong> A mileage log reconstructed at year-end won't hold up.</li>
            <li><strong>Categorize as you go.</strong> Don't wait until tax time to sort 12 months of transactions.</li>
            <li><strong>Automate what you can.</strong> Forward bills to your expense tracker, connect your bank, let AI handle categorization.</li>
          </ul>

          <div className="mt-12 p-8 bg-gray-50 rounded-2xl border border-gray-100 text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Stop Missing Deductions</h3>
            <p className="text-gray-500 text-sm mb-6">HostFi auto-maps every expense to the correct Schedule E line item. Free for up to 3 properties.</p>
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
