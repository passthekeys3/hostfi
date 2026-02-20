"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { StatCard } from "@/components/stat-card";
import { getCategoryConfig, getCategoryColorClasses } from "@/lib/expense-categories";
import { formatCurrency, formatDate, cn, getStatusColor } from "@/lib/utils";
import { DollarSign, Building2, Receipt, Plus, Search, CheckCircle2, ArrowRight, Sparkles, Link2, Wallet, TrendingUp } from "lucide-react";
import { AnomalySummary } from "@/components/anomaly-summary";
import { OnboardingGate } from "@/components/onboarding-gate";
import { DuplicateAlert } from "@/components/duplicate-alert";
import { useDashboardData } from "@/hooks/useDashboardData";

// Welcome checklist component for new users
function WelcomeChecklist({ 
  hasProperty, 
  hasExpense, 
  onDismiss 
}: { 
  hasProperty: boolean; 
  hasExpense: boolean;
  onDismiss: () => void;
}) {
  const steps = [
    {
      id: 'property',
      title: 'Add your first property',
      description: 'Start by adding a rental property to track',
      href: '/dashboard/properties/new',
      completed: hasProperty,
      icon: Building2,
    },
    {
      id: 'expense',
      title: 'Track an expense',
      description: 'Log your first expense or import from CSV',
      href: '/dashboard/expenses/new',
      completed: hasExpense,
      icon: Receipt,
    },
    {
      id: 'integrations',
      title: 'Connect an integration',
      description: 'Link Airbnb, Guesty, or your email for auto-import',
      href: '/dashboard/integrations',
      completed: false,
      icon: Link2,
    },
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const allCompleted = completedCount === steps.length;

  return (
    <div className="bg-gradient-to-br from-teal-50 via-white to-cyan-50 rounded-2xl border border-teal-100/60 p-6 sm:p-8 mb-8 sm:mb-10 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-teal-100/30 to-transparent rounded-full -mr-32 -mt-32 pointer-events-none" />
      
      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Welcome to HostFi 👋</h2>
              <p className="text-sm text-gray-600 mt-0.5">Let&apos;s get your property finances organized</p>
            </div>
          </div>
          {(hasProperty && hasExpense) && (
            <button
              onClick={onDismiss}
              className="text-xs text-gray-500 hover:text-gray-700 font-medium px-3 py-1.5 rounded-lg hover:bg-white/60 transition-colors"
            >
              Dismiss
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-gray-600 font-medium">{completedCount} of {steps.length} completed</span>
            {allCompleted && <span className="text-teal-600 font-semibold">All done! 🎉</span>}
          </div>
          <div className="h-2 bg-gray-200/60 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-teal-400 to-teal-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(completedCount / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step) => (
            <Link
              key={step.id}
              href={step.href}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 group",
                step.completed
                  ? "bg-white/60 border-teal-200/60"
                  : "bg-white border-gray-200/80 hover:border-teal-300 hover:shadow-sm"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                step.completed ? "bg-teal-100" : "bg-gray-100 group-hover:bg-teal-50"
              )}>
                <step.icon className={cn(
                  "w-5 h-5",
                  step.completed ? "text-teal-600" : "text-gray-500 group-hover:text-teal-600"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={cn(
                    "font-medium text-sm",
                    step.completed ? "text-gray-500" : "text-gray-900"
                  )}>
                    {step.title}
                  </p>
                </div>
                <p className="text-xs text-gray-600 mt-0.5">{step.description}</p>
              </div>
              <div className="shrink-0">
                {step.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-teal-500" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-teal-500 transition-colors" />
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { properties, expenses, anomalies, revenue, loading } = useDashboardData();
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

  // Check localStorage for dismissed state
  useEffect(() => {
    const dismissed = localStorage.getItem('hostfi-welcome-dismissed');
    if (dismissed === 'true') {
      setWelcomeDismissed(true);
    }
  }, []);

  // Current month filter for "Monthly Spend" card (must be before early returns)
  const [currentMonthStr, setCurrentMonthStr] = useState<string>('');
  useEffect(() => {
    const now = new Date();
    setCurrentMonthStr(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  }, []);

  const handleDismissWelcome = () => {
    setWelcomeDismissed(true);
    localStorage.setItem('hostfi-welcome-dismissed', 'true');
  };

  if (loading) {
    return (
      <div className="space-y-8 sm:space-y-12 animate-pulse">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-40 bg-gray-200 rounded-lg" />
            <div className="h-4 w-64 bg-gray-100 rounded mt-2" />
          </div>
          <div className="hidden sm:flex gap-3">
            <div className="h-10 w-36 bg-gray-200 rounded-xl" />
            <div className="h-10 w-36 bg-gray-100 rounded-xl" />
          </div>
        </div>
        {/* Stat cards skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 sm:p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-3 w-24 bg-gray-100 rounded" />
                <div className="w-9 h-9 bg-gray-50 rounded-lg" />
              </div>
              <div className="h-8 w-28 bg-gray-200 rounded" />
              <div className="h-3 w-20 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
        {/* Recent expenses skeleton */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="h-3 w-32 bg-gray-200 rounded" />
            <div className="h-3 w-16 bg-gray-100 rounded" />
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 last:border-0">
                <div className="w-9 h-9 bg-gray-100 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 bg-gray-100 rounded" />
                  <div className="h-3 w-24 bg-gray-50 rounded" />
                </div>
                <div className="h-4 w-20 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show welcome checklist for new users (has 0 properties OR 0 expenses)
  const isNewUser = properties.length === 0 || expenses.length === 0;
  const showWelcome = isNewUser && !welcomeDismissed;

  const currentMonthExpenses = currentMonthStr ? expenses.filter((e) => e.date?.startsWith(currentMonthStr)) : [];
  const totalSpend = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const currentMonthRevenue = currentMonthStr ? revenue.filter((r) => (r.date || r.payout_date)?.startsWith(currentMonthStr)) : [];
  const totalRevenue = currentMonthRevenue.reduce((sum, r) => sum + (r.payout_amount ?? r.amount ?? 0), 0);
  const netProfit = totalRevenue - totalSpend;
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
      {/* Welcome Checklist for New Users */}
      {showWelcome && (
        <WelcomeChecklist
          hasProperty={properties.length > 0}
          hasExpense={expenses.length > 0}
          onDismiss={handleDismissWelcome}
        />
      )}

      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-gray-600 mt-1.5 sm:mt-2 text-sm leading-relaxed">Overview of Your Property Expenses</p>
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
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(totalRevenue)}
          icon={Wallet}
          accent="teal"
          href="/dashboard/revenue"
        />
        <StatCard
          title="Monthly Spend"
          value={formatCurrency(totalSpend)}
          icon={DollarSign}
          accent="amber"
          href="/dashboard/expenses"
        />
        <StatCard
          title="Net Profit"
          value={(netProfit < 0 ? '-' : '') + formatCurrency(Math.abs(netProfit))}
          subtitle={netProfit >= 0 ? 'Profitable' : 'Loss'}
          icon={TrendingUp}
          accent={netProfit >= 0 ? 'teal' : 'rose'}
          href="/dashboard/analytics"
        />
        <StatCard
          title="Properties"
          value={String(properties.length)}
          subtitle={`${properties.filter(p => p.property_type === 'str').length} STR, ${properties.filter(p => p.property_type === 'ltr').length} LTR`}
          icon={Building2}
          accent="blue"
          href="/dashboard/properties"
        />
        <StatCard
          title="Pending"
          value={String(pendingExpenses.length + overdueExpenses.length)}
          subtitle={overdueExpenses.length > 0 ? `${overdueExpenses.length} overdue` : 'This month'}
          icon={Receipt}
          accent="amber"
          href="/dashboard/expenses"
        />
        <StatCard
          title="Anomalies"
          value={String(anomalyCount)}
          subtitle={`${criticalCount} critical, ${highCount} high`}
          icon={Search}
          accent="rose"
          href="/dashboard/alerts"
          trend={newCount > 0 ? { value: `${newCount} new`, positive: false } : undefined}
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
        <div className="hidden lg:block bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3 bg-gray-50/80">Expense</th>
                <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3 bg-gray-50/80">Property</th>
                <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3 bg-gray-50/80">Amount</th>
                <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3 bg-gray-50/80">Date</th>
                <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3 bg-gray-50/80">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentExpenses.map((expense, index) => {
                const catConfig = getCategoryConfig(expense.category);
                const colorClasses = getCategoryColorClasses(catConfig.color);
                const property = properties.find(p => p.id === expense.property_id);
                return (
                  <tr 
                    key={expense.id} 
                    className={cn(
                      "group transition-colors duration-150 hover:bg-gray-50/60",
                      index !== recentExpenses.length - 1 && "border-b border-gray-100"
                    )}
                  >
                    <td className="px-5 py-3">
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
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">{catConfig.label}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm text-muted-foreground">{property?.name || '—'}</p>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <p className="font-semibold text-sm tabular-nums">{formatCurrency(expense.amount)}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm text-muted-foreground">{formatDate(expense.date)}</p>
                    </td>
                    <td className="px-5 py-3">
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
            const catConfig = getCategoryConfig(expense.category);
            const colorClasses = getCategoryColorClasses(catConfig.color);
            const property = properties.find(p => p.id === expense.property_id);
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

        {/* Empty state — show preview of what dashboard looks like with data */}
        {recentExpenses.length === 0 && (
          <div className="relative">
            {/* Preview overlay */}
            <div className="absolute inset-0 z-10 bg-gradient-to-b from-white/0 via-white/60 to-white flex flex-col items-center justify-end pb-8 rounded-2xl">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 px-6 py-5 text-center max-w-sm">
                <Sparkles className="w-6 h-6 text-teal-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-900 mb-1">Here&apos;s what your dashboard will look like</p>
                <p className="text-xs text-gray-500 mb-4">Add your first expense to start tracking</p>
                <Link
                  href="/dashboard/expenses/new"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white font-medium rounded-xl text-sm hover:bg-gray-800 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Expense
                </Link>
              </div>
            </div>
            {/* Blurred sample data */}
            <div className="opacity-60 pointer-events-none select-none" aria-hidden="true">
              <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                <div className="px-5 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold uppercase tracking-widest text-gray-400">Recent Expenses</p>
                </div>
                {[
                  { desc: "SoCalEdison", cat: "Utility", prop: "Unit 4B · Mar 15", amount: "$187.40", color: "bg-yellow-50 border-yellow-200" },
                  { desc: "City Water", cat: "Utility", prop: "Unit 2A · Mar 12", amount: "$94.20", color: "bg-blue-50 border-blue-200" },
                  { desc: "Deep Clean Service", cat: "Cleaning", prop: "Unit 1A · Mar 10", amount: "$150.00", color: "bg-teal-50 border-teal-200" },
                  { desc: "Allstate Insurance", cat: "Insurance", prop: "All units · Mar 1", amount: "$2,400.00", color: "bg-purple-50 border-purple-200" },
                  { desc: "Plumber - Leak Fix", cat: "Maintenance", prop: "Unit 3C · Feb 28", amount: "$325.00", color: "bg-orange-50 border-orange-200" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-50 last:border-0">
                    <div className={`w-9 h-9 rounded-xl border ${item.color} flex items-center justify-center`}>
                      <Receipt className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{item.desc}</p>
                      <p className="text-xs text-gray-500">{item.prop}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">{item.amount}</p>
                      <p className="text-[10px] text-gray-400">{item.cat}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

    </div>
    </OnboardingGate>
  );
}
