"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2, Mail, ArrowRight, Check, Copy, Plus,
  ChevronRight, Sparkles, Home, Zap, Crown, CreditCard,
  MailCheck, Forward, ArrowDown,
} from "lucide-react";
import {
  getOnboardingState,
  setOnboardingState,
  completeOnboarding,
  type OnboardingState,
} from "@/lib/onboarding";

const TOTAL_STEPS = 5;

const inputClass =
  "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/40 text-sm transition-all duration-200";
const selectClass =
  "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/40 text-sm transition-all duration-200 appearance-none";
const btnPrimary =
  "flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition-all duration-200 text-sm shadow-sm w-full sm:w-auto";
const btnSecondary =
  "flex items-center justify-center gap-2 px-6 py-3 bg-white text-foreground font-medium rounded-xl hover:bg-gray-100 transition-all duration-200 border border-gray-200 text-sm shadow-sm";

interface AddedProperty {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  type: string;
}

type PlanId = "free" | "pro" | "business";

const PLANS: {
  id: PlanId;
  name: string;
  price: number;
  icon: typeof Building2;
  description: string;
  features: string[];
  highlight?: boolean;
}[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    icon: Building2,
    description: "Up to 5 properties",
    features: ["AI categorization (50/mo)", "Receipt scanning (10/mo)", "Basic analytics"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 15,
    icon: Zap,
    description: "Up to 25 properties",
    features: ["Unlimited AI features", "Free ACH bill pay", "Schedule E export"],
    highlight: true,
  },
  {
    id: "business",
    name: "Business",
    price: 49,
    icon: Crown,
    description: "Unlimited properties",
    features: ["Everything in Pro", "Team access (5 users)", "QuickBooks sync"],
  },
];

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === current
              ? "w-8 bg-teal-500"
              : i < current
                ? "w-1.5 bg-teal-500/40"
                : "w-1.5 bg-[#e5e3e0]"
          }`}
        />
      ))}
    </div>
  );
}

function StepWrapper({
  children,
  step,
  currentStep,
}: {
  children: React.ReactNode;
  step: number;
  currentStep: number;
}) {
  return (
    <div
      className={`transition-all duration-300 ${
        step === currentStep
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4 absolute pointer-events-none"
      }`}
    >
      {children}
    </div>
  );
}

export function OnboardingFlow({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [properties, setProperties] = useState<AddedProperty[]>([]);
  const [copied, setCopied] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("free");

  // Demo user ID for the billing email
  const userId = "demo_abc123";
  const billingEmail = `expenses-${userId}@hostfi.ai`;

  // Property form
  const [propName, setPropName] = useState("");
  const [propAddress, setPropAddress] = useState("");
  const [propCity, setPropCity] = useState("");
  const [propState, setPropState] = useState("");
  const [propZip, setPropZip] = useState("");
  const [propType, setPropType] = useState("str");
  const [showAddAnother, setShowAddAnother] = useState(false);

  useEffect(() => {
    const state = getOnboardingState();
    setStep(state.currentStep);
    if (state.selectedPlan) {
      setSelectedPlan(state.selectedPlan);
    }
  }, []);

  const saveStep = useCallback(
    (newStep: number, updates?: Partial<OnboardingState["steps"]>, plan?: PlanId) => {
      const state = getOnboardingState();
      setOnboardingState({
        ...state,
        currentStep: newStep,
        steps: updates ? { ...state.steps, ...updates } : state.steps,
        selectedPlan: plan ?? state.selectedPlan,
      });
      setStep(newStep);
    },
    []
  );

  const handleSkip = () => {
    completeOnboarding();
    onComplete();
  };

  const handleAddProperty = () => {
    if (!propName.trim()) return;
    const p: AddedProperty = {
      name: propName, address: propAddress, city: propCity,
      state: propState, zip: propZip, type: propType,
    };
    setProperties((prev) => [...prev, p]);
    setPropName(""); setPropAddress(""); setPropCity("");
    setPropState(""); setPropZip(""); setPropType("str");
    setShowAddAnother(true);
  };

  const copyEmail = () => {
    navigator.clipboard.writeText(billingEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFinish = () => {
    completeOnboarding();
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-[600px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <ProgressDots current={step} total={TOTAL_STEPS} />
            <span className="text-xs text-muted-foreground tabular-nums">
              {step + 1} / {TOTAL_STEPS}
            </span>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-200/60 p-8 sm:p-10 relative min-h-[420px]">
            {/* Step 1: Welcome */}
            <StepWrapper step={0} currentStep={step}>
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-teal-500/10 rounded-2xl flex items-center justify-center mx-auto">
                  <Sparkles className="w-8 h-8 text-teal-600" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold tracking-tight">Welcome to HostFi!</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Let&apos;s get your properties set up in under 2 minutes.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 sm:gap-6 py-4">
                  {[
                    { icon: Building2, label: "Add property" },
                    { icon: Mail, label: "Set up billing" },
                    { icon: CreditCard, label: "Choose plan" },
                  ].map((item, i) => (
                    <div key={item.label} className="flex items-center gap-3 sm:gap-6">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center">
                          <item.icon className="w-5 h-5 text-teal-600" />
                        </div>
                        <span className="text-xs text-muted-foreground">{item.label}</span>
                      </div>
                      {i < 2 && <ChevronRight className="w-4 h-4 text-[#d5d3d0] mt-[-20px]" />}
                    </div>
                  ))}
                </div>

                <div className="space-y-3 pt-2">
                  <button onClick={() => saveStep(1, { welcome: true })} className={btnPrimary + " mx-auto"}>
                    Let&apos;s Go <ArrowRight className="w-4 h-4" />
                  </button>
                  <button onClick={handleSkip} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    Skip setup
                  </button>
                </div>
              </div>
            </StepWrapper>

            {/* Step 2: Add Property */}
            <StepWrapper step={1} currentStep={step}>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-teal-500/10 rounded-xl flex items-center justify-center shrink-0">
                    <Home className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">Add your first property</h2>
                    <p className="text-sm text-muted-foreground mt-1">Start tracking expenses for your rental.</p>
                  </div>
                </div>

                {properties.length > 0 && (
                  <div className="space-y-2">
                    {properties.map((p, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-teal-500/5 border border-teal-500/15 rounded-xl">
                        <div className="w-8 h-8 bg-teal-500/10 rounded-lg flex items-center justify-center">
                          <Check className="w-4 h-4 text-teal-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {p.city}{p.state ? `, ${p.state}` : ""} · {p.type.toUpperCase()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(!showAddAnother || propName) && (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="onboarding-prop-name" className="block text-sm font-medium mb-1.5">Property Name</label>
                      <input id="onboarding-prop-name" value={propName} onChange={(e) => setPropName(e.target.value)} placeholder="e.g. Venice Beach Unit" className={inputClass} />
                    </div>
                    <div>
                      <label htmlFor="onboarding-prop-address" className="block text-sm font-medium mb-1.5">Address</label>
                      <input id="onboarding-prop-address" value={propAddress} onChange={(e) => setPropAddress(e.target.value)} placeholder="Street address" className={inputClass} />
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      <div className="col-span-2">
                        <label htmlFor="onboarding-prop-city" className="sr-only">City</label>
                        <input id="onboarding-prop-city" value={propCity} onChange={(e) => setPropCity(e.target.value)} placeholder="City" className={inputClass} />
                      </div>
                      <label htmlFor="onboarding-prop-state" className="sr-only">State</label>
                      <input id="onboarding-prop-state" value={propState} onChange={(e) => setPropState(e.target.value)} placeholder="State" className={inputClass} />
                      <label htmlFor="onboarding-prop-zip" className="sr-only">Zip code</label>
                      <input id="onboarding-prop-zip" value={propZip} onChange={(e) => setPropZip(e.target.value)} placeholder="Zip" className={inputClass} />
                    </div>
                    <div>
                      <label htmlFor="onboarding-prop-type" className="block text-sm font-medium mb-1.5">Property Type</label>
                      <select id="onboarding-prop-type" value={propType} onChange={(e) => setPropType(e.target.value)} className={selectClass}>
                        <option value="str">Short-Term Rental (STR)</option>
                        <option value="ltr">Long-Term Rental (LTR)</option>
                        <option value="primary">Primary Residence</option>
                      </select>
                    </div>
                    <button onClick={handleAddProperty} disabled={!propName.trim()} className={`${btnPrimary} ${!propName.trim() ? "opacity-50 cursor-not-allowed" : ""}`}>
                      <Plus className="w-4 h-4" aria-hidden="true" /> Add Property
                    </button>
                  </div>
                )}

                {showAddAnother && !propName && (
                  <button onClick={() => { setShowAddAnother(false); }} className={btnSecondary + " w-full justify-center"}>
                    <Plus className="w-4 h-4" /> Add Another Property
                  </button>
                )}

                <div className="flex items-center justify-between pt-2">
                  <button onClick={() => saveStep(2, { addProperty: false })} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    Skip for now
                  </button>
                  {properties.length > 0 && (
                    <button onClick={() => saveStep(2, { addProperty: true })} className={btnPrimary}>
                      Continue <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </StepWrapper>

            {/* Step 3: Set Billing Email */}
            <StepWrapper step={2} currentStep={step}>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-teal-500/10 rounded-xl flex items-center justify-center shrink-0">
                    <MailCheck className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">Set up billing email</h2>
                    <p className="text-sm text-muted-foreground mt-1">Forward bills to automatically track expenses.</p>
                  </div>
                </div>

                {/* Unique email section */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-teal-600" />
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your Unique Billing Email</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm font-mono text-teal-700 bg-white border border-gray-200 rounded-lg px-3 py-2.5 break-all">
                      {billingEmail}
                    </code>
                    <button onClick={copyEmail} className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-all shadow-sm shrink-0">
                      {copied ? <Check className="w-4 h-4 text-teal-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* How it works */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">How it works</p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 bg-teal-500/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                        <Forward className="w-3.5 h-3.5 text-teal-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Forward your bills</p>
                        <p className="text-xs text-muted-foreground">Set up auto-forwarding from utilities, insurance, etc.</p>
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <ArrowDown className="w-4 h-4 text-gray-300" />
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 bg-teal-500/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">AI parses everything</p>
                        <p className="text-xs text-muted-foreground">We extract amounts, dates, and categories automatically.</p>
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <ArrowDown className="w-4 h-4 text-gray-300" />
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 bg-teal-500/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3.5 h-3.5 text-teal-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Expenses logged</p>
                        <p className="text-xs text-muted-foreground">Review and approve, or let it run hands-free.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button onClick={() => saveStep(3, { setupBilling: false })} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    I&apos;ll do this later
                  </button>
                  <button onClick={() => saveStep(3, { setupBilling: true })} className={btnPrimary}>
                    Next <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </StepWrapper>

            {/* Step 4: Choose Plan */}
            <StepWrapper step={3} currentStep={step}>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-teal-500/10 rounded-xl flex items-center justify-center shrink-0">
                    <CreditCard className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">Choose your plan</h2>
                    <p className="text-sm text-muted-foreground mt-1">Start free, upgrade anytime.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {PLANS.map((plan) => {
                    const PlanIcon = plan.icon;
                    const isSelected = selectedPlan === plan.id;
                    return (
                      <button
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan.id)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                          isSelected
                            ? "border-teal-500 bg-teal-500/5"
                            : plan.highlight
                              ? "border-gray-200 bg-white hover:border-teal-300"
                              : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected ? "bg-teal-500/10" : "bg-gray-50"
                          }`}>
                            <PlanIcon className={`w-5 h-5 ${isSelected ? "text-teal-600" : "text-gray-400"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold">{plan.name}</p>
                                {plan.highlight && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-teal-500 text-white rounded-full">Popular</span>
                                )}
                              </div>
                              <p className="text-sm font-bold tabular-nums">
                                ${plan.price}<span className="text-xs font-normal text-muted-foreground">{plan.price > 0 ? "/mo" : ""}</span>
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                              {plan.features.map((f, i) => (
                                <span key={i} className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <Check className="w-3 h-3 text-teal-500" /> {f}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 ${
                            isSelected ? "border-teal-500 bg-teal-500" : "border-gray-300"
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button onClick={() => saveStep(4, { choosePlan: false })} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    Skip for now
                  </button>
                  <button onClick={() => saveStep(4, { choosePlan: true }, selectedPlan)} className={btnPrimary}>
                    {selectedPlan === "free" ? "Start Free" : `Choose ${PLANS.find(p => p.id === selectedPlan)?.name}`} <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </StepWrapper>

            {/* Step 5: Done */}
            <StepWrapper step={4} currentStep={step}>
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-teal-500/10 rounded-2xl flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-teal-600" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold tracking-tight">You&apos;re all set!</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {properties.length > 0 ? `${properties.length} ${properties.length === 1 ? "property" : "properties"} added` : "No properties yet"}
                    {" · "}
                    {selectedPlan === "free" ? "Free plan" : `${PLANS.find(p => p.id === selectedPlan)?.name} plan`}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                  {[
                    { title: "View dashboard", desc: "See your overview", icon: Home },
                    { title: "Add properties", desc: "Expand your portfolio", icon: Building2 },
                    { title: "Forward a bill", desc: "Test email parsing", icon: Mail },
                  ].map((card) => (
                    <button
                      key={card.title}
                      onClick={handleFinish}
                      className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-all text-left group"
                    >
                      <div className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center shrink-0 group-hover:border-teal-500/30">
                        <card.icon className="w-4 h-4 text-teal-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{card.title}</p>
                        <p className="text-xs text-muted-foreground">{card.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <button onClick={handleFinish} className={btnPrimary + " mx-auto"}>
                  Go to Dashboard <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </StepWrapper>
          </div>
        </div>
      </div>
    </div>
  );
}
