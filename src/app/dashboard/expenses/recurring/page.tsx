"use client";

import Link from "next/link";
import { DEMO_RECURRING_EXPENSES } from "@/lib/demo-expenses";
import { EXPENSE_CATEGORY_CONFIG, FREQUENCY_LABELS, getCategoryColorClasses } from "@/lib/expense-categories";
import { DEMO_PROPERTIES } from "@/lib/data";
import { isDemoMode } from "@/lib/data/data-provider";
import { useDashboardData } from "@/hooks/useDashboardData";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { Plus, Pause, Pencil, ArrowLeft } from "lucide-react";

export default function RecurringExpensesPage() {
  const demo = isDemoMode();
  const { properties: realProperties } = useDashboardData();
  const recurringExpenses = demo ? DEMO_RECURRING_EXPENSES : [];
  const properties = demo ? DEMO_PROPERTIES : realProperties;
  const activeExpenses = recurringExpenses.filter(e => e.is_active);
  const totalMonthly = activeExpenses.reduce((sum, e) => {
    switch (e.frequency) {
      case 'monthly': return sum + e.amount;
      case 'quarterly': return sum + e.amount / 3;
      case 'semi-annual': return sum + e.amount / 6;
      case 'annual': return sum + e.amount / 12;
      case 'weekly': return sum + e.amount * 4.33;
      default: return sum;
    }
  }, 0);

  return (
    <div className="space-y-10">
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          <Link href="/dashboard/expenses" className="p-2 hover:bg-gray-100 rounded-xl transition-colors duration-150 min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Recurring</h1>
            <p className="text-muted-foreground mt-1 sm:mt-2 text-sm leading-relaxed">
              {activeExpenses.length} active · ~{formatCurrency(totalMonthly)}/mo
            </p>
          </div>
        </div>
        <Link href="/dashboard/expenses/new" className="flex items-center gap-2 px-3 sm:px-5 py-2.5 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition-all duration-200 text-sm shadow-sm min-h-[44px] shrink-0">
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Recurring</span><span className="sm:hidden">Add</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-5">
        {recurringExpenses.map((expense) => {
          const catConfig = EXPENSE_CATEGORY_CONFIG[expense.category];
          const colors = getCategoryColorClasses(catConfig.color);
          const property = properties.find(p => p.id === expense.property_id);

          return (
            <div key={expense.id} className={cn("bg-white rounded-xl sm:rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-200/60 p-4 sm:p-6 flex gap-3 sm:gap-4 hover:shadow-md hover:translate-y-[-1px] transition-all duration-200", !expense.is_active && "opacity-50")}>
              <span className={cn("flex items-center justify-center w-10 h-10 rounded-full shrink-0", colors.bg)}>
                <catConfig.icon className="w-5 h-5" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{expense.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{property?.name} · {expense.vendor}</p>
                  </div>
                  <p className="font-semibold text-sm whitespace-nowrap shrink-0">{formatCurrency(expense.amount)}</p>
                </div>
                <div className="flex items-center justify-between mt-3 gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="px-2 sm:px-2.5 py-0.5 rounded-full bg-gray-100 font-medium">{FREQUENCY_LABELS[expense.frequency]}</span>
                    <span className="hidden sm:inline">Next: {formatDate(expense.next_due_date)}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-150 min-w-[36px] min-h-[36px] flex items-center justify-center" title="Pause" aria-label="Pause recurring expense">
                      <Pause className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-150 min-w-[36px] min-h-[36px] flex items-center justify-center" title="Edit" aria-label="Edit recurring expense">
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
