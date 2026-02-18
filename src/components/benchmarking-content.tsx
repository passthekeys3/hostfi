"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import { useDashboardData } from "@/hooks/useDashboardData";
import {
  calculateBenchmarks, generateInsights, getPortfolioSummary,
  getMonthlyTrendByProperty, getHeatmapData, getUtilityComparisonData,
} from "@/lib/benchmarking";
import { UTILITY_LABELS, type UtilityType, type MonthlyBill } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Trophy, AlertTriangle, Lightbulb, TrendingUp, DollarSign, Target, Crown, PiggyBank, Coins, Bed, Loader2 } from "lucide-react";

const PROPERTY_COLORS = ['#14B8A6', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#10B981', '#6366F1', '#F97316'];
const tooltipStyle = {
  contentStyle: { backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', color: '#111827', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.04)', padding: '12px 16px' },
  labelStyle: { color: '#6b7280', fontSize: '12px' },
};

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const INSIGHT_ICONS = {
  outlier: AlertTriangle,
  savings_opportunity: PiggyBank,
  efficiency_leader: Trophy,
  trending_up: TrendingUp,
};

const INSIGHT_COLORS = {
  info: { bg: 'bg-blue-500/5', border: 'border-blue-500/15', text: 'text-blue-600' },
  warning: { bg: 'bg-amber-500/5', border: 'border-amber-500/15', text: 'text-amber-600' },
  opportunity: { bg: 'bg-teal-500/5', border: 'border-teal-500/15', text: 'text-teal-600' },
};

// Map expense categories to utility types for benchmarking
const CATEGORY_TO_UTILITY: Record<string, string> = {
  utility: 'electric', // generic utility -> electric for now
  cleaning: 'cleaning',
  insurance: 'insurance',
  maintenance: 'maintenance',
  mortgage: 'mortgage',
  supplies: 'supplies',
  taxes: 'taxes',
  management: 'management',
  subscription: 'subscription',
  improvement: 'improvement',
  other: 'other',
};

export default function BenchmarkingContent() {
  const { properties, expenses, loading } = useDashboardData();

  // Transform real expenses into MonthlyBill format for benchmarking
  const { benchmarks, insights, summary, trends, heatmap, comparison, propertyNames, realProperties } = useMemo(() => {
    // Transform expenses to MonthlyBill format
    if (properties.length < 2 || expenses.length === 0) {
      return { benchmarks: [], insights: [], summary: null, trends: [], heatmap: null, comparison: [], propertyNames: [], realProperties: properties };
    }

    // Group expenses by month and property
    const monthlyBills: MonthlyBill[] = [];
    const expensesByMonthPropCat = new Map<string, { total: number; count: number }>();

    for (const expense of expenses) {
      const date = new Date(expense.date);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const property = properties.find(p => p.id === expense.property_id);
      if (!property) continue;

      const utilityType = CATEGORY_TO_UTILITY[expense.category] || expense.category || 'other';
      const key = `${month}-${expense.property_id}-${utilityType}`;

      const existing = expensesByMonthPropCat.get(key);
      if (existing) {
        existing.total += Number(expense.amount) || 0;
        existing.count += 1;
      } else {
        expensesByMonthPropCat.set(key, { total: Number(expense.amount) || 0, count: 1 });
        monthlyBills.push({
          month,
          monthLabel,
          property_id: expense.property_id,
          property_name: property.name,
          utility_type: utilityType as UtilityType,
          amount: 0, // will be filled in next pass
        });
      }
    }

    // Fill in amounts
    for (const bill of monthlyBills) {
      const key = `${bill.month}-${bill.property_id}-${bill.utility_type}`;
      const data = expensesByMonthPropCat.get(key);
      bill.amount = data?.total || 0;
    }

    // Filter out rent for benchmarking
    const nonRentBills = monthlyBills.filter(b => b.utility_type !== 'rent');

    if (nonRentBills.length === 0) {
      return { benchmarks: [], insights: [], summary: null, trends: [], heatmap: null, comparison: [], propertyNames: [], realProperties: properties };
    }

    const calculatedBenchmarks = calculateBenchmarks(nonRentBills);
    const calculatedInsights = generateInsights(calculatedBenchmarks);
    const calculatedSummary = getPortfolioSummary(calculatedBenchmarks);
    const calculatedTrends = getMonthlyTrendByProperty(monthlyBills);
    const calculatedHeatmap = getHeatmapData(calculatedBenchmarks);
    const calculatedComparison = getUtilityComparisonData(calculatedBenchmarks);

    return {
      benchmarks: calculatedBenchmarks,
      insights: calculatedInsights,
      summary: calculatedSummary,
      trends: calculatedTrends,
      heatmap: calculatedHeatmap,
      comparison: calculatedComparison,
      propertyNames: calculatedBenchmarks.map(b => b.property_name),
      realProperties: properties,
    };
  }, [properties, expenses]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 bg-white rounded-2xl border border-gray-100">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  // Not enough data state
  if (properties.length < 2 || benchmarks.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
        <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">
          {properties.length < 2 
            ? "Add at least 2 properties with expenses to see benchmarking data."
            : "Add expenses to your properties to see benchmarking data."}
        </p>
      </div>
    );
  }

  // No summary (shouldn't happen if we have benchmarks, but safety check)
  if (!summary || !heatmap) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
        <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Not enough expense data for benchmarking.</p>
      </div>
    );
  }

  const radarData = useMemo(() => {
    const utilities = heatmap.utilities;
    return utilities.map(ut => {
      const label = UTILITY_LABELS[ut as UtilityType] || ut;
      const row: Record<string, string | number> = { utility: label };
      const maxVal = Math.max(...benchmarks.map(b => b.metrics.by_utility[ut]?.monthly_avg || 0));
      for (const bm of benchmarks) {
        const val = bm.metrics.by_utility[ut]?.monthly_avg || 0;
        row[bm.property_name] = maxVal > 0 ? Math.round((1 - val / maxVal) * 100 + 20) : 50;
      }
      return row;
    });
  }, [benchmarks, heatmap.utilities]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Benchmarking</h1>
        <p className="text-gray-500 mt-1 sm:mt-2 text-sm leading-relaxed">Compare Utility Costs Across Your Portfolio</p>
      </div>

      {/* Portfolio Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-200/60 p-4 sm:p-7 hover:shadow-md hover:translate-y-[-1px] transition-all duration-200">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Most Efficient</p>
              <p className="text-sm sm:text-lg font-bold truncate">{summary.most_efficient.property_name}</p>
              <p className="text-xs text-teal-600 font-medium">{fmt(summary.most_efficient.monthly_avg)}/mo avg</p>
            </div>
            <div className="w-11 h-11 bg-teal-500/10 rounded-full flex items-center justify-center">
              <Crown className="w-[18px] h-[18px] text-teal-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-200/60 p-4 sm:p-7 hover:shadow-md hover:translate-y-[-1px] transition-all duration-200">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Least Efficient</p>
              <p className="text-sm sm:text-lg font-bold truncate">{summary.least_efficient.property_name}</p>
              <p className="text-xs text-amber-600 font-medium">{fmt(summary.least_efficient.monthly_avg)}/mo avg</p>
            </div>
            <div className="w-11 h-11 bg-amber-500/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-[18px] h-[18px] text-amber-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-200/60 p-4 sm:p-7 hover:shadow-md hover:translate-y-[-1px] transition-all duration-200">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Biggest Savings</p>
              <p className="text-sm sm:text-lg font-bold truncate">{summary.biggest_savings.property_name}</p>
              <p className="text-xs text-violet-600 font-medium">{summary.biggest_savings.utility_type} — save {fmt(summary.biggest_savings.annual_savings)}/yr</p>
            </div>
            <div className="w-11 h-11 bg-violet-500/10 rounded-full flex items-center justify-center">
              <Target className="w-[18px] h-[18px] text-violet-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-200/60 p-4 sm:p-7 hover:shadow-md hover:translate-y-[-1px] transition-all duration-200">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Portfolio Monthly Avg</p>
              <p className="text-3xl font-bold tracking-tight">{fmt(summary.total_monthly_avg)}</p>
              <p className="text-xs text-muted-foreground">per property (excl. rent)</p>
            </div>
            <div className="w-11 h-11 bg-accent/10 rounded-full flex items-center justify-center">
              <DollarSign className="w-[18px] h-[18px] text-accent" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-200/60 p-6">
          <h3 className="text-base font-semibold uppercase tracking-wide text-muted-foreground mb-5">Monthly Avg by Utility Type</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minHeight={200}>
              <BarChart data={comparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="utility" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} tickFormatter={fmt} />
                <Tooltip {...tooltipStyle} formatter={(v: unknown) => [fmt(Number(v))]} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#6b7280' }} />
                {propertyNames.map((name, i) => (
                  <Bar key={name} dataKey={name} fill={PROPERTY_COLORS[i]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-200/60 p-6">
          <h3 className="text-base font-semibold uppercase tracking-wide text-muted-foreground mb-5">Efficiency Comparison</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minHeight={200}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="utility" stroke="#6b7280" fontSize={11} />
                <PolarRadiusAxis stroke="#6b7280" fontSize={10} domain={[0, 120]} tick={false} />
                {propertyNames.map((name, i) => (
                  <Radar key={name} name={name} dataKey={name} stroke={PROPERTY_COLORS[i]} fill={PROPERTY_COLORS[i]} fillOpacity={0.1} strokeWidth={2} />
                ))}
                <Legend wrapperStyle={{ fontSize: 12, color: '#6b7280' }} />
                <Tooltip {...tooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Heatmap Table */}
      <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-200/60 p-4 sm:p-6">
        <h3 className="text-sm sm:text-base font-semibold uppercase tracking-wide text-muted-foreground mb-4 sm:mb-5">Cost Heatmap — Monthly Averages</h3>
        <div className="overflow-x-auto -mx-4 sm:mx-0 scrollbar-hide">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground bg-gray-50">Property</th>
                {heatmap.utilities.map(ut => (
                  <th key={ut} className="text-center px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground bg-gray-50">
                    {UTILITY_LABELS[ut as UtilityType] || ut}
                  </th>
                ))}
                <th className="text-center px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground bg-gray-50">Total</th>
              </tr>
            </thead>
            <tbody>
              {heatmap.rows.map((row, ri) => {
                const bm = benchmarks[ri];
                return (
                  <tr key={row.property_name} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-5 font-medium">{row.property_name}</td>
                    {heatmap.utilities.map(ut => {
                      const cell = row.cells[ut];
                      const vsAvg = cell.vs_avg;
                      const bgClass = vsAvg < -10
                        ? 'bg-teal-500/10 text-teal-600'
                        : vsAvg > 10
                          ? 'bg-red-500/10 text-red-600'
                          : 'text-foreground';
                      return (
                        <td key={ut} className="px-6 py-5 text-center">
                          <div className={cn("inline-flex flex-col items-center px-2.5 py-1 rounded-lg", bgClass)}>
                            <span className="font-medium">{fmt(cell.amount)}</span>
                            <span className="text-[10px] opacity-70">{vsAvg > 0 ? '+' : ''}{vsAvg.toFixed(0)}%</span>
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-6 py-5 text-center font-semibold">{fmt(bm?.metrics.total_monthly_avg || 0)}</td>
                  </tr>
                );
              })}
              <tr className="bg-gray-50">
                <td className="px-6 py-5 font-medium text-muted-foreground">Portfolio Avg</td>
                {heatmap.utilities.map(ut => (
                  <td key={ut} className="px-6 py-5 text-center text-muted-foreground font-medium">{fmt(heatmap.portfolioAvgs[ut])}</td>
                ))}
                <td className="px-6 py-5 text-center text-muted-foreground font-medium">{fmt(summary.total_monthly_avg)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Cost per Bedroom */}
      <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-200/60 p-4 sm:p-6">
        <div className="flex items-center gap-2.5 mb-4 sm:mb-5">
          <div className="w-8 h-8 bg-violet-500/10 rounded-full flex items-center justify-center shrink-0">
            <Bed className="w-4 h-4 text-violet-600" />
          </div>
          <h3 className="text-sm sm:text-base font-semibold uppercase tracking-wide text-muted-foreground">Cost per Bedroom</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {benchmarks.map((bm, i) => {
            const property = realProperties.find((p: { name: string; bedrooms?: number }) => p.name === bm.property_name);
            const bedrooms = property?.bedrooms || 1;
            const costPerBed = bm.metrics.total_monthly_avg / bedrooms;
            const totalBedrooms = realProperties.reduce((sum: number, p: { bedrooms?: number }) => sum + (p.bedrooms || 1), 0);
            const avgCostPerBed = summary.total_monthly_avg / (totalBedrooms / realProperties.length);
            const isEfficient = costPerBed < avgCostPerBed;
            return (
              <div key={bm.property_id} className={cn(
                "rounded-xl border p-4",
                isEfficient ? "bg-teal-500/5 border-teal-500/15" : "bg-amber-500/5 border-amber-500/15"
              )}>
                <p className="font-medium text-sm">{bm.property_name}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: PROPERTY_COLORS[i % PROPERTY_COLORS.length] }}>
                  {fmt(Math.round(costPerBed))}
                  <span className="text-sm font-normal text-muted-foreground">/bedroom</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {bedrooms} bed · {fmt(bm.metrics.total_monthly_avg)}/mo total
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Insights Panel */}
      <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-200/60 p-4 sm:p-6">
        <div className="flex items-center gap-2.5 mb-4 sm:mb-5">
          <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center shrink-0">
            <Lightbulb className="w-4 h-4 text-accent" />
          </div>
          <h3 className="text-sm sm:text-base font-semibold uppercase tracking-wide text-muted-foreground">AI-Generated Insights</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {insights.slice(0, 8).map(insight => {
            const Icon = INSIGHT_ICONS[insight.type];
            const colors = INSIGHT_COLORS[insight.severity];
            return (
              <div key={insight.id} className={cn("border rounded-xl p-4 flex gap-3", colors.bg, colors.border)}>
                <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", colors.text)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-relaxed">{insight.message}</p>
                  {insight.potential_savings && (
                    <p className="text-xs text-teal-600 font-medium mt-1 flex items-center gap-1"><Coins className="w-3.5 h-3.5" /> Potential savings: {fmt(insight.potential_savings)}/year</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trend Comparison */}
      <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-200/60 p-6">
        <h3 className="text-base font-semibold uppercase tracking-wide text-muted-foreground mb-5">Monthly Spend Trend by Property</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%" minHeight={200}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="monthLabel" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} tickFormatter={fmt} />
              <Tooltip {...tooltipStyle} formatter={(v: unknown) => [fmt(Number(v))]} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#6b7280' }} />
              {propertyNames.map((name, i) => (
                <Line key={name} type="monotone" dataKey={name} stroke={PROPERTY_COLORS[i]} strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
