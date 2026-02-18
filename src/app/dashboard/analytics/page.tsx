"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { StatCard } from "@/components/stat-card";
import { AnalyticsFilters } from "@/components/analytics-charts";

const MonthlySpendChart = dynamic(() => import("@/components/analytics-charts").then(m => m.MonthlySpendChart), { ssr: false, loading: () => <div className="h-64 bg-gray-100 rounded-xl animate-pulse" /> });
const SpendByPropertyChart = dynamic(() => import("@/components/analytics-charts").then(m => m.SpendByPropertyChart), { ssr: false, loading: () => <div className="h-64 bg-gray-100 rounded-xl animate-pulse" /> });
const UtilityBreakdownChart = dynamic(() => import("@/components/analytics-charts").then(m => m.UtilityBreakdownChart), { ssr: false, loading: () => <div className="h-64 bg-gray-100 rounded-xl animate-pulse" /> });
const MoMComparisonChart = dynamic(() => import("@/components/analytics-charts").then(m => m.MoMComparisonChart), { ssr: false, loading: () => <div className="h-64 bg-gray-100 rounded-xl animate-pulse" /> });
const PropertyCostTable = dynamic(() => import("@/components/analytics-charts").then(m => m.PropertyCostTable), { ssr: false, loading: () => <div className="h-48 bg-gray-100 rounded-xl animate-pulse" /> });
const RevenueVsExpensesChart = dynamic(() => import("@/components/analytics-charts").then(m => m.RevenueVsExpensesChart), { ssr: false, loading: () => <div className="h-64 bg-gray-100 rounded-xl animate-pulse" /> });
const RevenueByPlatformChart = dynamic(() => import("@/components/analytics-charts").then(m => m.RevenueByPlatformChart), { ssr: false, loading: () => <div className="h-64 bg-gray-100 rounded-xl animate-pulse" /> });
import { useDashboardData } from "@/hooks/useDashboardData";
import { type MonthlyBill, type MonthlyRevenue, type UtilityType } from "@/lib/types";
import { DollarSign, BarChart3, Percent, Wallet, ArrowUpDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(m) - 1]} ${y.slice(2)}`;
}

// Pass expense categories through directly — labels/colors handle all types now

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState("12");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [utilityFilter, setUtilityFilter] = useState("all");
  const { properties, expenses, revenue, loading } = useDashboardData();

  // Transform real expenses into MonthlyBill format for charts
  const analyticsData: MonthlyBill[] = useMemo(() => {
    return expenses
      .map(exp => {
        const month = (exp.date || '').slice(0, 7); // YYYY-MM with null guard
        if (!month) return null;
        const property = properties.find(p => p.id === exp.property_id);
        return {
          month,
          monthLabel: formatMonthLabel(month),
          property_id: exp.property_id,
          property_name: property?.name || 'Unknown',
          utility_type: (exp.category || 'other') as UtilityType,
          amount: exp.amount,
        };
      })
      .filter((item): item is MonthlyBill => item !== null);
  }, [expenses, properties]);

  // Transform revenue into MonthlyRevenue format for charts
  const revenueData: MonthlyRevenue[] = useMemo(() => {
    return (revenue || [])
      .filter(r => r.date || r.payout_date)
      .map(r => {
        const dateStr = r.date || r.payout_date || '';
        const month = dateStr.slice(0, 7);
        if (!month) return null;
        const property = properties.find(p => p.id === r.property_id);
        return {
          month,
          monthLabel: formatMonthLabel(month),
          property_id: r.property_id,
          property_name: property?.name || 'Unknown',
          platform: r.platform || 'other',
          amount: r.amount,
        };
      })
      .filter((item): item is MonthlyRevenue => item !== null);
  }, [revenue, properties]);

  const filteredData = useMemo(() => {
    let data = analyticsData;
    const months = [...new Set(data.map(b => b.month))].sort();
    const rangeMonths = months.slice(-parseInt(dateRange));
    data = data.filter(b => rangeMonths.includes(b.month));
    if (propertyFilter !== "all") data = data.filter(b => b.property_id === propertyFilter);
    if (utilityFilter !== "all") data = data.filter(b => b.utility_type === (utilityFilter as UtilityType));
    return data;
  }, [analyticsData, dateRange, propertyFilter, utilityFilter]);

  // Apply same filters to revenue data
  const filteredRevenue = useMemo(() => {
    let data = revenueData;
    const months = [...new Set(analyticsData.map(b => b.month))].sort();
    const rangeMonths = months.slice(-parseInt(dateRange));
    // Also include revenue months in case expenses don't cover all months
    const revMonths = [...new Set(data.map(r => r.month))].sort();
    const allRangeMonths = [...new Set([...rangeMonths, ...revMonths.slice(-parseInt(dateRange))])];
    data = data.filter(r => allRangeMonths.includes(r.month));
    if (propertyFilter !== "all") data = data.filter(r => r.property_id === propertyFilter);
    return data;
  }, [revenueData, analyticsData, dateRange, propertyFilter]);

  const stats = useMemo(() => {
    const totalSpend = filteredData.reduce((s, b) => s + b.amount, 0);
    const totalRevenue = filteredRevenue.reduce((s, r) => s + r.amount, 0);
    const netProfit = totalRevenue - totalSpend;
    
    const expenseMonths = [...new Set(filteredData.map(b => b.month))];
    const revenueMonths = [...new Set(filteredRevenue.map(r => r.month))];
    const allMonths = [...new Set([...expenseMonths, ...revenueMonths])];
    
    const avgMonthlyExp = expenseMonths.length > 0 ? totalSpend / expenseMonths.length : 0;
    const avgMonthlyRev = revenueMonths.length > 0 ? totalRevenue / revenueMonths.length : 0;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    
    const highestBill = filteredData.reduce((max, b) => b.amount > max.amount ? b : max, filteredData[0] || { amount: 0, property_name: 'N/A' });
    const propTotals = new Map<string, { name: string; total: number }>();
    for (const b of filteredData) {
      const p = propTotals.get(b.property_id) || { name: b.property_name, total: 0 };
      p.total += b.amount;
      propTotals.set(b.property_id, p);
    }
    const mostExpensive = [...propTotals.values()].sort((a, b) => b.total - a.total)[0];
    return { totalSpend, totalRevenue, netProfit, avgMonthlyExp, avgMonthlyRev, profitMargin, highestBill, mostExpensive };
  }, [filteredData, filteredRevenue]);

  const propertyList = useMemo(() => {
    return properties.map(p => ({ id: p.id, name: p.name }));
  }, [properties]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-64 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-gray-500 mt-1 sm:mt-2 text-sm leading-relaxed">Spending Insights Across Your Properties</p>
        </div>
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No expense data yet</p>
          <p className="text-gray-400 text-xs mt-1">Add expenses to see charts and insights here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-gray-500 mt-1 sm:mt-2 text-sm leading-relaxed">Spending Insights Across Your Properties</p>
        </div>
        <AnalyticsFilters
          dateRange={dateRange} setDateRange={setDateRange}
          propertyFilter={propertyFilter} setPropertyFilter={setPropertyFilter}
          utilityFilter={utilityFilter} setUtilityFilter={setUtilityFilter}
          properties={propertyList}
        />
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <StatCard title="Total Revenue" value={formatCurrency(stats.totalRevenue)} subtitle={`Last ${dateRange} months`} icon={Wallet} accent="teal" />
        <StatCard title="Total Expenses" value={formatCurrency(stats.totalSpend)} subtitle={`Last ${dateRange} months`} icon={DollarSign} accent="amber" />
        <StatCard 
          title="Net Profit" 
          value={(stats.netProfit < 0 ? '-' : '') + formatCurrency(Math.abs(stats.netProfit))} 
          subtitle={stats.netProfit >= 0 ? 'Profitable' : 'Loss'} 
          icon={ArrowUpDown}
          accent={stats.netProfit >= 0 ? 'teal' : 'rose'}
        />
        <StatCard 
          title="Profit Margin" 
          value={`${stats.profitMargin >= 0 ? '' : '-'}${Math.abs(stats.profitMargin).toFixed(1)}%`} 
          subtitle={stats.profitMargin >= 20 ? 'Healthy' : stats.profitMargin >= 0 ? 'Low' : 'Negative'} 
          icon={Percent}
          accent={stats.profitMargin < 0 ? 'rose' : 'teal'}
        />
      </div>

      {/* Revenue vs Expenses - Full Width */}
      <RevenueVsExpensesChart expenses={filteredData} revenue={filteredRevenue} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlySpendChart data={filteredData} />
        <SpendByPropertyChart data={filteredData} />
        <RevenueByPlatformChart data={filteredRevenue} />
        <UtilityBreakdownChart data={filteredData} />
        <MoMComparisonChart data={filteredData} />
      </div>

      <PropertyCostTable data={filteredData} />
    </div>
  );
}
