"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  type MonthlyBill,
  UTILITY_LABELS, ALL_EXPENSE_TYPES,
  getMonthlyTotals, getUtilityBreakdown, getMoMComparison, getPropertyTable,
} from "@/lib/demo-analytics";
import { cn } from "@/lib/utils";

const PROPERTY_COLORS = ['#14B8A6', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899'];

const tooltipStyle = {
  contentStyle: { 
    backgroundColor: '#ffffff', 
    border: '1px solid #e5e7eb', 
    borderRadius: '12px', 
    color: '#111827', 
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 0, 0, 0.04)', 
    padding: '12px 16px',
    fontSize: '13px',
  },
  labelStyle: { color: '#6b7280', fontSize: '11px', fontWeight: 500, marginBottom: '4px' },
  itemStyle: { color: '#111827', fontSize: '13px', fontWeight: 600 },
};

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function MonthlySpendChart({ data }: { data: MonthlyBill[] }) {
  const chartData = useMemo(() => getMonthlyTotals(data), [data]);

  return (
    <div 
      className="bg-white rounded-2xl p-6 border border-gray-200"
      style={{
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      }}
    >
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-6">Monthly Spend Trend</h3>
      <div className="h-[280px]" style={{ minHeight: 200 }}>
        <ResponsiveContainer width="100%" height="100%" minHeight={200}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#14B8A6" stopOpacity={0.25} />
                <stop offset="50%" stopColor="#14B8A6" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#14B8A6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.8} vertical={false} />
            <XAxis dataKey="monthLabel" stroke="#6b7280" fontSize={11} fontWeight={500} tickLine={false} axisLine={false} dy={8} />
            <YAxis stroke="#6b7280" fontSize={11} fontWeight={500} tickFormatter={fmt} tickLine={false} axisLine={false} dx={-8} />
            <Tooltip {...tooltipStyle} formatter={(v: unknown) => [fmt(Number(v)), 'Total']} />
            <Area 
              type="monotone" 
              dataKey="total" 
              stroke="#14B8A6" 
              strokeWidth={2.5} 
              fill="url(#tealGrad)"
              animationDuration={1000}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function SpendByPropertyChart({ data }: { data: MonthlyBill[] }) {
  const chartData = useMemo(() => {
    const months = [...new Set(data.map(b => b.month))].sort();
    return months.map(m => {
      const monthBills = data.filter(b => b.month === m);
      const label = monthBills[0]?.monthLabel || m;
      const row: Record<string, string | number> = { monthLabel: label };
      const propNames = [...new Set(data.map(b => b.property_name))];
      for (const pn of propNames) {
        row[pn] = Math.round(monthBills.filter(b => b.property_name === pn).reduce((s, b) => s + b.amount, 0));
      }
      return row;
    });
  }, [data]);

  const propNames = [...new Set(data.map(b => b.property_name))];

  return (
    <div 
      className="bg-white rounded-2xl p-6 border border-gray-200"
      style={{
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      }}
    >
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-6">Spend by Property</h3>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%" minHeight={200}>
          <BarChart data={chartData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.8} vertical={false} />
            <XAxis dataKey="monthLabel" stroke="#6b7280" fontSize={11} fontWeight={500} tickLine={false} axisLine={false} dy={8} />
            <YAxis stroke="#6b7280" fontSize={11} fontWeight={500} tickFormatter={fmt} tickLine={false} axisLine={false} dx={-8} />
            <Tooltip {...tooltipStyle} formatter={(v: unknown) => [fmt(Number(v))]} />
            <Legend 
              wrapperStyle={{ fontSize: 12, color: '#6b7280', paddingTop: '16px' }} 
              iconType="circle"
              iconSize={8}
            />
            {propNames.map((name, i) => (
              <Bar 
                key={name} 
                dataKey={name} 
                fill={PROPERTY_COLORS[i % PROPERTY_COLORS.length]} 
                radius={[6, 6, 0, 0]}
                animationDuration={800}
                animationEasing="ease-out"
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function UtilityBreakdownChart({ data }: { data: MonthlyBill[] }) {
  const chartData = useMemo(() => getUtilityBreakdown(data), [data]);
  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <div 
      className="bg-white rounded-2xl p-6 border border-gray-200"
      style={{
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      }}
    >
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-6">Expense Breakdown</h3>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%" minHeight={200}>
          <PieChart>
            <defs>
              {chartData.map((entry, i) => (
                <linearGradient key={`gradient-${i}`} id={`pieGrad-${i}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                  <stop offset="100%" stopColor={entry.color} stopOpacity={0.8} />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={100}
              paddingAngle={4}
              dataKey="value"
              cornerRadius={6}
              animationDuration={1000}
              animationEasing="ease-out"
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={`url(#pieGrad-${i})`} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              {...tooltipStyle}
              // Recharts Tooltip `formatter` expects a complex overloaded signature that doesn't
              // align with simple callback typings. Using `as any` is the accepted workaround.
              // See: https://github.com/recharts/recharts/issues/3615
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={((v: unknown, name: unknown) => { const n = Number(v); return [fmt(n) + ` (${((n / total) * 100).toFixed(1)}%)`, String(name)]; }) as any}
            />
            <Legend 
              wrapperStyle={{ fontSize: 12, color: '#6b7280', paddingTop: '8px' }} 
              iconType="circle"
              iconSize={8}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function MoMComparisonChart({ data }: { data: MonthlyBill[] }) {
  const chartData = useMemo(() => getMoMComparison(data), [data]);

  return (
    <div 
      className="bg-white rounded-2xl p-6 border border-gray-200"
      style={{
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      }}
    >
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-6">Month-over-Month Comparison</h3>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%" minHeight={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.8} vertical={false} />
            <XAxis dataKey="utility" stroke="#6b7280" fontSize={11} fontWeight={500} tickLine={false} axisLine={false} dy={8} />
            <YAxis stroke="#6b7280" fontSize={11} fontWeight={500} tickFormatter={fmt} tickLine={false} axisLine={false} dx={-8} />
            <Tooltip {...tooltipStyle} formatter={(v: unknown) => [fmt(Number(v))]} />
            <Legend 
              wrapperStyle={{ fontSize: 12, color: '#6b7280', paddingTop: '16px' }} 
              iconType="circle"
              iconSize={8}
            />
            <Bar 
              dataKey="previous" 
              name="Last Month" 
              fill="#a1a1aa" 
              radius={[6, 6, 0, 0]}
              animationDuration={800}
            />
            <Bar 
              dataKey="current" 
              name="This Month" 
              fill="#14B8A6" 
              radius={[6, 6, 0, 0]}
              animationDuration={800}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function PropertyCostTable({ data }: { data: MonthlyBill[] }) {
  const [sortKey, setSortKey] = useState<'avgMonthly' | 'highestBill' | 'currentMonth' | 'trendPct'>('avgMonthly');
  const [sortAsc, setSortAsc] = useState(false);

  const tableData = useMemo(() => {
    const rows = getPropertyTable(data);
    return rows.sort((a, b) => sortAsc ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]);
  }, [data, sortKey, sortAsc]);

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  }

  const header = (label: string, key: typeof sortKey) => (
    <th
      className="text-left px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground select-none bg-gray-50/80 transition-colors duration-150"
      onClick={() => toggleSort(key)}
    >
      <span className="flex items-center gap-1">
        {label}
        <span className={cn("opacity-0 transition-opacity", sortKey === key && "opacity-100")}>
          {sortAsc ? '↑' : '↓'}
        </span>
      </span>
    </th>
  );

  return (
    <div 
      className="bg-white rounded-2xl p-6 border border-gray-200"
      style={{
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      }}
    >
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 sm:mb-6">Cost Per Property</h3>
      <div className="overflow-x-auto -mx-6 sm:-mx-0 scrollbar-hide">
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-gray-50/80">Property</th>
              {header('Avg Monthly', 'avgMonthly')}
              {header('Highest Bill', 'highestBill')}
              {header('This Month', 'currentMonth')}
              {header('Trend', 'trendPct')}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, index) => (
              <tr 
                key={row.property_id} 
                className={cn(
                  "group transition-colors duration-150 hover:bg-gray-50/60",
                  index !== tableData.length - 1 && "border-b border-gray-100"
                )}
              >
                <td className="px-6 py-4 font-medium">{row.property_name}</td>
                <td className="px-6 py-4 tabular-nums">{fmt(row.avgMonthly)}</td>
                <td className="px-6 py-4 tabular-nums">{fmt(row.highestBill)}</td>
                <td className="px-6 py-4 tabular-nums">{fmt(row.currentMonth)}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full",
                    row.trendPct > 0 
                      ? "text-rose-600 bg-rose-50" 
                      : "text-emerald-600 bg-emerald-50"
                  )}>
                    {row.trendPct > 0 ? '↑' : '↓'} {Math.abs(row.trendPct)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Filters component
interface FiltersProps {
  dateRange: string;
  setDateRange: (v: string) => void;
  propertyFilter: string;
  setPropertyFilter: (v: string) => void;
  utilityFilter: string;
  setUtilityFilter: (v: string) => void;
  properties: { id: string; name: string }[];
}

export function AnalyticsFilters({ dateRange, setDateRange, propertyFilter, setPropertyFilter, utilityFilter, setUtilityFilter, properties }: FiltersProps) {
  const selectClass = "w-full sm:w-auto bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/20/20 focus:border-teal-500 min-h-[44px] transition-all duration-200";

  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-3">
      <select 
        className={selectClass} 
        value={dateRange} 
        onChange={e => setDateRange(e.target.value)} 
        aria-label="Date range"
        style={{ boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)' }}
      >
        <option value="3">Last 3 months</option>
        <option value="6">Last 6 months</option>
        <option value="12">Last 12 months</option>
      </select>
      <select 
        className={selectClass} 
        value={propertyFilter} 
        onChange={e => setPropertyFilter(e.target.value)} 
        aria-label="Filter by property"
        style={{ boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)' }}
      >
        <option value="all">All Properties</option>
        {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <select 
        className={selectClass} 
        value={utilityFilter} 
        onChange={e => setUtilityFilter(e.target.value)} 
        aria-label="Filter by utility type"
        style={{ boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)' }}
      >
        <option value="all">All Categories</option>
        {ALL_EXPENSE_TYPES.map(t => <option key={t} value={t}>{UTILITY_LABELS[t]}</option>)}
      </select>
    </div>
  );
}
