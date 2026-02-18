"use client";

import { useState, useEffect } from "react";
import { Check, CreditCard, Zap, Crown, Building2, ArrowRight, Shield, AlertCircle, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

type BillingPeriod = "monthly" | "annual";
type PlanId = "free" | "pro" | "business";
type SubscriptionStatus = "active" | "past_due" | "canceled" | "trialing" | null;

interface UserPlan {
  plan: PlanId;
  subscriptionStatus: SubscriptionStatus;
  stripeConfigured: boolean;
}

const PLANS = [
  {
    id: "free" as PlanId,
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    icon: Building2,
    description: "Everything you need to get started",
    properties: "3 properties",
    ccFee: "2.9% + 0.5%",
    achFee: "Not available",
    features: [
      "Up to 3 properties",
      "AI categorization (50/mo)",
      "Ask AI (10 queries/mo)",
      "Revenue tracking (CSV)",
      "Basic analytics",
      "Receipt scanning (10/mo)",
      "Bill pay — CC only",
    ],
    notIncluded: [
      "Free ACH bill pay",
      "AI monthly summaries",
      "Schedule E tax export",
      "Anomaly detection",
      "Team access",
    ],
  },
  {
    id: "pro" as PlanId,
    name: "Pro",
    monthlyPrice: 15,
    annualPrice: 12,
    icon: Zap,
    description: "For growing portfolios",
    badge: "Most Popular",
    properties: "10 properties included",
    extraPropertyRate: "$2.50/property beyond 10",
    ccFee: "2.9% + 0.25%",
    achFee: "Free",
    features: [
      "Up to 10 properties",
      "+$2.50/property beyond 10",
      "Unlimited AI features",
      "AI monthly summaries",
      "Full anomaly detection",
      "Schedule E tax export",
      "Free ACH bill pay",
      "Unlimited receipt scanning",
      "Unlimited email parsing",
    ],
    notIncluded: [
      "Cross-property benchmarking",
      "QuickBooks / Xero sync",
      "Accountant portal",
      "Priority support",
    ],
  },
  {
    id: "business" as PlanId,
    name: "Business",
    monthlyPrice: 49,
    annualPrice: 39,
    icon: Crown,
    description: "For teams and property managers",
    properties: "25 properties included",
    extraPropertyRate: "$2/property beyond 25",
    ccFee: "2.9% + 0.25%",
    achFee: "Free",
    features: [
      "Up to 25 properties",
      "+$2/property beyond 25",
      "Everything in Pro",
      "Cross-property benchmarking",
      "Team access (up to 5)",
      "QuickBooks / Xero sync",
      "Accountant portal",
      "Priority support",
    ],
    notIncluded: [],
  },
];

export default function BillingPage() {
  const [billing, setBilling] = useState<BillingPeriod>("monthly");
  const [userPlan, setUserPlan] = useState<UserPlan>({
    plan: "free",
    subscriptionStatus: null,
    stripeConfigured: true,
  });
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load real plan from Supabase
  useEffect(() => {
    (async () => {
      try {
        const { isDemoMode } = await import("@/lib/data/data-provider");
        if (isDemoMode()) {
          setUserPlan({ plan: "business", subscriptionStatus: "active", stripeConfigured: true });
          setLoading(false);
          return;
        }
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        if (!supabase) { setLoading(false); return; }
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        const { data: profile } = await supabase.from('profiles').select('plan, subscription_status').eq('id', user.id).single();
        setUserPlan({
          plan: (profile?.plan as PlanId) || "free",
          subscriptionStatus: (profile?.subscription_status as SubscriptionStatus) || null,
          stripeConfigured: true,
        });
      } catch (error) {
        console.error("Failed to load billing info:", error);
      }
      setLoading(false);
    })();
  }, []);

  // Check for upgrade success/cancel from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const upgrade = params.get("upgrade");
    const plan = params.get("plan");

    if (upgrade === "success" && plan) {
      setSuccessMessage(`Successfully upgraded to ${plan}! Your new plan is now active.`);
      setUserPlan((prev) => ({ ...prev, plan: plan as PlanId, subscriptionStatus: "active" }));
      window.history.replaceState({}, "", "/dashboard/billing");
    } else if (upgrade === "cancelled") {
      window.history.replaceState({}, "", "/dashboard/billing");
    }
  }, []);

  const currentPlan = userPlan.plan;

  const handleUpgrade = async (planId: PlanId) => {
    if (planId === "free" || planId === currentPlan) return;

    setUpgrading(planId);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, billing }),
      });

      const data = await res.json();

      if (data.demo) {
        setUserPlan((prev) => ({ ...prev, stripeConfigured: false }));
        setSuccessMessage("Stripe is not configured yet. Billing will be available once Stripe is set up.");
      } else if (data.url) {
        window.location.href = data.url;
      } else {
        setSuccessMessage(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setSuccessMessage("Failed to start checkout. Please try again.");
    } finally {
      setUpgrading(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel your subscription? You'll keep access until the end of your billing period.")) {
      return;
    }

    setCancelling(true);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/stripe/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (data.demo) {
        setSuccessMessage("Stripe is not configured yet. Cancellation will be available once billing is set up.");
      } else if (data.success) {
        setSuccessMessage("Your subscription has been cancelled. You'll keep access until the end of your billing period.");
        setUserPlan((prev) => ({ ...prev, subscriptionStatus: "canceled" }));
      } else {
        setSuccessMessage(data.error || "Failed to cancel subscription.");
      }
    } catch {
      setSuccessMessage("Failed to cancel subscription. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  const currentPlanConfig = PLANS.find((p) => p.id === currentPlan);

  return (
    <div className="space-y-8 pb-24 lg:pb-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Billing & Plans</h1>
            <p className="text-sm text-gray-500">Manage Your Subscription and Payment Methods</p>
          </div>
        </div>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-start gap-3">
          <Check className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" />
          <p className="text-sm text-teal-800">{successMessage}</p>
        </div>
      )}

      {/* Past due warning */}
      {userPlan.subscriptionStatus === "past_due" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Payment failed</p>
            <p className="text-sm text-amber-700 mt-1">
              Please update your payment method to keep your {currentPlanConfig?.name} plan features.
            </p>
          </div>
        </div>
      )}

      {/* Current plan banner */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Current Plan</p>
            <p className="text-lg font-bold text-gray-900 mt-1">
              {currentPlanConfig?.name} Plan
            </p>
            <p className="text-sm text-gray-500">
              {currentPlanConfig?.properties}, {currentPlan === "free" ? "CC bill pay only" : "Free ACH + reduced CC fees"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "px-3 py-1.5 text-xs font-bold border rounded-full uppercase",
                userPlan.subscriptionStatus === "past_due"
                  ? "text-amber-700 bg-amber-50 border-amber-200"
                  : userPlan.subscriptionStatus === "canceled"
                  ? "text-gray-600 bg-gray-50 border-gray-200"
                  : "text-teal-700 bg-teal-50 border-teal-200"
              )}
            >
              {userPlan.subscriptionStatus === "past_due"
                ? "Past Due"
                : userPlan.subscriptionStatus === "canceled"
                ? "Cancelling"
                : "Active"}
            </span>
            {currentPlan !== "free" && userPlan.subscriptionStatus !== "canceled" && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-red-600 transition-colors"
              >
                {cancelling ? "Cancelling..." : "Cancel"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stripe not configured fallback */}
      {!userPlan.stripeConfigured && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <Mail className="w-10 h-10 text-blue-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Upgrade Coming Soon</h3>
          <p className="text-sm text-gray-600 mb-4">
            Online upgrades are not yet available. Contact us to upgrade your plan.
          </p>
          <a
            href="mailto:support@hostfi.app?subject=Plan%20Upgrade%20Request"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
          >
            <Mail className="w-4 h-4" />
            Contact Us to Upgrade
          </a>
        </div>
      )}

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setBilling("monthly")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
            billing === "monthly" ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700"
          )}
        >
          Monthly
        </button>
        <button
          onClick={() => setBilling("annual")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2",
            billing === "annual" ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700"
          )}
        >
          Annual
          <span className="px-2 py-0.5 text-[10px] font-bold bg-teal-500 text-white rounded-full">Save 20%</span>
        </button>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const price = billing === "annual" ? plan.annualPrice : plan.monthlyPrice;
          const PlanIcon = plan.icon;
          const isDowngrade = plan.id === "free" || (plan.id === "pro" && currentPlan === "business");

          return (
            <div
              key={plan.id}
              className={cn(
                "bg-white rounded-xl border p-6 transition-all relative",
                isCurrent
                  ? "border-teal-300 shadow-[0_2px_12px_rgba(20,184,166,0.15)]"
                  : plan.badge
                  ? "border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-2 ring-teal-500/20"
                  : "border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
              )}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 text-[10px] font-bold text-white bg-teal-500 rounded-full uppercase tracking-wider">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    plan.id === "business" ? "bg-amber-50" : plan.id === "pro" ? "bg-teal-50" : "bg-gray-50"
                  )}
                >
                  <PlanIcon
                    className={cn(
                      "w-5 h-5",
                      plan.id === "business" ? "text-amber-500" : plan.id === "pro" ? "text-teal-500" : "text-gray-400"
                    )}
                  />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{plan.name}</h3>
                  <p className="text-[11px] text-gray-500">{plan.description}</p>
                </div>
              </div>

              <div className="mb-5">
                <span className="text-3xl font-bold text-gray-900">${price}</span>
                <span className="text-sm text-gray-400">{price > 0 ? "/mo" : ""}</span>
                {billing === "annual" && price > 0 && (
                  <p className="text-[11px] text-teal-600 font-medium mt-1">
                    Billed ${price * 12}/year (save ${(plan.monthlyPrice - plan.annualPrice) * 12}/yr)
                  </p>
                )}
                {price === 0 && <p className="text-[11px] text-gray-400 mt-1">Free forever</p>}
              </div>

              {/* Payment fees */}
              <div className="bg-gray-50 rounded-lg p-3 mb-5 space-y-1.5">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Payment Fees</p>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Credit card</span>
                  <span className="font-medium text-gray-700">{plan.ccFee}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">ACH</span>
                  <span className={cn("font-medium", plan.achFee === "Free" ? "text-teal-600" : "text-gray-400")}>
                    {plan.achFee}
                  </span>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-2.5 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                    <Check className="w-3.5 h-3.5 text-teal-500 mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
                {plan.notIncluded.map((feature, i) => (
                  <li key={`not-${i}`} className="flex items-start gap-2 text-xs text-gray-300">
                    <span className="w-3.5 h-3.5 flex items-center justify-center mt-0.5 shrink-0 text-[10px]">—</span>
                    {feature}
                  </li>
                ))}
              </ul>

              {/* Action button */}
              {isCurrent ? (
                <button
                  disabled
                  className="w-full py-2.5 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg cursor-default"
                >
                  Current Plan
                </button>
              ) : isDowngrade ? (
                <button
                  disabled
                  className="w-full py-2.5 text-sm font-medium text-gray-400 bg-gray-50 border border-gray-200 rounded-lg cursor-not-allowed"
                >
                  {plan.id === "free" ? "Downgrade" : "Switch Plan"}
                </button>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={!!upgrading}
                  className={cn(
                    "w-full py-2.5 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2",
                    plan.badge
                      ? "text-white bg-teal-500 hover:bg-teal-600"
                      : "text-gray-700 bg-white border border-gray-200 hover:bg-gray-50"
                  )}
                >
                  {upgrading === plan.id ? (
                    "Redirecting..."
                  ) : (
                    <>
                      Upgrade to {plan.name} <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Payment methods */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-gray-400" /> Payment Methods
        </h2>
        <div className="border border-dashed border-gray-200 rounded-lg p-8 text-center">
          <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 mb-1">No payment method on file</p>
          <p className="text-xs text-gray-400 mb-4">Add a card when you upgrade to a paid plan.</p>
          <button className="px-4 py-2 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors">
            Add Payment Method
          </button>
        </div>
      </div>

      {/* Billing history */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Billing History</h2>
        {currentPlan === "free" ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-400">No invoices yet. Upgrade to see billing history.</p>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500 mb-3">Your invoices are managed through Stripe.</p>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setSuccessMessage("Stripe billing portal will be available once billing is configured.");
              }}
              className="text-sm text-teal-600 hover:text-teal-700 font-medium"
            >
              View Billing Portal →
            </a>
          </div>
        )}
      </div>

      {/* Security note */}
      <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <Shield className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-medium text-gray-700">Secure payments by Stripe</p>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            All payment processing is handled securely by Stripe. HostFi never stores your full card details. PCI DSS
            Level 1 compliant.
          </p>
        </div>
      </div>
    </div>
  );
}
