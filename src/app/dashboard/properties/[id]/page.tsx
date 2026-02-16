"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getExpensesByCategory } from "@/lib/demo-expenses";
import { EXPENSE_CATEGORY_CONFIG } from "@/lib/expense-categories";
import { cn, getPropertyTypeLabel, formatCurrency } from "@/lib/utils";
import { ArrowLeft, MapPin, Plus, Bed, Bath, Ruler, Building2, Landmark, Mail } from "lucide-react";
import { PropertyExportBar } from "@/components/property-export-bar";
import { useDashboardData } from "@/hooks/useDashboardData";

export default function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { properties, expenses, isDemo, loading } = useDashboardData();

  if (loading) {
    return (
      <div className="space-y-10 animate-pulse">
        <div className="h-8 w-64 bg-gray-200 rounded-lg" />
        <div className="h-40 bg-gray-100 rounded-2xl" />
        <div className="grid grid-cols-3 gap-5">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const property = properties.find((p) => p.id === id);
  if (!property) return notFound();

  const propertyExpenses = expenses.filter(e => e.property_id === id);
  const expensesByCategory = getExpensesByCategory(propertyExpenses);
  const totalExpenses = propertyExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Build last 5 months of spend data from real expenses
  const now = new Date();
  const monthLabels: string[] = [];
  const spendData: number[] = [];
  for (let i = 4; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthLabels.push(d.toLocaleString('en-US', { month: 'short' }));
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthTotal = propertyExpenses
      .filter(e => e.date?.startsWith(monthStr))
      .reduce((sum, e) => sum + e.amount, 0);
    spendData.push(Math.round(monthTotal * 100) / 100);
  }
  const months = monthLabels;
  const maxSpend = Math.max(...spendData, 1);

  const topCategories = Object.entries(expensesByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <div className="space-y-10">
      <div className="flex items-start gap-3 sm:gap-4">
        <Link href="/dashboard/properties" className="p-2 hover:bg-gray-100 rounded-xl transition-colors duration-150 shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight truncate">{property.name}</h1>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={cn("w-2 h-2 rounded-full", property.status === 'active' ? 'bg-teal-500' : 'bg-gray-300')} />
              <span className="text-xs text-muted-foreground capitalize">{property.status}</span>
            </div>
          </div>
          <div className="flex items-start gap-1.5 text-muted-foreground mt-2 text-sm">
            <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="break-words">{property.address_line1}{property.address_line2 ? `, ${property.address_line2}` : ''}, {property.city}, {property.state} {property.zip}</span>
          </div>
        </div>
      </div>

      {/* Property Details */}
      <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-200/60 p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-4">Property Details</p>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2 text-sm">
            <Bed className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold">{property.bedrooms}</span>
            <span className="text-muted-foreground">bed</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Bath className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold">{property.bathrooms}</span>
            <span className="text-muted-foreground">bath</span>
          </div>
          {property.sqft && (
            <div className="flex items-center gap-2 text-sm">
              <Ruler className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold">{property.sqft.toLocaleString()}</span>
              <span className="text-muted-foreground">sqft</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Type:</span>
            <span className="font-semibold">{getPropertyTypeLabel(property.property_type)}</span>
          </div>
        </div>
      </div>

      {/* Export & Share */}
      <PropertyExportBar
        property={property}
        expenses={propertyExpenses}
        expensesByCategory={expensesByCategory}
        totalExpenses={totalExpenses}
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-5">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-200/60 p-4 sm:p-6">
          <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wide text-muted-foreground">Type</p>
          <p className="text-base sm:text-lg font-semibold mt-1 truncate">{getPropertyTypeLabel(property.property_type)}</p>
        </div>
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-200/60 p-4 sm:p-6">
          <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Expenses</p>
          <p className="text-base sm:text-lg font-semibold mt-1">{propertyExpenses.length}</p>
        </div>
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-200/60 p-4 sm:p-6 col-span-2 sm:col-span-1">
          <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wide text-muted-foreground">Current Month Spend</p>
          <p className="text-base sm:text-lg font-semibold mt-1">{formatCurrency(totalExpenses)}</p>
        </div>
      </div>

      {/* Expense Breakdown Summary */}
      {topCategories.length > 0 && (
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-200/60 p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-4">Expense Breakdown</p>
          <div className="flex flex-wrap gap-4">
            {topCategories.map(([cat, amount]) => {
              const config = EXPENSE_CATEGORY_CONFIG[cat as keyof typeof EXPENSE_CATEGORY_CONFIG];
              const CatIcon = config?.icon;
              return (
                <div key={cat} className="flex items-center gap-2 text-sm">
                  {CatIcon && <CatIcon className="w-4 h-4" />}
                  <span className="text-muted-foreground">{config?.label}:</span>
                  <span className="font-semibold">{formatCurrency(amount)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Monthly spend chart */}
      {spendData.some(v => v > 0) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Monthly Spend</h2>
            <span className="text-[11px] text-gray-400">Last 5 Months</span>
          </div>
          <div className="flex items-end gap-4" style={{ height: 200 }}>
            {months.map((month, i) => {
              const isCurrent = i === months.length - 1;
              const barHeight = Math.max(Math.round((spendData[i] / maxSpend) * 140), 24);
              return (
                <div key={month} className="flex-1 flex flex-col items-center justify-end h-full">
                  <span className={cn("text-xs font-semibold tabular-nums mb-2", isCurrent ? "text-gray-900" : "text-gray-500")}>
                    {formatCurrency(spendData[i])}
                  </span>
                  <div className={cn("w-full max-w-[52px] rounded-t-lg", isCurrent ? "bg-teal-500" : "bg-teal-200")} style={{ height: barHeight }} />
                  <span className={cn("text-xs font-medium mt-3", isCurrent ? "text-teal-600" : "text-gray-400")}>{month}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Data Sources */}
      <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-200/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Data Sources</h2>
          <Link href="/dashboard/integrations" className="text-xs text-accent hover:underline font-medium">Manage →</Link>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Connect integrations to automatically track expenses for this property.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/integrations" className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors">
            <Landmark className="w-3.5 h-3.5" /> Connect Bank
          </Link>
          <Link href="/dashboard/settings" className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors">
            <Mail className="w-3.5 h-3.5" /> Forward Bills
          </Link>
          <Link href="/dashboard/expenses/new" className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Manually
          </Link>
        </div>
      </div>

    </div>
  );
}
