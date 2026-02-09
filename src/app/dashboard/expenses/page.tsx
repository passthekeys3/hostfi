"use client";

import { useState } from "react";
import Link from "next/link";
import { DEMO_EXPENSES, DEMO_PROPERTIES } from "@/lib/data";
import { getSourceIcon, getSourceLabel } from "@/lib/demo-expenses";
import { EXPENSE_CATEGORY_CONFIG, ALL_EXPENSE_CATEGORIES, getCategoryColorClasses } from "@/lib/expense-categories";
import { formatCurrency, formatDate, cn, getStatusColor } from "@/lib/utils";
import { Plus, RotateCcw, Receipt, SlidersHorizontal, Camera, StickyNote, ChevronDown, ChevronUp } from "lucide-react";
import { DuplicateAlert } from "@/components/duplicate-alert";
import { ExpenseTags } from "@/components/expense-tags";

export default function ExpensesPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedExpense, setExpandedExpense] = useState<string | null>(null);

  const filteredExpenses = DEMO_EXPENSES.filter((exp) => {
    if (statusFilter !== "all" && exp.status !== statusFilter) return false;
    if (propertyFilter !== "all" && exp.property_id !== propertyFilter) return false;
    if (categoryFilter !== "all" && exp.category !== categoryFilter) return false;
    return true;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalFiltered = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const hasActiveFilters = statusFilter !== "all" || propertyFilter !== "all" || categoryFilter !== "all";

  const selectClass = "w-full sm:w-auto px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20/20 focus:border-teal-500 min-h-[44px] transition-all duration-200";

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground mt-1.5 sm:mt-2 text-sm leading-relaxed">
            <span className="tabular-nums">{filteredExpenses.length}</span> expenses · <span className="font-medium text-foreground tabular-nums">{formatCurrency(totalFiltered)}</span> total
          </p>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <Link 
            href="/dashboard/expenses/recurring" 
            className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-white text-foreground font-medium rounded-xl text-sm border border-gray-200 min-h-[40px] transition-all duration-200 hover:bg-gray-100 hover:border-gray-200/80"
            style={{
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
            }}
          >
            <RotateCcw className="w-4 h-4" /> Recurring
          </Link>
          <Link 
            href="/dashboard/expenses/new" 
            className="flex items-center gap-2 px-4 sm:px-5 py-2.5 text-white font-medium rounded-xl text-sm min-h-[40px] transition-all duration-200 hover:translate-y-[-1px]"
            style={{
              background: 'linear-gradient(180deg, #14B8A6 0%, #0d9488 100%)',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(20, 184, 166, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            }}
          >
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Expense</span><span className="sm:hidden">Add</span>
          </Link>
        </div>
      </div>

      {/* Mobile filter toggle */}
      <div className="lg:hidden">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium min-h-[44px] transition-all duration-200",
            hasActiveFilters 
              ? "bg-teal-50 text-teal-700 ring-1 ring-teal-200/60" 
              : "bg-white text-foreground border border-gray-200"
          )}
          style={{
            boxShadow: hasActiveFilters ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.03)',
          }}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters {hasActiveFilters && "·"} {hasActiveFilters && <span className="text-xs font-semibold">Active</span>}
        </button>
      </div>

      {/* Duplicate Alert */}
      <DuplicateAlert />

      {/* Filters — always visible on desktop, toggleable on mobile */}
      <div className={cn("flex flex-col sm:flex-row flex-wrap gap-3", !showFilters && "hidden lg:flex")}>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="Filter by category" className={selectClass}
          style={{ boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)' }}
        >
          <option value="all">All Categories</option>
          {ALL_EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{EXPENSE_CATEGORY_CONFIG[c].label}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status" className={selectClass}
          style={{ boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)' }}
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
        <select value={propertyFilter} onChange={(e) => setPropertyFilter(e.target.value)} aria-label="Filter by property" className={selectClass}
          style={{ boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)' }}
        >
          <option value="all">All Properties</option>
          {DEMO_PROPERTIES.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Expense Table / Cards */}
      {filteredExpenses.length === 0 ? (
        <div 
          className="bg-white rounded-2xl p-12 text-center border border-gray-200"
          style={{
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 6px rgba(0, 0, 0, 0.02)',
          }}
        >
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-muted-foreground/50" />
          </div>
          <p className="font-medium">No expenses found</p>
          <p className="text-sm text-muted-foreground mt-1.5">Try adjusting your filters or add a new expense.</p>
          <Link 
            href="/dashboard/expenses/new" 
            className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 text-white font-medium rounded-xl text-sm transition-all duration-200 hover:translate-y-[-1px]"
            style={{
              background: 'linear-gradient(180deg, #14B8A6 0%, #0d9488 100%)',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(20, 184, 166, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            }}
          >
            <Plus className="w-4 h-4" /> Add Expense
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div 
            className="hidden lg:block bg-white rounded-2xl overflow-hidden border border-gray-200"
            style={{
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 6px rgba(0, 0, 0, 0.02)',
            }}
          >
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-4 bg-gray-50/80">Expense</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-4 bg-gray-50/80">Property</th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-4 bg-gray-50/80">Amount</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-4 bg-gray-50/80">Date</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-4 bg-gray-50/80">Source</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-4 bg-gray-50/80">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense, index) => {
                  const catConfig = EXPENSE_CATEGORY_CONFIG[expense.category];
                  const colorClasses = getCategoryColorClasses(catConfig.color);
                  const property = DEMO_PROPERTIES.find(p => p.id === expense.property_id);
                  return (
                    <tr 
                      key={expense.id} 
                      className={cn(
                        "group transition-colors duration-150 hover:bg-gray-50/60",
                        index !== filteredExpenses.length - 1 && "border-b border-gray-100"
                      )}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "flex items-center justify-center w-9 h-9 rounded-xl text-sm border transition-all duration-200 group-hover:scale-105",
                            colorClasses.bg, colorClasses.border
                          )}>
                            <catConfig.icon className="w-4 h-4" />
                          </span>
                          <div>
                            <p className="font-medium text-sm text-foreground flex items-center gap-1.5">
                              {expense.description}
                              {expense.demo_notes && <StickyNote className="w-3 h-3 text-amber-500" />}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                              {catConfig.label}{expense.vendor ? ` · ${expense.vendor}` : ''}{expense.receipt_url && <Camera className="w-3 h-3 ml-1" />}
                            </p>
                            {expense.demo_tags && expense.demo_tags.length > 0 && (
                              <ExpenseTags tags={expense.demo_tags} className="mt-1.5" />
                            )}
                            {expense.demo_notes && (
                              <p className="text-xs text-muted-foreground italic mt-1">{expense.demo_notes}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-muted-foreground">{property?.name || '—'}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-semibold text-sm tabular-nums">{formatCurrency(expense.amount)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-muted-foreground">{formatDate(expense.date)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          {(() => { const SourceIcon = getSourceIcon(expense.source); return <SourceIcon className="w-3.5 h-3.5 opacity-80" />; })()}
                          {getSourceLabel(expense.source)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-full capitalize transition-colors",
                          getStatusColor(expense.status)
                        )}>
                          {expense.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card layout */}
          <div className="lg:hidden space-y-3">
            {filteredExpenses.map((expense) => {
              const catConfig = EXPENSE_CATEGORY_CONFIG[expense.category];
              const colorClasses = getCategoryColorClasses(catConfig.color);
              const property = DEMO_PROPERTIES.find(p => p.id === expense.property_id);
              const isExpanded = expandedExpense === expense.id;
              const hasDetails = expense.demo_notes || (expense.demo_tags && expense.demo_tags.length > 0);
              return (
                <div 
                  key={expense.id} 
                  className="bg-white rounded-xl border border-gray-200 transition-all duration-200 overflow-hidden"
                  style={{
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 6px rgba(0, 0, 0, 0.02)',
                  }}
                >
                  <div 
                    className="flex items-center gap-3 p-4 cursor-pointer active:scale-[0.99]"
                    onClick={() => hasDetails && setExpandedExpense(isExpanded ? null : expense.id)}
                  >
                    <span className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-xl text-sm border shrink-0",
                      colorClasses.bg, colorClasses.border
                    )}>
                      <catConfig.icon className="w-4 h-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate flex items-center gap-1.5">
                        {expense.description}
                        {expense.demo_notes && <StickyNote className="w-3 h-3 text-amber-500 shrink-0" />}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                        {property?.name}{expense.vendor ? ` · ${expense.vendor}` : ''}{expense.receipt_url && <Camera className="w-3 h-3 ml-1" />}
                      </p>
                    </div>
                    <div className="text-right shrink-0 pl-2 flex items-center gap-2">
                      <div>
                        <p className="font-semibold text-sm tabular-nums">{formatCurrency(expense.amount)}</p>
                        <div className="flex items-center gap-1.5 justify-end mt-1">
                          <span className="text-[10px] text-muted-foreground">{formatDate(expense.date)}</span>
                          <span className={cn(
                            "text-[10px] font-medium px-2 py-0.5 rounded-full capitalize",
                            getStatusColor(expense.status)
                          )}>
                            {expense.status}
                          </span>
                        </div>
                      </div>
                      {hasDetails && (
                        isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  {/* Expanded details */}
                  {isExpanded && hasDetails && (
                    <div className="px-4 pb-4 pt-0 border-t border-gray-100 bg-gray-50/50">
                      <div className="pt-3 space-y-2">
                        {expense.demo_tags && expense.demo_tags.length > 0 && (
                          <ExpenseTags tags={expense.demo_tags} />
                        )}
                        {expense.demo_notes && (
                          <p className="text-xs text-muted-foreground italic">{expense.demo_notes}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
