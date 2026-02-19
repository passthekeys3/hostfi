"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { FadeIn } from "./AnimatedSection";

function useAuthTarget() {
  const [target, setTarget] = useState("/login");
  useEffect(() => {
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        if (!supabase) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (session) setTarget("/dashboard");
      } catch (error) {
        console.error("Failed to check auth session:", error);
      }
    })();
  }, []);
  return target;
}

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
    features: ["Up to 25 properties", "+$2/property beyond 25", "Everything in Pro", "Cross-property benchmarking", "Team access (up to 5)", "Accountant portal", "Priority support"],
    highlighted: false,
  },
];

export function PricingToggle() {
  const [annual, setAnnual] = useState(false);
  const authTarget = useAuthTarget();

  return (
    <>
      <div className="flex items-center justify-center gap-3 mb-10">
        <button 
          onClick={() => setAnnual(false)} 
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${!annual ? "bg-gray-900 text-white" : "text-gray-600 hover:text-gray-700"}`}
          aria-pressed={!annual}
        >
          Monthly
        </button>
        <button 
          onClick={() => setAnnual(true)} 
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${annual ? "bg-gray-900 text-white" : "text-gray-600 hover:text-gray-700"}`}
          aria-pressed={annual}
        >
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
                    <span className={`text-sm ${tier.highlighted ? "text-gray-300" : "text-gray-500"}`}>{tier.monthly === 0 ? "forever" : "/mo"}</span>
                  </div>
                  {annual && tier.monthly > 0 && (
                    <p className={`text-xs mt-1.5 ${tier.highlighted ? "text-teal-400" : "text-teal-600"} font-medium`}>
                      Billed ${price * 12}/year (save ${(tier.monthly - tier.yearly) * 12}/yr)
                    </p>
                  )}
                  <p className={`text-sm mt-2 ${tier.highlighted ? "text-gray-300" : "text-gray-600"}`}>{tier.desc}</p>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${tier.highlighted ? "text-teal-400" : "text-teal-500"}`} aria-hidden="true" />
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
