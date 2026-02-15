"use client";

import { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EXPENSE_CATEGORY_CONFIG, ALL_EXPENSE_CATEGORIES, FREQUENCY_LABELS, getCategoryColorClasses, type ExpenseCategory, type ExpenseFrequency } from "@/lib/expense-categories";
import { useDashboardData } from "@/hooks/useDashboardData";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, ChevronUp, Camera, Info } from "lucide-react";
import ReceiptUpload from "@/components/receipt-upload";

function NewExpenseForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { properties, isDemo } = useDashboardData();
  const preselectedCategory = searchParams.get("category") as ExpenseCategory | null;

  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(preselectedCategory);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<ExpenseFrequency>("monthly");
  const [showNotes, setShowNotes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptApplied, setReceiptApplied] = useState(false);

  // Form refs for auto-fill
  const amountRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const vendorRef = useRef<HTMLInputElement>(null);

  const handleReceiptData = (data: {
    amount: number;
    vendor: string;
    date: string;
    category: ExpenseCategory;
  }) => {
    if (amountRef.current) amountRef.current.value = data.amount.toFixed(2);
    if (dateRef.current) dateRef.current.value = data.date;
    if (vendorRef.current) vendorRef.current.value = data.vendor;
    setSelectedCategory(data.category);
    setReceiptApplied(true);
    setReceiptOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => router.push("/dashboard/expenses"), 500);
  };

  const inputClass = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-sm transition-all";

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add Expense</h1>
        <p className="text-muted-foreground mt-2 leading-relaxed">Record a new expense for one of your properties</p>
      </div>

      {isDemo && (
        <div className="max-w-2xl mb-4 px-4 py-3 bg-amber-500/5 border border-amber-500/15 rounded-xl text-sm text-muted-foreground flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" /> Demo Mode — Data won&apos;t be saved
        </div>
      )}

      {/* Receipt Scanner Section */}
      <div className="max-w-2xl">
        <button
          type="button"
          onClick={() => setReceiptOpen(!receiptOpen)}
          className={cn(
            "w-full flex items-center justify-between px-5 py-4 rounded-2xl border text-left transition-all duration-200",
            receiptApplied
              ? "bg-teal-50/50 border-teal-200/60"
              : "bg-white border-gray-200/60 hover:border-teal-400/40 shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
          )}
        >
          <div className="flex items-center gap-3">
            <span className={cn(
              "flex items-center justify-center w-9 h-9 rounded-xl",
              receiptApplied ? "bg-teal-100 text-teal-600" : "bg-gray-100 text-muted-foreground"
            )}>
              <Camera className="w-4.5 h-4.5" />
            </span>
            <div>
              <p className="text-sm font-medium flex items-center gap-1">
                {receiptApplied ? "Receipt scanned ✓" : <><Camera className="w-4 h-4" /> Scan a Receipt</>}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {receiptApplied
                  ? "Data auto-filled from receipt"
                  : "Take a photo or upload a receipt to auto-fill expense details"}
              </p>
            </div>
          </div>
          {receiptOpen ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
        </button>

        {receiptOpen && (
          <div className="mt-3 pl-1">
            <ReceiptUpload onDataReady={handleReceiptData} />
          </div>
        )}
      </div>

      {/* Category Selection */}
      <div className="max-w-2xl">
        {selectedCategory ? (
          <div className="mb-6">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Category</p>
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all",
                getCategoryColorClasses(EXPENSE_CATEGORY_CONFIG[selectedCategory].color).bg,
                getCategoryColorClasses(EXPENSE_CATEGORY_CONFIG[selectedCategory].color).border,
              )}
            >
              {(() => { const CatIcon = EXPENSE_CATEGORY_CONFIG[selectedCategory].icon; return <CatIcon className="w-4 h-4" />; })()}
              <span>{EXPENSE_CATEGORY_CONFIG[selectedCategory].label}</span>
              <span className="text-muted-foreground ml-1">✕</span>
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium mb-3">Choose a category</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
              {ALL_EXPENSE_CATEGORIES.map((cat) => {
                const config = EXPENSE_CATEGORY_CONFIG[cat];
                const colors = getCategoryColorClasses(config.color);
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-2xl border border-gray-200/60 bg-white transition-all duration-200 text-center",
                      "hover:shadow-md hover:translate-y-[-1px] hover:border-accent/40"
                    )}
                  >
                    <span className={cn("flex items-center justify-center w-11 h-11 rounded-full", colors.bg)}>
                      <config.icon className="w-5 h-5" />
                    </span>
                    <span className="text-xs font-medium">{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Form */}
      {selectedCategory && (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
          <div>
            <label className="block text-sm font-medium mb-2">Property</label>
            <select className={inputClass} required>
              <option value="">Select property...</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">$</span>
              <input
                ref={amountRef}
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                className="w-full pl-9 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-lg font-semibold transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Date</label>
              <input ref={dateRef} type="date" defaultValue={new Date().toISOString().split('T')[0]} required className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Vendor / Description</label>
              <input ref={vendorRef} type="text" placeholder="e.g. CleanBnB, Home Depot..." className={inputClass} />
            </div>
          </div>

          {/* Recurring toggle */}
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-[22px] bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-500/20 rounded-full peer peer-checked:after:translate-x-[18px] rtl:peer-checked:after:-translate-x-[18px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-[18px] after:w-[18px] after:transition-all after:shadow-sm peer-checked:bg-teal-500"></div>
            </label>
            <span className="text-sm font-medium">Make this recurring</span>
          </div>

          {isRecurring && (
            <div>
              <label className="block text-sm font-medium mb-2">Frequency</label>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value as ExpenseFrequency)} className={inputClass}>
                {(Object.entries(FREQUENCY_LABELS) as [ExpenseFrequency, string][]).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium mb-2">Tags (comma-separated)</label>
            <input 
              type="text" 
              placeholder="e.g. tax-deductible, emergency, recurring" 
              className={inputClass} 
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Suggested: tax-deductible, emergency, recurring, reimbursable
            </p>
          </div>

          {/* Notes */}
          {!showNotes ? (
            <button type="button" onClick={() => setShowNotes(true)} className="text-sm text-accent hover:underline font-medium">
              + Add notes
            </button>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-2">Notes</label>
              <textarea
                rows={3}
                placeholder="Any additional details..."
                className={`${inputClass} resize-none`}
              />
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 bg-white text-foreground font-medium rounded-xl hover:bg-gray-100 transition-all duration-200 border border-gray-200 shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? "Adding..." : "Add Expense"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function NewExpensePage() {
  return (
    <Suspense>
      <NewExpenseForm />
    </Suspense>
  );
}
