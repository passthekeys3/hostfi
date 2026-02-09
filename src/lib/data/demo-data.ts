/**
 * Demo Data — Centralized exports of all demo/mock data
 * 
 * This file re-exports all demo data from their respective modules.
 * When Supabase is not configured, the data-provider uses these exports.
 */

// ============================================================================
// Properties & Bills (core entities)
// ============================================================================
export { 
  DEMO_PROPERTIES, 
  DEMO_UTILITY_ACCOUNTS, 
  DEMO_BILLS,
  type Property,
  type UtilityAccount,
  type Bill,
  type Expense,
  type RecurringExpense,
} from '../types';

// ============================================================================
// Expenses
// ============================================================================
export { 
  DEMO_EXPENSES, 
  DEMO_RECURRING_EXPENSES,
  getExpensesForProperty,
  getExpensesByCategory,
  getSourceIcon,
  getSourceLabel,
  type DemoExpense,
} from '../demo-expenses';

// ============================================================================
// Revenue
// ============================================================================
export {
  DEMO_REVENUE,
  REVENUE_SOURCES,
  getRevenueForProperty,
  getRevenueByMonth,
  getRevenueBySource,
  type RevenueEntry,
  type RevenueSource,
} from '../demo-revenue';

// ============================================================================
// Alerts
// ============================================================================
export {
  DEMO_ALERTS,
  ALERT_TYPE_CONFIG,
  filterAlerts,
  type Alert,
  type AlertType,
  type AlertFilter,
} from '../demo-alerts';

// ============================================================================
// Anomalies
// ============================================================================
export {
  DEMO_ANOMALIES,
  getActiveAnomalies,
  getCriticalAnomalies,
  getAnomalyCountByStatus,
} from '../demo-anomalies';

// ============================================================================
// Analytics
// ============================================================================
export {
  DEMO_ANALYTICS_DATA,
  UTILITY_COLORS,
  UTILITY_LABELS,
  ALL_UTILITY_TYPES,
  ALL_EXPENSE_TYPES,
  getMonthlyTotals,
  getSpendByProperty,
  getUtilityBreakdown,
  getMoMComparison,
  getPropertyTable,
  type UtilityType,
  type MonthlyBill,
} from '../demo-analytics';

// ============================================================================
// Benchmarks
// ============================================================================
export {
  DEMO_BENCHMARKS,
  DEMO_INSIGHTS,
  DEMO_PORTFOLIO_SUMMARY,
  DEMO_MONTHLY_TRENDS,
  DEMO_HEATMAP,
  DEMO_UTILITY_COMPARISON,
} from '../demo-benchmarks';

// ============================================================================
// Reports
// ============================================================================
export {
  AVAILABLE_MONTHS,
  DEMO_MONTHLY_REPORTS,
  getMonthlyReport,
  generateMonthlyReport,
  type MonthlyReportData,
  type PropertySummary,
  type MonthlyInsight,
  type AnomalyCallout,
} from '../demo-reports';
