"use client";

import { useState } from "react";
import { 
  Calculator, 
  ChevronDown, 
  ChevronRight,
  Download,
  FileText,
  Share2,
  Lightbulb,
  AlertTriangle,
  Building2,
  DollarSign,
} from "lucide-react";
import { DEMO_PROPERTIES, DEMO_EXPENSES } from "@/lib/data";
import { type Property } from "@/lib/types";
import { EXPENSE_CATEGORY_CONFIG, getCategoryColorClasses } from "@/lib/expense-categories";
import { 
  generatePropertyTaxSummary, 
  generateTaxInsights, 
  getPropertyTypeLabel,
  type PropertyTaxSummary,
  type TaxInsight,
  type ScheduleELineTotal,
} from "@/lib/tax-mapping";
import { cn } from "@/lib/utils";
import { generateTXF, generateScheduleEHTML, generateScheduleECSV, downloadFile } from "@/lib/tax-export";

function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const AVAILABLE_TAX_YEARS = [
  { key: '2026', label: '2026' },
  { key: '2025', label: '2025' },
  { key: '2024', label: '2024' },
];

function InsightCard({ insight }: { insight: TaxInsight }) {
  const config = {
    positive: { border: 'border-l-teal-500', bg: 'bg-teal-50/50', icon: DollarSign, iconColor: 'text-teal-600' },
    warning: { border: 'border-l-amber-500', bg: 'bg-amber-50/50', icon: AlertTriangle, iconColor: 'text-amber-600' },
    negative: { border: 'border-l-rose-500', bg: 'bg-rose-50/50', icon: AlertTriangle, iconColor: 'text-rose-600' },
    info: { border: 'border-l-blue-500', bg: 'bg-blue-50/50', icon: Lightbulb, iconColor: 'text-blue-600' },
  }[insight.type];
  
  const Icon = config.icon;

  return (
    <div className={cn(
      "border-l-4 rounded-r-lg p-4 flex items-start gap-3",
      config.border,
      config.bg
    )}>
      <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", config.iconColor)} />
      <p className="text-sm text-gray-700 leading-relaxed">{insight.message}</p>
    </div>
  );
}

function ScheduleELineRow({ 
  lineItem, 
  isExpanded, 
  onToggle 
}: { 
  lineItem: ScheduleELineTotal; 
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const hasExpenses = lineItem.expenses.length > 0;
  
  return (
    <>
      <tr 
        className={cn(
          "transition-colors duration-150",
          hasExpenses && "cursor-pointer hover:bg-gray-50/60",
          lineItem.consultCPA && "bg-amber-50/30"
        )}
        onClick={hasExpenses ? onToggle : undefined}
      >
        <td className="px-4 py-3 w-16">
          <span className="text-sm font-mono text-muted-foreground">{lineItem.line}</span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {hasExpenses && (
              <span className="text-muted-foreground">
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </span>
            )}
            <span className="text-sm">{lineItem.description}</span>
            {lineItem.consultCPA && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                Consult CPA
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-right">
          <span className={cn(
            "font-semibold tabular-nums text-sm",
            lineItem.amount > 0 ? "text-foreground" : "text-muted-foreground"
          )}>
            {lineItem.line === 5 ? '—' : formatCurrency(lineItem.amount)}
          </span>
        </td>
      </tr>
      
      {/* Expanded expense details */}
      {isExpanded && hasExpenses && (
        <tr>
          <td colSpan={3} className="px-4 py-0 bg-gray-50/60">
            <div className="py-3 pl-8 space-y-2">
              {lineItem.expenses.map((expense) => {
                const catConfig = EXPENSE_CATEGORY_CONFIG[expense.category];
                const colorClasses = getCategoryColorClasses(catConfig.color);
                return (
                  <div 
                    key={expense.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-6 h-6 rounded-md flex items-center justify-center",
                        colorClasses.bg
                      )}>
                        <catConfig.icon className="w-3 h-3" />
                      </span>
                      <span className="text-muted-foreground">
                        {expense.description || catConfig.label}
                        {expense.vendor && ` - ${expense.vendor}`}
                      </span>
                    </div>
                    <span className="tabular-nums text-muted-foreground">
                      {formatCurrency(expense.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function PropertyTaxCard({ summary }: { summary: PropertyTaxSummary }) {
  const [expandedLines, setExpandedLines] = useState<Set<number>>(new Set());
  
  const toggleLine = (line: number) => {
    setExpandedLines(prev => {
      const next = new Set(prev);
      if (next.has(line)) {
        next.delete(line);
      } else {
        next.add(line);
      }
      return next;
    });
  };

  return (
    <div 
      className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
      style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 6px rgba(0, 0, 0, 0.02)' }}
    >
      {/* Property Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="font-semibold">{summary.property.name}</h3>
              <p className="text-xs text-muted-foreground">
                {getPropertyTypeLabel(summary.property.property_type)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums">{formatCurrency(summary.totalDeductions)}</p>
            <p className="text-xs text-muted-foreground">Total Deductions</p>
          </div>
        </div>
      </div>
      
      {/* Schedule E Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80">
              <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3 w-16">
                Line
              </th>
              <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3">
                Description
              </th>
              <th className="text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3 w-32">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {summary.lineItems.map((lineItem) => (
              <ScheduleELineRow
                key={lineItem.line}
                lineItem={lineItem}
                isExpanded={expandedLines.has(lineItem.line)}
                onToggle={() => toggleLine(lineItem.line)}
              />
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200 bg-gray-50">
              <td colSpan={2} className="px-4 py-4 text-sm font-semibold">
                Total Deductible Expenses
              </td>
              <td className="px-4 py-4 text-right font-bold tabular-nums">
                {formatCurrency(summary.totalDeductions)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default function TaxPage() {
  const [selectedYear, setSelectedYear] = useState(AVAILABLE_TAX_YEARS[0].key);
  
  // Filter expenses by year
  const yearExpenses = DEMO_EXPENSES.filter(exp => exp.date.startsWith(selectedYear));
  
  // Generate summaries for each property (excluding primary residence)
  const propertySummaries = DEMO_PROPERTIES
    .filter(p => p.property_type !== 'primary')
    .map(property => generatePropertyTaxSummary(property, yearExpenses))
    .filter(summary => summary.totalDeductions > 0 || summary.lineItems.some(l => l.expenses.length > 0));
  
  // Generate insights
  const insights = generateTaxInsights(propertySummaries);
  
  // Calculate totals
  const totalDeductions = propertySummaries.reduce((sum, s) => sum + s.totalDeductions, 0);
  const totalImprovements = propertySummaries.reduce((sum, s) => sum + s.improvementTotal, 0);

  const handleDownloadPDF = () => {
    const html = generateScheduleEHTML(propertySummaries, selectedYear);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  const handleDownloadCSV = () => {
    const csv = generateScheduleECSV(propertySummaries, selectedYear);
    downloadFile(csv, `hostfi-schedule-e-${selectedYear}.csv`, 'text/csv');
  };

  const handleDownloadTXF = () => {
    const txf = generateTXF(propertySummaries, selectedYear);
    downloadFile(txf, `hostfi-schedule-e-${selectedYear}.txf`, 'application/x-tax-exchange');
  };

  const handleShareCPA = () => {
    const csv = generateScheduleECSV(propertySummaries, selectedYear);
    const subject = encodeURIComponent(`Schedule E Report — Tax Year ${selectedYear}`);
    const body = encodeURIComponent(`Hi,\n\nAttached is the Schedule E expense report for tax year ${selectedYear} generated by HostFi.\n\nPlease review at your convenience.\n\nBest regards`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Tax Preparation</h1>
          <p className="text-gray-500 mt-1.5 sm:mt-2 text-sm leading-relaxed">
            Schedule E Expense Mapping for Your Rental Properties
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Year Selector */}
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="appearance-none w-full sm:w-auto px-4 py-2.5 pr-10 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 min-h-[44px] transition-all duration-200"
              style={{ boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)' }}
            >
              {AVAILABLE_TAX_YEARS.map((year) => (
                <option key={year.key} value={year.key}>Tax Year {year.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Export Actions */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
        <button
          onClick={handleDownloadPDF}
          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 bg-white text-foreground font-medium rounded-xl text-xs sm:text-sm border border-gray-200 min-h-[44px] transition-all duration-200 hover:bg-gray-100 hover:border-gray-200/80"
          style={{ boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)' }}
        >
          <Download className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Download Tax Package (PDF)</span>
          <span className="sm:hidden">PDF</span>
        </button>
        <button
          onClick={handleDownloadCSV}
          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 bg-white text-foreground font-medium rounded-xl text-xs sm:text-sm border border-gray-200 min-h-[44px] transition-all duration-200 hover:bg-gray-100 hover:border-gray-200/80"
          style={{ boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)' }}
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span>CSV</span>
        </button>
        <button
          onClick={handleDownloadTXF}
          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 bg-white text-foreground font-medium rounded-xl text-xs sm:text-sm border border-blue-200 min-h-[44px] transition-all duration-200 hover:bg-blue-50 hover:border-blue-300"
          style={{ boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)' }}
        >
          <Download className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="text-blue-700 hidden sm:inline">Export for TurboTax</span>
          <span className="text-blue-700 sm:hidden">TurboTax</span>
        </button>
        <button
          onClick={handleShareCPA}
          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 bg-gray-900 text-white font-medium rounded-xl text-xs sm:text-sm min-h-[44px] transition-colors hover:bg-gray-800"
        >
          <Share2 className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Share with CPA</span>
          <span className="sm:hidden">Share</span>
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <div 
          className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200"
          style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 6px rgba(0, 0, 0, 0.02)' }}
        >
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-lg sm:rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
              <Calculator className="w-4 sm:w-5 h-4 sm:h-5 text-teal-600" />
            </div>
            <span className="text-xs sm:text-sm text-muted-foreground">Total Deductions</span>
          </div>
          <p className="text-xl sm:text-3xl font-bold tabular-nums">{formatCurrency(totalDeductions)}</p>
        </div>
        
        <div 
          className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200"
          style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 6px rgba(0, 0, 0, 0.02)' }}
        >
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-lg sm:rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <Building2 className="w-4 sm:w-5 h-4 sm:h-5 text-indigo-600" />
            </div>
            <span className="text-xs sm:text-sm text-muted-foreground">Properties</span>
          </div>
          <p className="text-xl sm:text-3xl font-bold tabular-nums">{propertySummaries.length}</p>
        </div>
        
        <div 
          className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 col-span-2 sm:col-span-1"
          style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 6px rgba(0, 0, 0, 0.02)' }}
        >
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-lg sm:rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 sm:w-5 h-4 sm:h-5 text-amber-600" />
            </div>
            <span className="text-xs sm:text-sm text-muted-foreground">Improvements (Review)</span>
          </div>
          <p className="text-xl sm:text-3xl font-bold tabular-nums">{formatCurrency(totalImprovements)}</p>
        </div>
      </div>

      {/* Tax Insights */}
      <div 
        className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200"
        style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 6px rgba(0, 0, 0, 0.02)' }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Tax Insights</h2>
            <p className="text-sm text-muted-foreground">AI-powered recommendations</p>
          </div>
        </div>
        
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <InsightCard key={index} insight={insight} />
          ))}
        </div>
      </div>

      {/* Per-Property Schedule E */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold">Schedule E by Property</h2>
        
        {propertySummaries.length === 0 ? (
          <div 
            className="bg-white rounded-2xl p-12 text-center border border-gray-200"
            style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 6px rgba(0, 0, 0, 0.02)' }}
          >
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-muted-foreground/50" />
            </div>
            <p className="font-medium">No expenses found for {selectedYear}</p>
            <p className="text-sm text-muted-foreground mt-1.5">
              Add expenses to see your Schedule E breakdown.
            </p>
          </div>
        ) : (
          propertySummaries.map((summary) => (
            <PropertyTaxCard key={summary.property.id} summary={summary} />
          ))
        )}
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl bg-gray-50 border border-gray-200/60 p-4">
        <p className="text-xs text-muted-foreground text-center">
          <strong>Disclaimer:</strong> This is not tax advice. The information provided is for informational purposes only. 
          Consult a qualified tax professional for advice specific to your situation.
        </p>
      </div>
    </div>
  );
}
