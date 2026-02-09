import Link from "next/link";
import { StatCard } from "@/components/stat-card";
import { DEMO_PROPERTIES, DEMO_EXPENSES, DEMO_ANOMALIES } from "@/lib/data";
import { getSourceIcon } from "@/lib/demo-expenses";
import { EXPENSE_CATEGORY_CONFIG, getCategoryColorClasses } from "@/lib/expense-categories";
import { formatCurrency, formatDate, cn, getStatusColor } from "@/lib/utils";
import { DollarSign, Building2, Receipt, Plus, Search, StickyNote } from "lucide-react";
import { AnomalySummary } from "@/components/anomaly-summary";
import { OnboardingGate } from "@/components/onboarding-gate";
import { DuplicateAlert } from "@/components/duplicate-alert";

export default function DashboardPage() {
  // Data layer — returns demo data when Supabase is not configured
  const properties = DEMO_PROPERTIES;
  const expenses = DEMO_EXPENSES;
  const anomalies = DEMO_ANOMALIES;

  const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0);
  const pendingExpenses = expenses.filter((e) => e.status === 'pending');
  const overdueExpenses = expenses.filter((e) => e.status === 'overdue');
  const recentExpenses = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  const anomalyCount = anomalies.length;
  const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
  const highCount = anomalies.filter(a => a.severity === 'high').length;
  const newCount = anomalies.filter(a => a.status === 'new').length;

  return (
    <OnboardingGate>
    <div className="space-y-8 sm:space-y-12">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-gray-500 mt-1.5 sm:mt-2 text-sm leading-relaxed">Overview of Your Property Expenses</p>
        </div>
        <div className="hidden sm:flex gap-3">
          <Link 
            href="/dashboard/properties/new" 
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white font-medium rounded-xl text-sm min-h-[40px] transition-colors hover:bg-gray-800"
          >
            <Plus className="w-4 h-4" /> Add Property
          </Link>
          <Link 
            href="/dashboard/expenses/new" 
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl text-sm min-h-[40px] transition-colors hover:bg-gray-200"
          >
            <Receipt className="w-4 h-4" /> Add Expense
          </Link>
        </div>
        {/* Mobile: compact add button */}
        <Link 
          href="/dashboard/expenses/new" 
          className="sm:hidden flex items-center justify-center w-11 h-11 bg-gray-900 text-white rounded-xl transition-colors hover:bg-gray-800 active:scale-95"
        >
          <Plus className="w-5 h-5" />
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          title="Monthly Spend"
          value={formatCurrency(totalSpend)}
          icon={DollarSign}
          accent="teal"
          trend={{ value: "12% from last month", positive: false }}
        />
        <StatCard
          title="Properties"
          value={String(properties.length)}
          subtitle={`${properties.filter(p => p.property_type === 'str').length} STR, ${properties.filter(p => p.property_type === 'ltr').length} LTR`}
          icon={Building2}
          accent="blue"
        />
        <StatCard
          title="Pending"
          value={String(pendingExpenses.length + overdueExpenses.length)}
          subtitle={overdueExpenses.length > 0 ? `${overdueExpenses.length} overdue` : 'This month'}
          icon={Receipt}
          accent="amber"
        />
        <StatCard
          title="Anomalies"
          value={String(anomalyCount)}
          subtitle={`${criticalCount} critical, ${highCount} high`}
          icon={Search}
          accent="rose"
          trend={{ value: `${newCount} new`, positive: false }}
        />
      </div>

      {/* Anomaly Summary */}
      <AnomalySummary />

      {/* Duplicate Alert */}
      <DuplicateAlert />

      {/* Recent Expenses Section */}
      <section aria-labelledby="recent-expenses-heading" className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 id="recent-expenses-heading" className="text-sm font-semibold uppercase tracking-widest text-gray-400">Recent Expenses</h2>
          <Link href="/dashboard/expenses" className="text-sm font-medium text-accent hover:text-teal-700 transition-colors duration-200">
            View all →
          </Link>
        </div>

        {/* Desktop table */}
        <div className="hidden lg:block bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm"
        >
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
              {recentExpenses.map((expense, index) => {
                const catConfig = EXPENSE_CATEGORY_CONFIG[expense.category];
                const colorClasses = getCategoryColorClasses(catConfig.color);
                const property = DEMO_PROPERTIES.find(p => p.id === expense.property_id);
                return (
                  <tr 
                    key={expense.id} 
                    className={cn(
                      "group transition-colors duration-150 hover:bg-gray-50/60",
                      index !== recentExpenses.length - 1 && "border-b border-gray-100"
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
                            {expense.demo_notes && (
                              <StickyNote className="w-3 h-3 text-amber-500" />
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">{catConfig.label} · {(() => { const SourceIcon = getSourceIcon(expense.source); return <SourceIcon className="w-3 h-3 inline" />; })()}</p>
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
          {recentExpenses.map((expense) => {
            const catConfig = EXPENSE_CATEGORY_CONFIG[expense.category];
            const colorClasses = getCategoryColorClasses(catConfig.color);
            const property = DEMO_PROPERTIES.find(p => p.id === expense.property_id);
            return (
              <div 
                key={expense.id} 
                className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm transition-all duration-200 active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-xl text-sm border shrink-0",
                    colorClasses.bg, colorClasses.border
                  )}>
                    <catConfig.icon className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate flex items-center gap-1.5">
                      {expense.description}
                      {expense.demo_notes && (
                        <StickyNote className="w-3 h-3 text-amber-500 shrink-0" />
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{property?.name} · {formatDate(expense.date)}</p>
                  </div>
                  <div className="text-right shrink-0 pl-2">
                    <p className="font-semibold text-sm tabular-nums">{formatCurrency(expense.amount)}</p>
                    <span className={cn(
                      "inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full capitalize mt-1",
                      getStatusColor(expense.status)
                    )}>
                      {expense.status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
    </OnboardingGate>
  );
}
