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

// Data layer - use useDashboardData() hook to fetch real data
