"use client";

import { useState, useMemo } from "react";
import { UpgradeGate } from "@/components/upgrade-gate";
import { 
  FileText, 
  Mail, 
  Printer, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  DollarSign,
  Building2,
  Lightbulb,
  AlertTriangle,
  Calendar,
  ChevronDown,
} from "lucide-react";
import { AVAILABLE_MONTHS } from "@/lib/data";
import { useDashboardData } from "@/hooks/useDashboardData";
import { getCategoryConfig, EXPENSE_CATEGORY_CONFIG } from "@/lib/expense-categories";
import type { MonthlyReportData, PropertySummary, ReportInsight, ReportAnomaly, Expense, Property } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

// Generate monthly report from real data
function generateMonthlyReport(monthKey: string, expenses: Expense[], properties: Property[]): MonthlyReportData | null {
  if (expenses.length === 0 || properties.length === 0) return null;
  
  const [year, month] = monthKey.split('-').map(Number);
  const currentMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });
  
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === prevYear && d.getMonth() + 1 === prevMonth;
  });
  
  const totalSpend = currentMonthExpenses.reduce((s, e) => s + e.amount, 0);
  const prevTotalSpend = prevMonthExpenses.reduce((s, e) => s + e.amount, 0);
  const momChange = prevTotalSpend > 0 ? Math.round(((totalSpend - prevTotalSpend) / prevTotalSpend) * 100) : 0;
  const momDirection: 'up' | 'down' | 'flat' = momChange > 5 ? 'up' : momChange < -5 ? 'down' : 'flat';
  
  const propertySummaries: PropertySummary[] = properties.map(prop => {
    const propExpenses = currentMonthExpenses.filter(e => e.property_id === prop.id);
    const prevPropExpenses = prevMonthExpenses.filter(e => e.property_id === prop.id);
    const propTotal = propExpenses.reduce((s, e) => s + e.amount, 0);
    const prevPropTotal = prevPropExpenses.reduce((s, e) => s + e.amount, 0);
    const propMomChange = prevPropTotal > 0 ? Math.round(((propTotal - prevPropTotal) / prevPropTotal) * 100) : 0;
    
    // Get top category
    const byCategory: Record<string, number> = {};
    propExpenses.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });
    const topCat = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
    
    return {
      property: prop,
      totalSpend: propTotal,
      topCategory: topCat?.[0] || 'none',
      topCategoryAmount: topCat?.[1] || 0,
      momChange: Math.abs(propMomChange),
      momDirection: (propMomChange > 5 ? 'up' : propMomChange < -5 ? 'down' : 'flat') as 'up' | 'down' | 'flat',
    };
  }).filter(s => s.totalSpend > 0);
  
  const insights: ReportInsight[] = [];
  if (momDirection === 'down') {
    insights.push({ type: 'positive', message: `Total spending decreased ${Math.abs(momChange)}% from last month.` });
  } else if (momDirection === 'up') {
    insights.push({ type: 'warning', message: `Total spending increased ${momChange}% from last month.` });
  }
  
  const anomalies: ReportAnomaly[] = [];
  propertySummaries.forEach(s => {
    if (s.momDirection === 'up' && s.momChange > 30) {
      anomalies.push({
        propertyName: s.property.name,
        category: s.topCategory,
        message: `Spending spike of ${s.momChange}% detected`,
        severity: s.momChange > 50 ? 'high' : 'medium',
      });
    }
  });
  
  const projectedAnnualSpend = totalSpend * 12;
  const ytdExpenses = expenses.filter(e => new Date(e.date).getFullYear() === year);
  const lastYearAnnualSpend = ytdExpenses.reduce((s, e) => s + e.amount, 0);
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  return {
    month: `${monthNames[month - 1]} ${year}`,
    totalSpend,
    momChange: Math.abs(momChange),
    momDirection,
    propertySummaries,
    insights,
    anomalies,
    projectedAnnualSpend,
    lastYearAnnualSpend,
  };
}

function TrendIndicator({ change, direction }: { change: number; direction: 'up' | 'down' | 'flat' }) {
  if (direction === 'flat') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
        <Minus className="w-3 h-3" />
        <span>No change</span>
      </span>
    );
  }
  
  const isUp = direction === 'up';
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-xs font-medium",
      isUp ? "text-rose-600" : "text-teal-600"
    )}>
      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      <span>{Math.abs(change)}% MoM</span>
    </span>
  );
}

function InsightCard({ insight }: { insight: { type: 'positive' | 'warning' | 'negative'; message: string } }) {
  const borderColor = {
    positive: 'border-l-teal-500',
    warning: 'border-l-amber-500',
    negative: 'border-l-rose-500',
  }[insight.type];
  
  const bgColor = {
    positive: 'bg-teal-50/50',
    warning: 'bg-amber-50/50',
    negative: 'bg-rose-50/50',
  }[insight.type];

  return (
    <div className={cn(
      "border-l-4 rounded-r-lg p-4",
      borderColor,
      bgColor
    )}>
      <p className="text-sm text-gray-700 leading-relaxed">{insight.message}</p>
    </div>
  );
}

export default function ReportsPage() {
  const { properties, expenses, loading } = useDashboardData();
  
  // Generate available months from actual expense data
  const months = useMemo(() => {
    if (expenses.length === 0) return AVAILABLE_MONTHS;
    const monthSet = new Set<string>();
    expenses.forEach(e => {
      const date = new Date(e.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthSet.add(key);
    });
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return [...monthSet].sort().reverse().slice(0, 12).map(key => {
      const [y, m] = key.split('-').map(Number);
      return { key, label: `${monthNames[m - 1]} ${y}` };
    });
  }, [expenses]);
  
  const [selectedMonth, setSelectedMonth] = useState(months[0]?.key || '');
  
  const report = useMemo(() => {
    if (!selectedMonth) return null;
    return generateMonthlyReport(selectedMonth, expenses, properties);
  }, [selectedMonth, expenses, properties]);

  const handlePrint = () => {
    window.print();
  };

  const [emailSent, setEmailSent] = useState(false);
  const handleEmailReport = async () => {
    setEmailSent(true);
    try {
      const res = await fetch('/api/email/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      alert(res.ok ? 'Report sent to your email.' : 'Failed to send. Please try again.');
    } catch (error) {
      console.error('Failed to send report email:', error);
      alert('Failed to send report.');
    } finally {
      setTimeout(() => setEmailSent(false), 2000);
    }
  };

  if (!report) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Monthly Reports</h1>
          <p className="text-gray-500 mt-1.5 sm:mt-2 text-sm leading-relaxed">AI-Generated Financial Summaries for Your Portfolio</p>
        </div>
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No reports yet. Add properties and expenses to generate reports.</p>
        </div>
      </div>
    );
  }

  return (
    <UpgradeGate feature="reports">
    <div className="space-y-8 sm:space-y-10 print:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Monthly Reports</h1>
          <p className="text-gray-500 mt-1.5 sm:mt-2 text-sm leading-relaxed">
            AI-Generated Financial Summaries for Your Portfolio
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Month Selector */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="appearance-none w-full sm:w-auto px-4 py-2.5 pr-10 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 min-h-[44px] transition-all duration-200"
              style={{ boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)' }}
            >
              {months.map((month) => (
                <option key={month.key} value={month.key}>{month.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          
          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-foreground font-medium rounded-xl text-sm border border-gray-200 min-h-[44px] transition-all duration-200 hover:bg-gray-100 hover:border-gray-200/80"
            style={{ boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)' }}
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print</span>
          </button>
          
          {/* Email Button */}
          <button
            onClick={handleEmailReport}
            className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-gray-900 text-white font-medium rounded-xl text-sm min-h-[44px] transition-colors hover:bg-gray-800"
          >
            <Mail className="w-4 h-4" />
            <span className="hidden sm:inline">{emailSent ? "Coming Soon" : "Email Report"}</span>
            <span className="sm:hidden">{emailSent ? "Soon" : "Email"}</span>
          </button>
        </div>
      </div>

      {/* Print Header (only visible when printing) */}
      <div className="hidden print:block">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center text-lg font-bold text-white">
            P
          </div>
          <div>
            <h1 className="text-2xl font-bold">HostFi Monthly Report</h1>
            <p className="text-sm text-gray-500">{report.month}</p>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div 
        className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 print:border print:border-gray-200"
        style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 6px rgba(0, 0, 0, 0.02)' }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
            <FileText className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{report.month} Summary</h2>
            <p className="text-sm text-muted-foreground">Portfolio Overview</p>
          </div>
        </div>

        {/* Total Spend */}
        <div className="mb-8">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-4xl sm:text-5xl font-bold tracking-tight tabular-nums">
              {formatCurrency(report.totalSpend)}
            </span>
            <TrendIndicator change={report.momChange} direction={report.momDirection} />
          </div>
          <p className="text-sm text-muted-foreground mt-2">Total spend across all properties</p>
        </div>

        {/* Per-Property Breakdown */}
        <div className="border-t border-gray-100 pt-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            By Property
          </h3>
          <div className="space-y-4">
            {report.propertySummaries.map((summary) => {
              const catConfig = getCategoryConfig(summary.topCategory);
              return (
                <div 
                  key={summary.property.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200 print:bg-gray-50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{summary.property.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Top: {catConfig.label} ({formatCurrency(summary.topCategoryAmount)})
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 pl-4">
                    <p className="font-semibold tabular-nums">{formatCurrency(summary.totalSpend)}</p>
                    <TrendIndicator change={summary.momChange} direction={summary.momDirection} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Insights Section */}
      <div 
        className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 print:border print:border-gray-200"
        style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 6px rgba(0, 0, 0, 0.02)' }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">AI Insights</h2>
            <p className="text-sm text-muted-foreground">Key observations from your data</p>
          </div>
        </div>

        <div className="space-y-3">
          {report.insights.map((insight, index) => (
            <InsightCard key={index} insight={insight} />
          ))}
        </div>
      </div>

      {/* Anomalies Section (only show if there are anomalies) */}
      {report.anomalies.length > 0 && (
        <div 
          className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 print:border print:border-gray-200"
          style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 6px rgba(0, 0, 0, 0.02)' }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Anomaly Alerts</h2>
              <p className="text-sm text-muted-foreground">Unusual patterns detected</p>
            </div>
          </div>

          <div className="space-y-3">
            {report.anomalies.map((anomaly, index) => (
              <div 
                key={index}
                className={cn(
                  "p-4 rounded-xl border",
                  anomaly.severity === 'high' 
                    ? "bg-rose-50/50 border-rose-200"
                    : anomaly.severity === 'medium'
                    ? "bg-amber-50/50 border-amber-200"
                    : "bg-gray-50 border-gray-200"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{anomaly.propertyName}</span>
                  <span className="text-xs text-muted-foreground">-</span>
                  <span className="text-xs text-muted-foreground">{anomaly.category}</span>
                </div>
                <p className="text-sm text-gray-600">{anomaly.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tax Impact Note */}
      {report.taxImpact && (
        <div 
          className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-2xl p-6 sm:p-8 border border-teal-100/80 print:border print:border-teal-200"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-teal-900">Tax Impact Note</h2>
              <p className="text-sm text-teal-700/70">Consult your CPA</p>
            </div>
          </div>
          <p className="text-sm text-teal-800 leading-relaxed">{report.taxImpact.message}</p>
        </div>
      )}

      {/* Annual Projection */}
      <div 
        className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 print:border print:border-gray-200"
        style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 6px rgba(0, 0, 0, 0.02)' }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Annual Projection</h2>
            <p className="text-sm text-muted-foreground">Based on current spending pace</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
            <p className="text-sm text-muted-foreground mb-1">Projected Annual Spend</p>
            <p className="text-2xl font-bold tabular-nums">{formatCurrency(report.projectedAnnualSpend)}</p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
            <p className="text-sm text-muted-foreground mb-1">Last Year Total</p>
            <p className="text-2xl font-bold tabular-nums">{formatCurrency(report.lastYearAnnualSpend)}</p>
            {report.projectedAnnualSpend > report.lastYearAnnualSpend && (
              <p className="text-xs text-rose-600 mt-1">
                +{Math.round(((report.projectedAnnualSpend - report.lastYearAnnualSpend) / report.lastYearAnnualSpend) * 100)}% YoY
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
        }
      `}</style>
    </div>
    </UpgradeGate>
  );
}
