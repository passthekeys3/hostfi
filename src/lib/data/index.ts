/**
 * Data Layer — Clean API for data access
 * 
 * Import from '@/lib/data' for unified data access.
 */

// Configuration
export { isSupabaseConfigured, isDemoMode, enterDemoMode, exitDemoMode } from './data-provider';

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
  type DashboardStats,
} from './data-provider';

export { AVAILABLE_MONTHS } from './data-provider';

// Direct demo data access (always returns data regardless of mode — use getDemoData() instead)
export {
  DEMO_PROPERTIES,
  DEMO_EXPENSES,
  DEMO_REVENUE,
  DEMO_ALERTS,
  DEMO_ANOMALIES,
  DEMO_ANALYTICS_DATA,
  DEMO_BENCHMARKS,
  DEMO_MONTHLY_REPORTS,
} from './data-provider';

// Types
export type {
  Property,
  DemoExpense,
  RecurringExpense,
  RevenueEntry,
  Alert,
  MonthlyBill,
  MonthlyReportData,
} from './demo-data';
