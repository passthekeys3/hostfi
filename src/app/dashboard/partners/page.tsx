"use client";

import { ExternalLink, ChevronRight, Building2, Shield, Percent, Video, Star, Handshake, ShieldCheck, TrendingUp, Sparkles, Landmark } from "lucide-react";
import Link from "next/link";

interface Partner {
  id: string;
  name: string;
  logo: React.ReactNode;
  category: string;
  headline: string;
  description: string;
  perks: { icon: React.ReactNode; text: string }[];
  cta: { label: string; url: string };
  stats?: string;
  featured?: boolean;
  comingSoon?: boolean;
}

const partners: Partner[] = [
  {
    id: "recostseg",
    name: "R.E. Cost Seg",
    logo: <Building2 className="w-6 h-6 text-teal-600" />,
    category: "Tax Savings",
    headline: "Save $20K–$100K+ with Cost Segregation",
    description:
      "A cost segregation study reclassifies parts of your property into faster-depreciating asset categories — accelerating your deductions and significantly reducing your tax bill. Works for STRs, LTRs, commercial, and more.",
    perks: [
      { icon: <Percent className="w-3.5 h-3.5" />, text: "10% off for HostFi users" },
      { icon: <Video className="w-3.5 h-3.5" />, text: "Virtual site visits — no travel needed" },
      { icon: <Shield className="w-3.5 h-3.5" />, text: "IRS audit support included at no extra cost" },
    ],
    cta: { label: "Get Free Proposal", url: "https://www.recostseg.com/free-proposal?ref=hostfi" },
    stats: "10,000+ properties · $1B+ saved on taxes",
    featured: true,
  },
  {
    id: "proper-insurance",
    name: "Proper Insurance",
    logo: <ShieldCheck className="w-6 h-6 text-blue-600" />,
    category: "STR Insurance",
    headline: "Insurance Built for Short-Term Rentals",
    description:
      "Standard homeowner's policies don't cover STR activity — one claim can be denied entirely. Proper Insurance is purpose-built for Airbnb and VRBO hosts with comprehensive liability, property damage, and lost income coverage.",
    perks: [
      { icon: <Shield className="w-3.5 h-3.5" />, text: "Covers STR-specific risks standard policies exclude" },
      { icon: <Building2 className="w-3.5 h-3.5" />, text: "Works for arbitrage, owned, and co-hosted properties" },
      { icon: <Percent className="w-3.5 h-3.5" />, text: "Exclusive rate for HostFi users" },
    ],
    cta: { label: "Get a Quote", url: "#" },
    stats: "#1 rated STR insurance provider",
    comingSoon: true,
  },
  {
    id: "pricelabs",
    name: "PriceLabs",
    logo: <TrendingUp className="w-6 h-6 text-violet-600" />,
    category: "Revenue Optimization",
    headline: "Maximize Revenue with Dynamic Pricing",
    description:
      "HostFi tracks your expenses — PriceLabs optimizes the other side. AI-powered dynamic pricing adjusts your nightly rates based on demand, seasonality, events, and competitor data to maximize your revenue per property.",
    perks: [
      { icon: <TrendingUp className="w-3.5 h-3.5" />, text: "Avg 10-40% revenue increase for new users" },
      { icon: <Sparkles className="w-3.5 h-3.5" />, text: "AI-powered rates updated daily" },
      { icon: <Percent className="w-3.5 h-3.5" />, text: "Discount for HostFi users" },
    ],
    cta: { label: "Try PriceLabs", url: "#" },
    stats: "Used by 100K+ listings worldwide",
    comingSoon: true,
  },
  {
    id: "turno",
    name: "Turno",
    logo: <Sparkles className="w-6 h-6 text-emerald-600" />,
    category: "Cleaning & Turnover",
    headline: "Automate Turnovers, Track Cleaning Costs",
    description:
      "Cleaning is one of the biggest recurring STR expenses. Turno connects you with vetted local cleaners, auto-schedules turnovers from your booking calendar, and tracks every cleaning cost — which flows right into HostFi.",
    perks: [
      { icon: <Sparkles className="w-3.5 h-3.5" />, text: "Auto-schedule cleanings from iCal/API" },
      { icon: <Shield className="w-3.5 h-3.5" />, text: "Vetted, reviewed cleaners in your area" },
      { icon: <Percent className="w-3.5 h-3.5" />, text: "Free for hosts — cleaners pay the fee" },
    ],
    cta: { label: "Find Cleaners", url: "#" },
    stats: "Formerly TurnoverBnB · 35,000+ cleaners",
    comingSoon: true,
  },
  {
    id: "dscr-lending",
    name: "Kiavi",
    logo: <Landmark className="w-6 h-6 text-amber-600" />,
    category: "Investment Lending",
    headline: "DSCR Loans to Grow Your Portfolio",
    description:
      "Ready for your next property? DSCR loans qualify based on the property's rental income — not your personal W-2. Ideal for STR investors looking to scale. Your HostFi P&L data makes the application process faster.",
    perks: [
      { icon: <Landmark className="w-3.5 h-3.5" />, text: "Qualify on rental income, not personal income" },
      { icon: <TrendingUp className="w-3.5 h-3.5" />, text: "Close in as fast as 15 days" },
      { icon: <Percent className="w-3.5 h-3.5" />, text: "Competitive rates for HostFi users" },
    ],
    cta: { label: "Check Rates", url: "#" },
    stats: "$12B+ funded for real estate investors",
    comingSoon: true,
  },
];

function PartnerCard({ partner }: { partner: Partner }) {
  return (
    <div className={`bg-white rounded-2xl border shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden transition-all duration-200 hover:shadow-md ${partner.featured ? "border-teal-200/80" : "border-gray-200/60"}`}>
      {partner.comingSoon && (
        <div className="bg-gray-50 px-5 py-2 flex items-center gap-2 border-b border-gray-100">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Partnership Coming Soon</span>
        </div>
      )}
      {partner.featured && (
        <div className="bg-gradient-to-r from-teal-500 to-emerald-500 px-5 py-2 flex items-center gap-2">
          <Star className="w-3.5 h-3.5 text-white fill-white" />
          <span className="text-xs font-semibold text-white tracking-wide">Featured Partner</span>
        </div>
      )}
      <div className="p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gray-50 rounded-xl border border-gray-200/60 flex items-center justify-center shrink-0">
            {partner.logo}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900">{partner.name}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {partner.category}
              </span>
            </div>
            {partner.stats && (
              <p className="text-xs text-gray-400 mt-0.5">{partner.stats}</p>
            )}
          </div>
        </div>

        <h3 className="text-lg font-bold text-gray-900 mt-5">{partner.headline}</h3>
        <p className="text-sm text-gray-600 mt-2 leading-relaxed">{partner.description}</p>

        <div className="mt-5 space-y-2.5">
          {partner.perks.map((perk, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0">
                {perk.icon}
              </div>
              <span className="text-sm text-gray-700">{perk.text}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-4 flex-wrap">
          {partner.comingSoon ? (
            <span className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-400 text-sm font-semibold rounded-xl cursor-default">
              Coming Soon
            </span>
          ) : (
            <a
              href={partner.cta.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors shadow-sm"
            >
              {partner.cta.label}
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PartnersPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Partners</h1>
        <p className="text-gray-500 mt-2 leading-relaxed">
          Exclusive deals from vetted partners to help you save money and grow your portfolio.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {partners.map((partner) => (
          <PartnerCard key={partner.id} partner={partner} />
        ))}
      </div>

      {/* Coming Soon / Suggest */}
      <div className="bg-gray-50 rounded-2xl border border-gray-200/60 p-8 text-center">
        <Handshake className="w-10 h-10 text-gray-300 mx-auto" />
        <h3 className="mt-4 font-semibold text-gray-900">More Partners Coming Soon</h3>
        <p className="text-sm text-gray-500 mt-1.5 max-w-md mx-auto leading-relaxed">
          We&apos;re partnering with top services in insurance, lending, property management, and more.
        </p>
        <a
          href="mailto:partners@hostfi.ai"
          className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-white text-gray-700 text-sm font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
        >
          Suggest a Partner <ChevronRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
