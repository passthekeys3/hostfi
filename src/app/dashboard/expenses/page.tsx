"use client";

import { useState, useMemo } from "react";
import { EXPENSE_CATEGORY_CONFIG, getCategoryColorClasses, ALL_EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/expense-categories";
import { getSourceIcon } from "@/lib/demo-expenses";
import { formatCurrency, formatDate, cn, getStatusColor } from "@/lib/utils";
import { Receipt, Plus, StickyNote } from "lucide-react";
import Link from "next/link";
import { useDashboardData } from "@/hooks/useDashboardData";

export default function ExpensesPage() {
  const { properties, expenses, loading } = useDashboardData();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (selectedCategory !== "all" && exp.category !== selectedCategory) return false;
      if (selectedProperty !== "all" && exp.property_id !== selectedProperty) return false;
      if (selectedStatus !== "all" && exp.status !== selectedStatus) return false;
      return true;
    });
  }, [expenses, selectedCategory, selectedProperty, selectedStatus]);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded-lg" />
        <div className="h-64 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-gray-500 mt-1 sm:mt-2 text-sm leading-relaxed">
            <span className="tabular-nums">{expenses.length}</span> total expenses
          </p>
        </div>
        <Link
          href="/dashboard/expenses/new"
          className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-gray-900 text-white font-medium rounded-xl text-sm min-h-[44px] transition-colors hover:bg-gray-800 shrink-0"
        >
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Expense</span><span className="sm:hidden">Add</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm">
          <option value="all">All Categories</option>
          {ALL_EXPENSE_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{EXPENSE_CATEGORY_CONFIG[cat]?.label || cat}</option>
          ))}
        </select>
        <select value={selectedProperty} onChange={e => setSelectedProperty(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm">
          <option value="all">All Properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm">
          <option value="all">All Statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {filteredExpenses.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No expenses yet</p>
          <Link href="/dashboard/expenses/new" className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-gray-900 text-white font-medium rounded-xl text-sm hover:bg-gray-800">
            <Plus className="w-4 h-4" /> Add Your First Expense
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-4 bg-gray-50/80">Expense</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-4 bg-gray-50/80">Property</th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-4 bg-gray-50/80">Amount</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-4 bg-gray-50/80">Date</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-4 bg-gray-50/80">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense, index) => {
                  const catConfig = EXPENSE_CATEGORY_CONFIG[expense.category];
                  const colorClasses = getCategoryColorClasses(catConfig?.color || 'gray');
                  const property = properties.find(p => p.id === expense.property_id);
                  return (
                    <tr key={expense.id} className={cn("group transition-colors duration-150 hover:bg-gray-50/60", index !== filteredExpenses.length - 1 && "border-b border-gray-100")}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className={cn("flex items-center justify-center w-9 h-9 rounded-xl text-sm border", colorClasses.bg, colorClasses.border)}>
                            {catConfig?.icon && <catConfig.icon className="w-4 h-4" />}
                          </span>
                          <div>
                            <p className="font-medium text-sm">{expense.description}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{catConfig?.label || expense.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{property?.name || '—'}</td>
                      <td className="px-6 py-4 text-right font-semibold text-sm tabular-nums">{formatCurrency(expense.amount)}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(expense.date)}</td>
                      <td className="px-6 py-4">
                        <span className={cn("inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-full capitalize", getStatusColor(expense.status))}>{expense.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {filteredExpenses.map((expense) => {
              const catConfig = EXPENSE_CATEGORY_CONFIG[expense.category];
              const colorClasses = getCategoryColorClasses(catConfig?.color || 'gray');
              const property = properties.find(p => p.id === expense.property_id);
              return (
                <div key={expense.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className={cn("flex items-center justify-center w-10 h-10 rounded-xl text-sm border shrink-0", colorClasses.bg, colorClasses.border)}>
                      {catConfig?.icon && <catConfig.icon className="w-4 h-4" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{expense.description}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{property?.name} · {formatDate(expense.date)}</p>
                    </div>
                    <div className="text-right shrink-0 pl-2">
                      <p className="font-semibold text-sm tabular-nums">{formatCurrency(expense.amount)}</p>
                      <span className={cn("inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full capitalize mt-1", getStatusColor(expense.status))}>{expense.status}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
