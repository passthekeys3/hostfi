"use client";

import { useState, useEffect, useRef } from "react";
import {
  DollarSign, Building2, Receipt, Mail, Bot, CheckCircle2,
  ChevronRight, Zap, AlertTriangle, TrendingUp, PieChart,
  ArrowUpRight, ArrowDownRight, X
} from "lucide-react";

/* ─── Demo Data ─── */
const PROPERTIES = [
  { id: "all", name: "All Properties" },
  { id: "4b", name: "Unit 4B — Venice Beach" },
  { id: "2a", name: "Unit 2A — Silver Lake" },
  { id: "1a", name: "Unit 1A — Santa Monica" },
];

const STATS: Record<string, { revenue: number; spend: number; properties: number; anomalies: number }> = {
  all: { revenue: 12840, spend: 4280, properties: 3, anomalies: 2 },
  "4b": { revenue: 4920, spend: 1640, properties: 1, anomalies: 1 },
  "2a": { revenue: 3780, spend: 1420, properties: 1, anomalies: 1 },
  "1a": { revenue: 4140, spend: 1220, properties: 1, anomalies: 0 },
};

const EXPENSES: Record<string, { desc: string; vendor: string; amount: number; cat: string; catColor: string; date: string; prop: string }[]> = {
  all: [
    { desc: "Electric Bill", vendor: "SoCalEdison", amount: 187.40, cat: "Utility", catColor: "bg-yellow-50 text-yellow-700 border-yellow-200", date: "Mar 15", prop: "Unit 4B" },
    { desc: "Water Bill", vendor: "LADWP", amount: 94.20, cat: "Utility", catColor: "bg-blue-50 text-blue-700 border-blue-200", date: "Mar 12", prop: "Unit 2A" },
    { desc: "Deep Clean", vendor: "CleanPro LLC", amount: 150.00, cat: "Cleaning", catColor: "bg-teal-50 text-teal-700 border-teal-200", date: "Mar 10", prop: "Unit 1A" },
    { desc: "Plumbing Repair", vendor: "Mike's Plumbing", amount: 325.00, cat: "Repairs", catColor: "bg-orange-50 text-orange-700 border-orange-200", date: "Mar 8", prop: "Unit 2A" },
    { desc: "Insurance", vendor: "Allstate", amount: 800.00, cat: "Insurance", catColor: "bg-purple-50 text-purple-700 border-purple-200", date: "Mar 1", prop: "All units" },
  ],
  "4b": [
    { desc: "Electric Bill", vendor: "SoCalEdison", amount: 187.40, cat: "Utility", catColor: "bg-yellow-50 text-yellow-700 border-yellow-200", date: "Mar 15", prop: "Unit 4B" },
    { desc: "WiFi", vendor: "Spectrum", amount: 59.99, cat: "Utility", catColor: "bg-blue-50 text-blue-700 border-blue-200", date: "Mar 5", prop: "Unit 4B" },
    { desc: "Supplies", vendor: "Amazon", amount: 42.18, cat: "Supplies", catColor: "bg-green-50 text-green-700 border-green-200", date: "Mar 3", prop: "Unit 4B" },
  ],
  "2a": [
    { desc: "Water Bill", vendor: "LADWP", amount: 94.20, cat: "Utility", catColor: "bg-blue-50 text-blue-700 border-blue-200", date: "Mar 12", prop: "Unit 2A" },
    { desc: "Plumbing Repair", vendor: "Mike's Plumbing", amount: 325.00, cat: "Repairs", catColor: "bg-orange-50 text-orange-700 border-orange-200", date: "Mar 8", prop: "Unit 2A" },
    { desc: "Cleaning Fee", vendor: "TurnoverBnB", amount: 85.00, cat: "Cleaning", catColor: "bg-teal-50 text-teal-700 border-teal-200", date: "Mar 2", prop: "Unit 2A" },
  ],
  "1a": [
    { desc: "Deep Clean", vendor: "CleanPro LLC", amount: 150.00, cat: "Cleaning", catColor: "bg-teal-50 text-teal-700 border-teal-200", date: "Mar 10", prop: "Unit 1A" },
    { desc: "Gas Bill", vendor: "SoCalGas", amount: 67.30, cat: "Utility", catColor: "bg-orange-50 text-orange-700 border-orange-200", date: "Mar 6", prop: "Unit 1A" },
    { desc: "New Linens", vendor: "Target", amount: 128.50, cat: "Supplies", catColor: "bg-green-50 text-green-700 border-green-200", date: "Mar 1", prop: "Unit 1A" },
  ],
};

/* Simulated bill parsing steps */
const PARSE_STEPS = [
  { label: "Receiving email...", duration: 600 },
  { label: "Extracting text with AI...", duration: 900 },
  { label: "Identifying vendor: SoCalGas", duration: 700 },
  { label: "Amount detected: $72.40", duration: 500 },
  { label: "Category: Utility → Line 17", duration: 600 },
  { label: "Matched to: Unit 4B", duration: 500 },
];

const PARSE_RESULT = {
  vendor: "SoCalGas",
  amount: 72.40,
  category: "Utility",
  scheduleE: "Line 17 — Utilities",
  property: "Unit 4B — Venice Beach",
  confidence: 97,
};

type DemoTab = "dashboard" | "parse";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}
function fmtExact(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

/* ─── AI Parse Demo ─── */
function ParseDemo() {
  const [step, setStep] = useState(-1);
  const [done, setDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startParse = () => {
    setStep(0);
    setDone(false);
  };

  useEffect(() => {
    if (step < 0) return;
    if (step >= PARSE_STEPS.length) {
      setDone(true);
      return;
    }
    timerRef.current = setTimeout(() => setStep(s => s + 1), PARSE_STEPS[step].duration);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [step]);

  const reset = () => { setStep(-1); setDone(false); };

  return (
    <div className="space-y-4">
      {step < 0 ? (
        /* Start state — email preview */
        <div className="space-y-3">
          <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="text-[11px] text-gray-400">From: noreply@socalgas.com</span>
            </div>
            <p className="text-xs font-medium text-gray-800">Your SoCalGas Bill is Ready</p>
            <p className="text-[11px] text-gray-500 mt-1">Account ending in 4821 · Service: 742 Ocean Ave</p>
            <div className="mt-3 bg-gray-50 rounded p-2.5 border border-gray-100">
              <div className="flex justify-between text-[11px]">
                <span className="text-gray-500">Amount Due</span>
                <span className="font-semibold text-gray-800">$72.40</span>
              </div>
              <div className="flex justify-between text-[11px] mt-1">
                <span className="text-gray-500">Due Date</span>
                <span className="text-gray-700">Apr 2, 2026</span>
              </div>
            </div>
          </div>
          <button
            onClick={startParse}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-teal-500 text-white text-xs font-semibold rounded-lg hover:bg-teal-600 transition-colors"
          >
            <Bot className="w-3.5 h-3.5" /> Parse with AI
          </button>
        </div>
      ) : !done ? (
        /* Parsing animation */
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center">
              <Bot className="w-3 h-3 text-teal-600 animate-pulse" />
            </div>
            <span className="text-xs font-medium text-teal-700">AI Processing...</span>
          </div>
          {PARSE_STEPS.map((s, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 text-[11px] transition-all duration-300 ${
                i < step ? "text-gray-800" : i === step ? "text-teal-700 font-medium" : "text-gray-300"
              }`}
            >
              {i < step ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 shrink-0" />
              ) : i === step ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-teal-400 border-t-transparent animate-spin shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border border-gray-200 shrink-0" />
              )}
              {s.label}
            </div>
          ))}
        </div>
      ) : (
        /* Result */
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-500" />
            <span className="text-xs font-semibold text-teal-700">Parsed successfully</span>
            <span className="ml-auto text-[10px] font-medium text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">{PARSE_RESULT.confidence}% confidence</span>
          </div>
          <div className="bg-white rounded-lg border border-teal-200 p-3 space-y-2">
            {[
              { label: "Vendor", value: PARSE_RESULT.vendor },
              { label: "Amount", value: fmtExact(PARSE_RESULT.amount) },
              { label: "Category", value: PARSE_RESULT.category },
              { label: "Schedule E", value: PARSE_RESULT.scheduleE },
              { label: "Property", value: PARSE_RESULT.property },
            ].map((row) => (
              <div key={row.label} className="flex justify-between text-[11px]">
                <span className="text-gray-500">{row.label}</span>
                <span className="font-medium text-gray-800">{row.value}</span>
              </div>
            ))}
          </div>
          <button
            onClick={reset}
            className="w-full py-2 text-[11px] font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            ↻ Try again
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Main Interactive Demo ─── */
export function InteractiveDemo() {
  const [tab, setTab] = useState<DemoTab>("dashboard");
  const [property, setProperty] = useState("all");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<number | null>(null);
  const stats = STATS[property];
  const expenses = EXPENSES[property];
  const netProfit = stats.revenue - stats.spend;

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-b from-teal-500/5 via-transparent to-transparent rounded-3xl -m-4" />
      <div className="relative bg-white rounded-2xl border border-gray-200 shadow-xl shadow-gray-200/50 overflow-hidden">
        {/* Browser bar */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
          <div className="flex gap-1.5" aria-hidden="true">
            <div className="w-2.5 h-2.5 rounded-full bg-red-300" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-300" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-300" />
          </div>
          <div className="flex-1 max-w-sm mx-auto">
            <div className="bg-white border border-gray-200 rounded-md px-3 py-1 text-[11px] text-gray-500 text-center flex items-center justify-center gap-1">
              <svg className="w-2.5 h-2.5 text-green-500" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 1.5a2.5 2.5 0 012.5 2.5v1h-5v-1A2.5 2.5 0 018 2.5zM5.5 8h5a.5.5 0 01.5.5v4a.5.5 0 01-.5.5h-5a.5.5 0 01-.5-.5v-4a.5.5 0 01.5-.5z"/></svg>
              hostfi.ai/dashboard
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-0 px-4 py-0 bg-white border-b border-gray-100">
          {([
            { id: "dashboard" as DemoTab, label: "Dashboard", icon: PieChart },
            { id: "parse" as DemoTab, label: "AI Bill Parser", icon: Bot },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setSelectedExpense(null); }}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-teal-500 text-teal-700"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              <t.icon className="w-3 h-3" />
              {t.label}
            </button>
          ))}
          <div className="ml-auto pr-1">
            <span className="text-[9px] font-medium text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">Interactive Demo</span>
          </div>
        </div>

        {/* Content area */}
        <div className="p-4 sm:p-6 bg-[#f8f9fa] min-h-[360px] sm:min-h-[400px]">
          {tab === "dashboard" ? (
            <div className="space-y-4">
              {/* Property filter */}
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200 text-[11px] font-medium text-gray-700 hover:border-gray-300 transition-colors"
                >
                  <Building2 className="w-3 h-3 text-gray-400" />
                  {PROPERTIES.find(p => p.id === property)?.name}
                  <ChevronRight className={`w-3 h-3 text-gray-400 transition-transform ${showDropdown ? "rotate-90" : ""}`} />
                </button>
                {showDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg z-10 py-1 min-w-[200px]">
                    {PROPERTIES.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setProperty(p.id); setShowDropdown(false); setSelectedExpense(null); }}
                        className={`w-full text-left px-3 py-2 text-[11px] transition-colors ${
                          property === p.id ? "bg-teal-50 text-teal-700 font-medium" : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                {[
                  { label: "Revenue", value: fmt(stats.revenue), icon: TrendingUp, accent: "border-t-teal-400", iconBg: "bg-teal-50", iconColor: "text-teal-600", trend: "+12%", trendUp: true },
                  { label: "Expenses", value: fmt(stats.spend), icon: DollarSign, accent: "border-t-amber-400", iconBg: "bg-amber-50", iconColor: "text-amber-600", trend: "-3%", trendUp: true },
                  { label: "Net Profit", value: fmt(netProfit), icon: PieChart, accent: "border-t-teal-400", iconBg: "bg-teal-50", iconColor: "text-teal-600" },
                  { label: "Anomalies", value: String(stats.anomalies), icon: AlertTriangle, accent: stats.anomalies > 0 ? "border-t-rose-400" : "border-t-gray-200", iconBg: stats.anomalies > 0 ? "bg-rose-50" : "bg-gray-50", iconColor: stats.anomalies > 0 ? "text-rose-500" : "text-gray-400" },
                ].map((s, i) => (
                  <div key={i} className={`bg-white rounded-lg p-3 border-t-2 ${s.accent} shadow-sm`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">{s.label}</p>
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center ${s.iconBg}`}>
                        <s.icon className={`w-3 h-3 ${s.iconColor}`} />
                      </div>
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-gray-900" style={{ fontVariantNumeric: "tabular-nums" }}>{s.value}</p>
                    {s.trend && (
                      <div className="flex items-center gap-1 mt-1">
                        {s.trendUp ? <ArrowUpRight className="w-3 h-3 text-emerald-500" /> : <ArrowDownRight className="w-3 h-3 text-rose-500" />}
                        <span className={`text-[10px] font-medium ${s.trendUp ? "text-emerald-600" : "text-rose-600"}`}>{s.trend} this month</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Expense list */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Recent Expenses</p>
                  <span className="text-[10px] text-gray-400">{expenses.length} items</span>
                </div>
                {expenses.map((exp, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedExpense(selectedExpense === i ? null : i)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-gray-50 last:border-0 ${
                      selectedExpense === i ? "bg-teal-50/50" : "hover:bg-gray-50/60"
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 text-[10px] font-bold ${exp.catColor}`}>
                      {exp.cat[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-gray-800 truncate">{exp.desc}</p>
                      <p className="text-[10px] text-gray-400">{exp.vendor} · {exp.date}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] font-semibold text-gray-900 tabular-nums">{fmtExact(exp.amount)}</p>
                      <p className="text-[9px] text-gray-400">{exp.prop}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Expense detail popover */}
              {selectedExpense !== null && expenses[selectedExpense] && (
                <div className="bg-white rounded-lg border border-teal-200 p-3 shadow-sm space-y-2 animate-in fade-in slide-in-from-top-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-gray-800">{expenses[selectedExpense].desc}</span>
                    <button onClick={() => setSelectedExpense(null)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div><span className="text-gray-400">Vendor</span><p className="font-medium text-gray-700">{expenses[selectedExpense].vendor}</p></div>
                    <div><span className="text-gray-400">Amount</span><p className="font-medium text-gray-700">{fmtExact(expenses[selectedExpense].amount)}</p></div>
                    <div><span className="text-gray-400">Category</span><p className="font-medium text-gray-700">{expenses[selectedExpense].cat}</p></div>
                    <div><span className="text-gray-400">Schedule E</span><p className="font-medium text-teal-600">Line 17 — Utilities</p></div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Parse tab */
            <div className="max-w-sm mx-auto">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-teal-500" />
                <p className="text-xs font-medium text-gray-700">Forward a bill → AI handles the rest</p>
              </div>
              <ParseDemo />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
