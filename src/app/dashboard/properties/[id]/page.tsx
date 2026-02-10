import Link from "next/link";
import { notFound } from "next/navigation";
import { BillTable } from "@/components/bill-table";
import { DEMO_PROPERTIES, DEMO_EXPENSES } from "@/lib/data";
import { DEMO_UTILITY_ACCOUNTS, DEMO_BILLS } from "@/lib/types";
import { getExpensesForProperty, getExpensesByCategory } from "@/lib/demo-expenses";
import { EXPENSE_CATEGORY_CONFIG } from "@/lib/expense-categories";
import { cn, getStatusColor, getPropertyTypeLabel, getUtilityIcon, formatCurrency } from "@/lib/utils";
import { ArrowLeft, MapPin, Plus, Bed, Bath, Ruler } from "lucide-react";

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = DEMO_PROPERTIES.find((p) => p.id === id);

  if (!property) return notFound();

  const utilityAccounts = DEMO_UTILITY_ACCOUNTS.filter((ua) => ua.property_id === property.id);
  const propertyBills = DEMO_BILLS.filter((b) => b.utility_account?.property?.id === property.id);
  const propertyExpenses = getExpensesForProperty(property.id);
  const expensesByCategory = getExpensesByCategory(propertyExpenses);
  const totalExpenses = propertyExpenses.reduce((sum, e) => sum + e.amount, 0);

  const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb'];
  const spendData = [320, 285, 410, 345, totalExpenses > 0 ? Math.round(totalExpenses / 3) : 0];
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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Monthly Spend</h2>
          <span className="text-[11px] text-gray-400">Last 5 Months</span>
        </div>
        
        <div className="flex items-end gap-4 h-48">
          {months.map((month, i) => {
            const heightPct = Math.max((spendData[i] / maxSpend) * 100, 4);
            const isCurrent = i === months.length - 1;
            return (
              <div key={month} className="flex-1 flex flex-col items-center gap-2">
                <span className={cn(
                  "text-xs font-semibold tabular-nums",
                  isCurrent ? "text-gray-900" : "text-gray-400"
                )}>
                  {formatCurrency(spendData[i])}
                </span>
                <div className="w-full flex justify-center flex-1 items-end">
                  <div
                    className={cn(
                      "w-full max-w-[48px] rounded-lg transition-all",
                      isCurrent ? "bg-teal-500" : "bg-gray-200"
                    )}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <span className={cn(
                  "text-xs font-medium",
                  isCurrent ? "text-teal-600" : "text-gray-400"
                )}>
                  {month}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Utility Accounts */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-5">
          <h2 className="text-sm sm:text-base font-semibold uppercase tracking-wide text-muted-foreground">Utility Accounts</h2>
          <button className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white text-foreground font-medium rounded-xl hover:bg-gray-100 transition-all duration-200 border border-gray-200 text-xs sm:text-sm shadow-sm min-h-[44px] shrink-0">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Account</span><span className="sm:hidden">Add</span>
          </button>
        </div>
        {utilityAccounts.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-200/60 p-12 text-center">
            <p className="font-medium">No utility accounts yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add one to start tracking bills.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {utilityAccounts.map((ua) => (
              <div key={ua.id} className="bg-white rounded-xl sm:rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-200/60 p-4 sm:p-6 flex items-start gap-3 sm:gap-4 hover:shadow-md hover:translate-y-[-1px] transition-all duration-200">
                {(() => { const UtilIcon = getUtilityIcon(ua.utility_type); return <UtilIcon className="w-5 sm:w-6 h-5 sm:h-6 text-muted-foreground shrink-0" />; })()}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm sm:text-base truncate">{ua.provider_name}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground capitalize">{ua.utility_type}</p>
                  {ua.account_number && <p className="text-xs text-muted-foreground mt-1">Acct: •••{ua.account_number.slice(-4)}</p>}
                </div>
                {ua.autopay && (
                  <span className="text-[10px] sm:text-xs font-medium px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-teal-500/10 text-teal-600 border border-teal-500/20 shrink-0">
                    Autopay
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bills */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold uppercase tracking-wide text-muted-foreground">Utility Bills</h2>
          <Link href="/dashboard/expenses/new?category=utility" className="text-sm text-accent hover:underline font-medium">Add bill →</Link>
        </div>
        <BillTable bills={propertyBills} showProperty={false} />
      </div>
    </div>
  );
}
