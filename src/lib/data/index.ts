/**
 * Data Layer — Clean API for data access
 * 
 * Import from '@/lib/data' for unified data access.
 */

// Configuration
export { isSupabaseConfigured } from './data-provider';

// Data providers (use these for fetching data)
export {
  getProperties,
  getPropertyById,
  getExpenses,
  getExpensesByPropertyId,
  getRecurringExpenses,
  getRevenue,
  getRevenueByPropertyId,
  getAlerts,
  getAnomalies,
  getAnalyticsData,
  getBenchmarkingData,
  getMonthlyReportData,
  getAvailableReportMonths,
  getBills,
  getUtilityAccounts,
  getDashboardStats,
  AVAILABLE_MONTHS,
  type DashboardStats,
  type Property,
  type Expense,
  type RecurringExpense,
  type RevenueEntry,
  type Alert,
  type MonthlyBill,
  type MonthlyReportData,
} from './data-provider';

// No demo mode - these are empty placeholders for backward compatibility
// Use useDashboardData() hook to fetch real data
export const DEMO_PROPERTIES: never[] = [];
export const DEMO_ANALYTICS_DATA: never[] = [];
export const DEMO_BENCHMARKS: never[] = [];
export const DEMO_INSIGHTS: never[] = [];
export const DEMO_PORTFOLIO_SUMMARY = null;
export const DEMO_MONTHLY_TRENDS: never[] = [];
export const DEMO_HEATMAP = null;
export const DEMO_UTILITY_COMPARISON: never[] = [];

// isDemoMode is always false - no demo mode
export function isDemoMode(): boolean {
  return false;
}
