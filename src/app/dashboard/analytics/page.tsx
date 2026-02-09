"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { StatCard } from "@/components/stat-card";
import { AnalyticsFilters } from "@/components/analytics-charts";

// Lazy load heavy chart components (recharts ~500KB)
const MonthlySpendChart = dynamic(() => import("@/components/analytics-charts").then(m => m.MonthlySpendChart), { ssr: false, loading: () => <div className="h-64 bg-gray-100 rounded-xl animate-pulse" /> });
const SpendByPropertyChart = dynamic(() => import("@/components/analytics-charts").then(m => m.SpendByPropertyChart), { ssr: false, loading: () => <div className="h-64 bg-gray-100 rounded-xl animate-pulse" /> });
const UtilityBreakdownChart = dynamic(() => import("@/components/analytics-charts").then(m => m.UtilityBreakdownChart), { ssr: false, loading: () => <div className="h-64 bg-gray-100 rounded-xl animate-pulse" /> });
const MoMComparisonChart = dynamic(() => import("@/components/analytics-charts").then(m => m.MoMComparisonChart), { ssr: false, loading: () => <div className="h-64 bg-gray-100 rounded-xl animate-pulse" /> });
const PropertyCostTable = dynamic(() => import("@/components/analytics-charts").then(m => m.PropertyCostTable), { ssr: false, loading: () => <div className="h-48 bg-gray-100 rounded-xl animate-pulse" /> });
import { DEMO_ANALYTICS_DATA, DEMO_PROPERTIES } from "@/lib/data";
import { ALL_EXPENSE_TYPES, UTILITY_LABELS, type UtilityType } from "@/lib/demo-analytics";
import { DollarSign, TrendingUp, Receipt, Building2 } from "lucide-react";

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState("12");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [utilityFilter, setUtilityFilter] = useState("all");

  const filteredData = useMemo(() => {
    let data = DEMO_ANALYTICS_DATA;
    const months = [...new Set(data.map(b => b.month))].sort();
    const rangeMonths = months.slice(-parseInt(dateRange));
    data = data.filter(b => rangeMonths.includes(b.month));
    if (propertyFilter !== "all") data = data.filter(b => b.property_id === propertyFilter);
    if (utilityFilter !== "all") data = data.filter(b => b.utility_type === (utilityFilter as UtilityType));
    return data;
  }, [dateRange, propertyFilter, utilityFilter]);

  const stats = useMemo(() => {
    const totalSpend = filteredData.reduce((s, b) => s + b.amount, 0);
    const months = [...new Set(filteredData.map(b => b.month))];
    const avgMonthly = months.length > 0 ? totalSpend / months.length : 0;
    const highestBill = filteredData.reduce((max, b) => b.amount > max.amount ? b : max, filteredData[0] || { amount: 0, property_name: 'N/A' });
    const propTotals = new Map<string, { name: string; total: number }>();
    for (const b of filteredData) {
      const p = propTotals.get(b.property_id) || { name: b.property_name, total: 0 };
      p.total += b.amount;
      propTotals.set(b.property_id, p);
    }
    const mostExpensive = [...propTotals.values()].sort((a, b) => b.total - a.total)[0];
    return { totalSpend, avgMonthly, highestBill, mostExpensive };
  }, [filteredData]);

  const properties = DEMO_PROPERTIES.map(p => ({ id: p.id, name: p.name }));

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
          properties={properties}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <StatCard title="Total Spend" value={fmt(stats.totalSpend)} subtitle={`Last ${dateRange} months`} icon={DollarSign} />
        <StatCard title="Avg Monthly" value={fmt(stats.avgMonthly)} subtitle="Per month average" icon={TrendingUp} />
        <StatCard title="Highest Bill" value={fmt(stats.highestBill?.amount || 0)} subtitle={stats.highestBill?.property_name || ''} icon={Receipt} />
        <StatCard title="Most Expensive" value={stats.mostExpensive?.name || 'N/A'} subtitle={fmt(stats.mostExpensive?.total || 0) + ' total'} icon={Building2} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlySpendChart data={filteredData} />
        <SpendByPropertyChart data={filteredData} />
        <UtilityBreakdownChart data={filteredData} />
        <MoMComparisonChart data={filteredData} />
      </div>

      <PropertyCostTable data={filteredData} />
    </div>
  );
}
