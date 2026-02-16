"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  Mail, BarChart3, Bot, Camera, Bell, TrendingUp,
  FileText, ArrowRight, Shield, Zap, ChevronRight,
  Building2, Receipt, PieChart, AlertTriangle, Calculator,
  MessageSquare, CheckCircle2, ArrowUpRight, Sparkles,
  DollarSign, Home, Layers, Clock, ChevronDown
} from "lucide-react";

/* ─── Intersection Observer ─── */
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function FadeIn({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useInView();
  return (
    <div
      ref={ref}
      className={`${className} transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ─── FAQ ─── */
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left cursor-pointer group"
      >
        <span className="text-[15px] font-medium text-gray-900 group-hover:text-teal-600 transition-colors pr-8">{q}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? "max-h-48 pb-5" : "max-h-0"}`}>
        <p className="text-sm text-gray-500 leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

/* ─── Animated Number ─── */
function AnimatedNumber({ value, prefix = "", suffix = "", visible }: { value: number; prefix?: string; suffix?: string; visible: boolean }) {
  const [count, setCount] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (!visible || started.current) return;
    started.current = true;
    const start = performance.now();
    const duration = 1500;
    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(value * ease));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [visible, value]);
  return <>{prefix}{count.toLocaleString()}{suffix}</>;
}

/* ─── Get Started CTA ─── */
function PricingSection({ authTarget = "/login" }: { authTarget?: string }) {
  const [annual, setAnnual] = useState(false);
  const tiers = [
    {
      name: "Free", monthly: 0, yearly: 0, period: "forever",
      desc: "For getting started",
      features: ["Up to 3 properties", "AI categorization (50/mo)", "Ask AI (10 queries/mo)", "Revenue tracking (CSV)", "Basic analytics"],
      highlighted: false,
    },
    {
      name: "Pro", monthly: 15, yearly: 12, period: "/mo",
      desc: "For growing portfolios",
      features: ["Up to 10 properties", "+$2.50/property beyond 10", "Unlimited AI features", "Anomaly detection", "Schedule E tax export", "Free ACH bill pay", "Receipt scanning"],
      highlighted: true,
    },
    {
      name: "Business", monthly: 49, yearly: 39, period: "/mo",
      desc: "For teams and PMs",
      features: ["Up to 25 properties", "+$2/property beyond 25", "Everything in Pro", "Cross-property benchmarking", "Team access (up to 5)", "QuickBooks / Xero sync", "Accountant portal", "Priority support"],
      highlighted: false,
    },
  ];

  return (
    <>
      <div className="flex items-center justify-center gap-3 mb-10">
        <button onClick={() => setAnnual(false)} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${!annual ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700"}`}>Monthly</button>
        <button onClick={() => setAnnual(true)} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${annual ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700"}`}>
          Annual
          <span className="px-2 py-0.5 text-[10px] font-bold bg-teal-500 text-white rounded-full">Save 20%</span>
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {tiers.map((tier, i) => {
          const price = tier.monthly === 0 ? 0 : annual ? tier.yearly : tier.monthly;
          return (
            <FadeIn key={i} delay={i * 80}>
              <div className={`rounded-2xl p-8 h-full flex flex-col ${tier.highlighted ? "bg-gray-900 text-white ring-1 ring-gray-800" : "bg-white border border-gray-200"}`}>
                <div className="mb-6">
                  <p className={`text-xs font-semibold uppercase tracking-widest mb-4 ${tier.highlighted ? "text-teal-400" : "text-teal-600"}`}>{tier.name}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">${price}</span>
                    <span className={`text-sm ${tier.highlighted ? "text-gray-400" : "text-gray-400"}`}>{tier.monthly === 0 ? "forever" : "/mo"}</span>
                  </div>
                  {annual && tier.monthly > 0 && (
                    <p className={`text-xs mt-1.5 ${tier.highlighted ? "text-teal-400" : "text-teal-600"} font-medium`}>
                      Billed ${price * 12}/year (save ${(tier.monthly - tier.yearly) * 12}/yr)
                    </p>
                  )}
                  <p className={`text-sm mt-2 ${tier.highlighted ? "text-gray-400" : "text-gray-500"}`}>{tier.desc}</p>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${tier.highlighted ? "text-teal-400" : "text-teal-500"}`} />
                      <span className={tier.highlighted ? "text-gray-300" : "text-gray-600"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={authTarget}
                  className={`block w-full text-center py-3 px-6 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${tier.highlighted ? "bg-white text-gray-900 hover:bg-gray-100" : "bg-gray-900 text-white hover:bg-gray-800"}`}
                >
                  Get Started
                </Link>
              </div>
            </FadeIn>
          );
        })}
      </div>
    </>
  );
}

function GetStartedButton({ className = "", size = "default", authTarget = "/login" }: { className?: string; size?: "default" | "large"; authTarget?: string }) {
  return (
    <Link
      href={authTarget}
      className={`inline-flex items-center justify-center gap-2 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors ${
        size === "large" ? "px-8 py-4 text-base" : "px-6 py-3 text-sm"
      } ${className}`}
    >
      Get Started Free <ArrowRight className="w-4 h-4" />
    </Link>
  );
}

/* ─── Auth-aware link target ─── */
function useAuthTarget() {
  const [target, setTarget] = useState("/login");
  useEffect(() => {
    // Check if user has an active Supabase session
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        if (!supabase) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (session) setTarget("/dashboard");
      } catch {}
    })();
  }, []);
  return target;
}

/* ─── Main ─── */
export default function LandingPage() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const statsSection = useInView(0.3);
  const authTarget = useAuthTarget();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const scrollTo = (id: string) => {
    setMobileMenu(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased">
      {/* JSON-LD Structured Data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "HostFi",
        "url": "https://hostfi.ai",
        "applicationCategory": "FinanceApplication",
        "operatingSystem": "Web",
        "description": "AI-powered expense management for rental property operators. Track expenses, scan receipts, auto-categorize for Schedule E tax prep.",
        "offers": [
          { "@type": "Offer", "name": "Free", "price": "0", "priceCurrency": "USD", "description": "Up to 3 properties" },
          { "@type": "Offer", "name": "Pro", "price": "15", "priceCurrency": "USD", "description": "Up to 10 properties + AI features" },
          { "@type": "Offer", "name": "Business", "price": "49", "priceCurrency": "USD", "description": "Up to 25 properties + team access" }
        ],
      })}} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          { "@type": "Question", "name": "What types of properties does HostFi support?", "acceptedAnswer": { "@type": "Answer", "text": "Any rental property — single-family homes, multi-family, condos, short-term rentals (Airbnb, VRBO), and commercial. If it has expenses, HostFi can track them." }},
          { "@type": "Question", "name": "How is HostFi different from a spreadsheet or QuickBooks?", "acceptedAnswer": { "@type": "Answer", "text": "Spreadsheets don't understand rental properties — you end up building complex formulas just to track per-property costs. QuickBooks is powerful but designed for general businesses, not rental operators. HostFi is purpose-built: it auto-categorizes expenses by property, maps directly to IRS Schedule E line items, and catches anomalies like utility spikes automatically. No accounting degree required." }},
          { "@type": "Question", "name": "How does the AI bill parsing work?", "acceptedAnswer": { "@type": "Answer", "text": "Forward bills to your unique HostFi email address. Our AI reads the document, extracts amount, due date, vendor, and category, then matches it to the correct property based on your account details." }},
          { "@type": "Question", "name": "What's the difference between Owner and Arbitrage mappings?", "acceptedAnswer": { "@type": "Answer", "text": "Owners and arbitrage operators have different tax situations. For example, an owner deducts mortgage interest on Line 12, while an arbitrage operator deducts rent on Line 14. HostFi handles both automatically." }},
          { "@type": "Question", "name": "Is my financial data secure?", "acceptedAnswer": { "@type": "Answer", "text": "We use bank-level encryption and never store banking credentials. Your data is encrypted at rest and in transit. Bill payments are processed through licensed third-party providers — we never touch your funds." }},
          { "@type": "Question", "name": "Can I import existing expense data?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Import from CSV or Excel — our import wizard auto-maps your columns and flags duplicates. QuickBooks and Xero sync available on Business plan." }},
          { "@type": "Question", "name": "Do you integrate with property management software?", "acceptedAnswer": { "@type": "Answer", "text": "Today we integrate with Slack, Google Sheets, Google Drive, Zapier, and Make — with QuickBooks, Xero, and PMS integrations (Hostaway, Guesty, OwnerRez) on the roadmap. New integrations added regularly." }},
          { "@type": "Question", "name": "What is the cancellation policy?", "acceptedAnswer": { "@type": "Answer", "text": "Cancel anytime from your settings — no contracts, no fees. Your data stays accessible for 30 days after cancellation." }}
        ]
      })}} />

      {/* ─── NAV ─── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/80 backdrop-blur-xl border-b border-gray-100" : "bg-transparent"}`}>
        <div className="max-w-6xl mx-auto px-5 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="HostFi" className="w-8 h-8 rounded-lg" />
            <span className="text-lg font-semibold tracking-tight">HostFi</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-[13px] font-medium text-gray-500">
            <button onClick={() => scrollTo("features")} className="hover:text-gray-900 transition-colors cursor-pointer">Features</button>
            <button onClick={() => scrollTo("how-it-works")} className="hover:text-gray-900 transition-colors cursor-pointer">How It Works</button>
            <button onClick={() => scrollTo("pricing")} className="hover:text-gray-900 transition-colors cursor-pointer">Pricing</button>
            <button onClick={() => scrollTo("faq")} className="hover:text-gray-900 transition-colors cursor-pointer">FAQ</button>
            <Link href="/blog" className="hover:text-gray-900 transition-colors">Blog</Link>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link href={authTarget} className="px-4 py-2 text-[13px] font-medium text-gray-600 hover:text-gray-900 transition-colors">Log in</Link>
            <Link href={authTarget} className="px-4 py-2 text-[13px] font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer">Get Started</Link>
          </div>
          <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden p-2 cursor-pointer">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={mobileMenu ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} /></svg>
          </button>
        </div>
        {mobileMenu && (
          <div className="md:hidden bg-white border-t border-gray-100 px-5 py-4 space-y-1">
            {["features", "how-it-works", "pricing", "faq"].map(id => (
              <button key={id} onClick={() => scrollTo(id)} className="block w-full text-left py-2.5 text-sm text-gray-600 capitalize cursor-pointer">{id.replace("-", " ")}</button>
            ))}
            <Link href="/blog" onClick={() => setMobileMenu(false)} className="block w-full text-left py-2.5 text-sm text-gray-600">Blog</Link>
            <div className="pt-3 flex gap-2">
              <Link href={authTarget} className="flex-1 text-center py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg">Log in</Link>
              <Link href={authTarget} onClick={() => setMobileMenu(false)} className="flex-1 text-center py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg cursor-pointer">Get Started</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ─── HERO ─── */}
      <section className="pt-32 sm:pt-40 pb-20 sm:pb-28 px-5">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-medium mb-8">
              <Sparkles className="w-3 h-3" />
              AI-Powered Expense Management for Rental Properties
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
              Know Exactly Where Your Money Goes.{" "}
              <span className="text-teal-500">Every Property. Every Bill.</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-500 leading-relaxed max-w-2xl mb-10">
              Forward your bills. Snap your receipts. HostFi uses AI to automatically track, categorize, and map every expense to the right property — down to the IRS Schedule E line item.
            </p>
            <GetStartedButton size="large" authTarget={authTarget} />
            <p className="text-xs text-gray-400 mt-3">Free for up to 3 properties. No credit card required.</p>
          </FadeIn>

          {/* Dashboard Preview */}
          <FadeIn className="mt-16 sm:mt-20" delay={200}>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-b from-teal-500/5 via-transparent to-transparent rounded-3xl -m-4" />
              <div className="relative bg-white rounded-2xl border border-gray-200 shadow-xl shadow-gray-200/50 overflow-hidden">
                {/* Browser bar */}
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-200" />
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-200" />
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-200" />
                  </div>
                  <div className="flex-1 max-w-sm mx-auto">
                    <div className="bg-white border border-gray-200 rounded-md px-3 py-1 text-[11px] text-gray-400 text-center">hostfi.ai/dashboard</div>
                  </div>
                </div>

                {/* Dashboard content */}
                <div className="p-5 sm:p-8 bg-[#f8f9fa]">
                  {/* Stat cards row */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
                    {[
                      { label: "Total Expenses", value: "$14,280", change: "-3.2% from last month", icon: DollarSign, accent: "border-teal-400" },
                      { label: "Properties", value: "8", change: "All synced", icon: Home, accent: "border-blue-400" },
                      { label: "Avg / Property", value: "$1,785", change: "-$92 vs average", icon: PieChart, accent: "border-amber-400" },
                      { label: "Anomalies", value: "2", change: "Action needed", icon: AlertTriangle, accent: "border-rose-400" },
                    ].map((stat, i) => (
                      <div key={i} className={`bg-white rounded-xl p-4 border-t-2 ${stat.accent} shadow-sm`}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">{stat.label}</p>
                          <stat.icon className="w-3.5 h-3.5 text-gray-300" />
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</p>
                        <p className="text-[11px] text-gray-400 mt-1">{stat.change}</p>
                      </div>
                    ))}
                  </div>

                  {/* Chart + Recent activity */}
                  <div className="grid lg:grid-cols-5 gap-3 sm:gap-4">
                    <div className="lg:col-span-3 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-xs font-medium text-gray-700">Monthly Spend Trend</p>
                        <span className="text-[10px] text-gray-400 font-medium">Last 12 months</span>
                      </div>
                      <svg className="w-full h-32" viewBox="0 0 500 120" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.12" />
                            <stop offset="100%" stopColor="#14B8A6" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <polyline fill="url(#chartGrad)" stroke="none" points="0,80 42,70 84,75 126,55 168,60 210,45 252,50 294,42 336,55 378,35 420,45 462,30 500,28 500,120 0,120" />
                        <polyline fill="none" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points="0,80 42,70 84,75 126,55 168,60 210,45 252,50 294,42 336,55 378,35 420,45 462,30 500,28" />
                        <circle cx="500" cy="28" r="3" fill="#14B8A6" />
                      </svg>
                      <div className="flex justify-between text-[9px] text-gray-300 mt-1 px-1">
                        {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map(m => <span key={m}>{m}</span>)}
                      </div>
                    </div>
                    <div className="lg:col-span-2 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                      <p className="text-xs font-medium text-gray-700 mb-4">Recent Activity</p>
                      <div className="space-y-3">
                        {[
                          { label: "SoCalEdison", prop: "Unit 4B", amount: "$187.40", tag: "Parsed", tagColor: "bg-teal-50 text-teal-600" },
                          { label: "Water bill spike", prop: "Unit 2A", amount: "+142%", tag: "Anomaly", tagColor: "bg-rose-50 text-rose-600" },
                          { label: "Cleaning service", prop: "Unit 1A", amount: "$150.00", tag: "Receipt", tagColor: "bg-blue-50 text-blue-600" },
                          { label: "Insurance renewal", prop: "All units", amount: "$2,400", tag: "Due soon", tagColor: "bg-amber-50 text-amber-600" },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-gray-800 truncate">{item.label}</p>
                              <p className="text-[10px] text-gray-400">{item.prop}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${item.tagColor}`}>{item.tag}</span>
                              <span className="text-xs font-semibold text-gray-900 w-16 text-right">{item.amount}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── STATS BAR ─── */}
      <section ref={statsSection.ref} className="py-16 px-5 border-y border-gray-100">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { type: "static", display: "< 30s", label: "Average bill parse time" },
            { type: "static", display: "100%", label: "Schedule E coverage" },
            { type: "animated", value: 5, suffix: " min", label: "Setup time", prefix: "" },
            { type: "static", display: "$0", label: "To get started" },
          ].map((s, i) => (
            <div key={i}>
              <p className="text-3xl sm:text-4xl font-bold text-gray-900">
                {s.type === "static" ? (
                  s.display
                ) : (
                  <AnimatedNumber value={s.value!} prefix={s.prefix} suffix={s.suffix} visible={statsSection.visible} />
                )}
              </p>
              <p className="text-sm text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── PROBLEM → SOLUTION ─── */}
      <section className="py-24 sm:py-28 px-5">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="max-w-2xl mb-16">
            <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-3">The Problem</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              STR Operators Spend 8+ Hours a Month on Expense Tracking
            </h2>
            <p className="text-gray-500 leading-relaxed">
              Bills scattered across inboxes. Spreadsheets that don&apos;t scale. No per-property visibility. And when tax season hits, you&apos;re scrambling to figure out which IRS line each expense belongs on.
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Before */}
            <FadeIn>
              <div className="bg-gray-50 rounded-2xl p-8 h-full border border-gray-100">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-200/60 text-gray-600 rounded-full text-xs font-medium mb-6">
                  Before HostFi
                </div>
                <div className="space-y-4">
                  {[
                    "Manually Entering Bills Into Spreadsheets",
                    "No Idea Which Property Costs the Most",
                    "Missing Bills Until You Get a Late Fee",
                    "Hours Categorizing Expenses for Taxes",
                    "Water Leak Runs for Months Unnoticed",
                    "Guessing at Schedule E Line Items",
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-gray-400 text-xs">✕</span>
                      </div>
                      <p className="text-sm text-gray-500">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>

            {/* After */}
            <FadeIn delay={100}>
              <div className="bg-teal-50/50 rounded-2xl p-8 h-full border border-teal-100">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-xs font-medium mb-6">
                  After HostFi
                </div>
                <div className="space-y-4">
                  {[
                    "Forward a Bill → AI Parses and Categorizes It",
                    "Per-Property P&L Updated in Real Time",
                    "Alerts Before a Bill Is Due or Overdue",
                    "Schedule E Auto-Mapped at Year End",
                    "Anomaly Detection Catches Spikes Instantly",
                    "One Click to Export Tax-Ready Reports",
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-700">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="py-24 sm:py-28 px-5 bg-gray-50 scroll-mt-16">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="max-w-2xl mb-16">
            <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Everything You Need to Manage Property Expenses
            </h2>
            <p className="text-gray-500 leading-relaxed">
              From AI-powered bill parsing to Schedule E tax prep — built specifically for STR operators, landlords, and property managers.
            </p>
          </FadeIn>

          {/* Feature grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Bot, title: "AI Bill Parsing", desc: "Forward bills to your HostFi email. AI extracts the amount, due date, vendor, and matches it to the right property." },
              { icon: Camera, title: "Receipt Scanning", desc: "Snap a photo of any receipt. We read it, categorize it, and file it — works from your phone." },
              { icon: AlertTriangle, title: "Anomaly Detection", desc: "Automatic alerts when a bill spikes. Catch water leaks, rate increases, and billing errors early." },
              { icon: TrendingUp, title: "Cross-Property Benchmarking", desc: "Compare costs across your portfolio. See which units are efficient and where you're overspending." },
              { icon: Calculator, title: "Schedule E Tax Prep", desc: "Every expense auto-mapped to the correct IRS line item. Owner and arbitrage mappings built in." },
              { icon: BarChart3, title: "Revenue + P&L Tracking", desc: "Import revenue from Airbnb, VRBO, or direct bookings. See true profit per property." },
              { icon: Bell, title: "Smart Alerts", desc: "Due soon, overdue, unusual amounts, missing bills — never miss a payment again." },
              { icon: MessageSquare, title: "Ask AI", desc: "Ask questions about your expenses in plain English. \"What did I spend on utilities last quarter?\"" },
              { icon: Layers, title: "Integrations", desc: "Connect QuickBooks, Xero, Slack, and your property management software. More added monthly." },
            ].map((f, i) => (
              <FadeIn key={i} delay={i * 50}>
                <div className="bg-white rounded-xl p-6 h-full border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all group">
                  <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center mb-4 group-hover:bg-teal-50 transition-colors">
                    <f.icon className="w-5 h-5 text-gray-400 group-hover:text-teal-500 transition-colors" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="py-24 sm:py-28 px-5 scroll-mt-16">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="max-w-2xl mb-16">
            <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Up and Running in Under 5 Minutes
            </h2>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Add Your Properties",
                desc: "Enter your properties — name, address, type. Takes 60 seconds per property.",
                icon: Building2,
              },
              {
                step: "02",
                title: "Forward Your Bills",
                desc: "Set your HostFi email as the billing address, or just forward bills from your inbox. AI handles the rest.",
                icon: Mail,
              },
              {
                step: "03",
                title: "Get Insights Instantly",
                desc: "Per-property spend, anomaly alerts, tax-ready reports, and AI-powered recommendations — all automatic.",
                icon: Zap,
              },
            ].map((s, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div className="relative">
                  <span className="text-6xl font-bold text-gray-100 absolute -top-2 -left-1">{s.step}</span>
                  <div className="relative pt-12">
                    <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center mb-4">
                      <s.icon className="w-5 h-5 text-teal-500" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-2">{s.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SCHEDULE E HIGHLIGHT ─── */}
      <section className="py-24 sm:py-28 px-5 bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <FadeIn>
              <p className="text-xs font-semibold text-teal-400 uppercase tracking-widest mb-3">Tax season, solved</p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-5 text-white">
                Schedule E on Autopilot
              </h2>
              <p className="text-gray-400 leading-relaxed mb-8">
                HostFi automatically maps every expense to the correct IRS Schedule E line item — whether you&apos;re an owner or an arbitrage operator. Different business models get different mappings.
              </p>
              <div className="space-y-3">
                {[
                  "Auto-Categorizes Into 15 IRS Line Items",
                  "Owner vs. Arbitrage-Specific Mappings",
                  "Export Tax-Ready Reports in One Click",
                  "No More Guessing Which Line \"Cleaning\" Goes On",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
                    <p className="text-sm text-gray-300">{item}</p>
                  </div>
                ))}
              </div>
            </FadeIn>

            <FadeIn delay={150}>
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-medium text-gray-400">Schedule E Preview — Unit 4B</p>
                  <span className="text-[10px] text-teal-400 font-medium bg-teal-400/10 px-2 py-0.5 rounded">Auto-mapped</span>
                </div>
                <div className="space-y-2.5">
                  {[
                    { line: "Line 5", label: "Advertising", amount: "$420" },
                    { line: "Line 9", label: "Insurance", amount: "$2,400" },
                    { line: "Line 12", label: "Mortgage Interest", amount: "$14,880" },
                    { line: "Line 14", label: "Repairs", amount: "$1,650" },
                    { line: "Line 16", label: "Taxes", amount: "$3,200" },
                    { line: "Line 17", label: "Utilities", amount: "$2,940" },
                    { line: "Line 18", label: "Depreciation", amount: "$8,500" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-700/50 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-gray-500 w-12">{item.line}</span>
                        <span className="text-sm text-gray-300">{item.label}</span>
                      </div>
                      <span className="text-sm font-medium text-white">{item.amount}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-gray-700 flex items-center justify-between">
                  <span className="text-xs text-gray-500">Total deductions</span>
                  <span className="text-base font-bold text-teal-400">$33,990</span>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ─── WHO IT'S FOR ─── */}
      <section className="py-24 sm:py-28 px-5">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="max-w-2xl mb-16">
            <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-3">Built for</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Every Type of Rental Operator
            </h2>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Property Owners",
                desc: "Own 1 or 100 units. Track every expense, get per-property P&L, and have Schedule E ready at tax time.",
                tag: "Owner",
              },
              {
                title: "Arbitrage Operators",
                desc: "Running STRs on leased properties? HostFi tracks rent as an expense and maps to the right tax categories.",
                tag: "Arbitrage",
              },
              {
                title: "Property Managers",
                desc: "Manage properties for clients. Team access, per-owner reporting, and cross-portfolio benchmarking.",
                tag: "PM",
              },
            ].map((persona, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div className="bg-gray-50 rounded-xl p-8 h-full border border-gray-100">
                  <span className="inline-block text-[11px] font-semibold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-md mb-5">{persona.tag}</span>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{persona.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{persona.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="py-24 sm:py-28 px-5 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-3">Testimonials</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              What Operators Are Saying
            </h2>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: "I used to spend Sunday afternoons entering receipts into a spreadsheet. Now I just forward my bills and snap receipts — HostFi handles the rest. Easily saving 6+ hours a month.",
                name: "Sarah M.",
                role: "Airbnb Host",
                units: "6 units",
              },
              {
                quote: "Tax season used to be a nightmare. Figuring out which expenses go on which Schedule E line was guesswork. HostFi's auto-mapping is a lifesaver — my CPA actually complimented how organized everything was.",
                name: "Marcus T.",
                role: "Arbitrage Operator",
                units: "12 units",
              },
              {
                quote: "The anomaly detection alone paid for itself. Caught a water bill that was 3x normal — turned out to be a running toilet in one of my units. Would've cost me hundreds more if I'd missed it.",
                name: "Jennifer K.",
                role: "Property Manager",
                units: "23 units",
              },
            ].map((testimonial, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div className="bg-white rounded-xl p-6 h-full border border-gray-100 flex flex-col">
                  <div className="flex-1">
                    <svg className="w-8 h-8 text-teal-100 mb-4" fill="currentColor" viewBox="0 0 32 32">
                      <path d="M10 8c-3.3 0-6 2.7-6 6v10h10V14H6c0-2.2 1.8-4 4-4V8zm14 0c-3.3 0-6 2.7-6 6v10h10V14h-8c0-2.2 1.8-4 4-4V8z" />
                    </svg>
                    <p className="text-sm text-gray-600 leading-relaxed mb-6">{testimonial.quote}</p>
                  </div>
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-sm font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-xs text-gray-400">{testimonial.role} · {testimonial.units}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="py-24 sm:py-28 px-5 bg-white scroll-mt-16">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Start Free. Upgrade When You Need To.
            </h2>
            <p className="text-gray-500">No credit card required. No time limits on free.</p>
          </FadeIn>

          <PricingSection authTarget={authTarget} />
        </div>
      </section>
      {/* ─── TRUST / BUILT BY ─── */}
      <section className="py-20 sm:py-24 px-5">
        <div className="max-w-3xl mx-auto text-center">
          <FadeIn>
            <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-3">Why HostFi</p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">Built by an Operator, for Operators</h2>
            <p className="text-gray-500 text-sm leading-relaxed max-w-xl mx-auto mb-4">
              &ldquo;I was spending entire weekends organizing receipts and figuring out which IRS line each expense belonged on. I built HostFi because no tool understood how rental operators actually work.&rdquo;
            </p>
            <p className="text-sm font-semibold text-gray-900 mb-10">— Kevin, Founder</p>
          </FadeIn>
          <FadeIn delay={150}>
            <div className="grid sm:grid-cols-3 gap-6 text-left">
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-5 h-5 text-teal-600" />
                </div>
                <p className="font-semibold text-sm mb-2">Your Data, Your Control</p>
                <p className="text-xs text-gray-500 leading-relaxed">HostFi never touches your money. All payments go through licensed third-party providers. Your financial data is encrypted and only accessible to you.</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-5 h-5 text-teal-600" />
                </div>
                <p className="font-semibold text-sm mb-2">Up and Running in 2 Minutes</p>
                <p className="text-xs text-gray-500 leading-relaxed">No complex setup. Add a property, log an expense, and you're already ahead of where you were with spreadsheets. Works on any device.</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-5 h-5 text-teal-600" />
                </div>
                <p className="font-semibold text-sm mb-2">Free Forever (3 Properties)</p>
                <p className="text-xs text-gray-500 leading-relaxed">No trials, no credit card, no bait and switch. The free plan includes every feature. Paid plans are for operators who need more properties.</p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

                    {/* ─── FAQ ─── */}
      <section id="faq" className="py-24 sm:py-28 px-5 scroll-mt-16">
        <div className="max-w-2xl mx-auto">
          <FadeIn className="mb-12">
            <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-3">FAQ</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Common Questions</h2>
          </FadeIn>
          <FadeIn>
            <div>
              <FAQItem q="What types of properties does HostFi support?" a="Any rental property — single-family homes, multi-family, condos, short-term rentals (Airbnb, VRBO), and commercial. If it has expenses, HostFi can track them." />
              <FAQItem q="How is HostFi different from a spreadsheet or QuickBooks?" a="Spreadsheets don't understand rental properties — you end up building complex formulas just to track per-property costs. QuickBooks is powerful but designed for general businesses, not rental operators. HostFi is purpose-built: it auto-categorizes expenses by property, maps directly to IRS Schedule E line items, and catches anomalies like utility spikes automatically. No accounting degree required." />
              <FAQItem q="How does the AI bill parsing work?" a="Forward bills to your unique HostFi email address. Our AI reads the document, extracts amount, due date, vendor, and category, then matches it to the correct property based on your account details." />
              <FAQItem q="What's the difference between Owner and Arbitrage mappings?" a="Owners and arbitrage operators have different tax situations. For example, an owner deducts mortgage interest on Line 12, while an arbitrage operator deducts rent on Line 19 (Other). HostFi handles both automatically." />
              <FAQItem q="Is my financial data secure?" a="We use bank-level encryption and never store banking credentials. Your data is encrypted at rest and in transit. Bill payments are processed through licensed third-party providers — we never touch your funds." />
              <FAQItem q="Can I import existing expense data?" a="Yes. Import from CSV or Excel — our import wizard auto-maps your columns and flags duplicates. QuickBooks and Xero sync available on Business plan." />
              <FAQItem q="Do you integrate with property management software?" a="Today we integrate with Slack, Google Sheets, Google Drive, Zapier, and Make — with QuickBooks, Xero, and PMS integrations (Hostaway, Guesty, OwnerRez) on the roadmap. New integrations added regularly." />
              <FAQItem q="What's the cancellation policy?" a="Cancel anytime from your settings — no contracts, no fees. Your data stays accessible for 30 days after cancellation." />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── AI SUMMARY ─── */}
      <section className="py-16 px-5 border-t border-gray-100">
        <FadeIn className="max-w-2xl mx-auto text-center">
          <p className="text-xl sm:text-2xl font-semibold text-gray-900 mb-8">Request an AI summary of HostFi</p>
          <div className="flex items-center justify-center gap-6 sm:gap-10">
            {[
              {
                name: "ChatGPT",
                url: "https://chatgpt.com/?q=",
                icon: (
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
                  </svg>
                ),
              },
              {
                name: "Claude",
                url: "https://claude.ai/new?q=",
                icon: (
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4.709 15.955l4.066-2.328L4.603 9.75l2.988-1.635 4.122 3.878 4.172-3.878L18.873 9.8l-4.172 3.877 4.066 2.328-2.988 1.635-4.066-2.378-4.016 2.378z" />
                  </svg>
                ),
              },
              {
                name: "Gemini",
                url: "https://gemini.google.com/app?q=",
                icon: (
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C12 6.627 6.627 12 0 12c6.627 0 12 5.373 12 12 0-6.627 5.373-12 12-12-6.627 0-12-5.373-12-12z" />
                  </svg>
                ),
              },
              {
                name: "Perplexity",
                url: "https://www.perplexity.ai/search?q=",
                icon: (
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 1.5L4.5 8.25V18L12 22.5l7.5-4.5V8.25L12 1.5zm0 2.6l5.5 5.15v7.5L12 20.4l-5.5-3.64v-7.5L12 4.1z"/>
                    <path d="M12 4.1V20.4M6.5 9.25L12 12.9l5.5-3.65"/>
                  </svg>
                ),
              },
              {
                name: "Grok",
                url: "https://grok.com/?q=",
                icon: (
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2 2l9 10L2 22h2l8-8.5L20 22h2l-9-10L22 2h-2l-8 8.5L4 2H2z" />
                  </svg>
                ),
              },
            ].map((llm) => (
              <a
                key={llm.name}
                href={`${llm.url}${encodeURIComponent("What is HostFi (hostfi.ai)? Summarize what it does, who it's for, and how it compares to using spreadsheets or QuickBooks for rental property expense tracking.")}`}
                target="_blank"
                rel="noopener noreferrer"
                title={`Ask ${llm.name} about HostFi`}
                className="text-gray-900 hover:text-teal-600 transition-colors"
              >
                {llm.icon}
              </a>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-24 sm:py-28 px-5 bg-gray-50 border-t border-gray-100">
        <FadeIn className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Stop Guessing. Start Knowing.
          </h2>
          <p className="text-gray-500 mb-10">
            Free for up to 3 properties. No credit card required.
          </p>
          <GetStartedButton size="large" authTarget={authTarget} />
        </FadeIn>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-16 px-5 bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src="/logo.svg" alt="HostFi" className="w-7 h-7 rounded-lg" />
                <span className="text-base font-semibold">HostFi</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">AI-powered expense management for rental property operators.</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-900 uppercase tracking-widest mb-4">Product</p>
              <div className="space-y-2.5">
                {["Features", "Pricing", "FAQ"].map(item => (
                  <button key={item} onClick={() => scrollTo(item.toLowerCase())} className="block text-sm text-gray-400 hover:text-gray-700 transition-colors cursor-pointer">{item}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-900 uppercase tracking-widest mb-4">Resources</p>
              <div className="space-y-2.5">
                <Link href="/blog" className="block text-sm text-gray-400 hover:text-gray-700 transition-colors">Blog</Link>
                <a href="mailto:kevin@hostfi.ai" className="block text-sm text-gray-400 hover:text-gray-700 transition-colors">Contact</a>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-900 uppercase tracking-widest mb-4">Legal</p>
              <div className="space-y-2.5">
                <Link href="/privacy" className="block text-sm text-gray-400 hover:text-gray-700 transition-colors">Privacy</Link>
                <Link href="/terms" className="block text-sm text-gray-400 hover:text-gray-700 transition-colors">Terms</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-400">&copy; 2026 HostFi. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="https://x.com/hostfi_ai" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">Twitter</a>
              <a href="mailto:kevin@hostfi.ai" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
