/**
 * Data Provider — Unified data access layer
 * 
 * Automatically returns demo data when Supabase is not configured,
 * or queries real data from Supabase when available.
 */

import {
  DEMO_PROPERTIES,
  DEMO_EXPENSES,
  DEMO_RECURRING_EXPENSES,
  DEMO_REVENUE,
  DEMO_ALERTS,
  DEMO_ANOMALIES,
  DEMO_ANALYTICS_DATA,
  DEMO_BENCHMARKS,
  DEMO_PORTFOLIO_SUMMARY,
  DEMO_INSIGHTS,
  DEMO_MONTHLY_TRENDS,
  DEMO_HEATMAP,
  DEMO_UTILITY_COMPARISON,
  DEMO_MONTHLY_REPORTS,
  AVAILABLE_MONTHS,
  DEMO_BILLS,
  DEMO_UTILITY_ACCOUNTS,
  type Property,
  type DemoExpense,
  type RecurringExpense,
  type RevenueEntry,
  type Alert,
  type MonthlyBill,
  type MonthlyReportData,
} from './demo-data';

import { type AnomalyResult } from '../anomaly-detection';

// ============================================================================
// Configuration Check
// ============================================================================

/**
 * Check if Supabase is configured with valid credentials.
 * Returns false if env vars are missing or set to placeholder values.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // Check for existence
  if (!url || !key) return false;
  
  // Check for placeholder values (common in .env.example files)
  if (url.includes('your-project') || url === 'https://example.supabase.co') return false;
  if (key === 'your-anon-key' || key.length < 20) return false;
  
  return true;
}

/**
 * Returns true if the app is running in demo mode (no Supabase).
 */
export function isDemoMode(): boolean {
  return !isSupabaseConfigured();
}

// ============================================================================
// Properties
// ============================================================================

export async function getProperties(userId?: string): Promise<Property[]> {
  if (!isSupabaseConfigured()) {
    return DEMO_PROPERTIES;
  }
  
  // TODO: Real Supabase query
  // const { data, error } = await supabase
  //   .from('properties')
  //   .select('*')
  //   .eq('user_id', userId);
  // return data || [];
  
  return DEMO_PROPERTIES;
}

export async function getPropertyById(propertyId: string): Promise<Property | null> {
  if (!isSupabaseConfigured()) {
    return DEMO_PROPERTIES.find(p => p.id === propertyId) || null;
  }
  
  // TODO: Real Supabase query
  return DEMO_PROPERTIES.find(p => p.id === propertyId) || null;
}

// ============================================================================
// Expenses
// ============================================================================

export async function getExpenses(userId?: string): Promise<DemoExpense[]> {
  if (!isSupabaseConfigured()) {
    return DEMO_EXPENSES;
  }
  
  // TODO: Real Supabase query
  return DEMO_EXPENSES;
}

export async function getExpensesByPropertyId(propertyId: string): Promise<DemoExpense[]> {
  if (!isSupabaseConfigured()) {
    return DEMO_EXPENSES.filter(e => e.property_id === propertyId);
  }
  
  // TODO: Real Supabase query
  return DEMO_EXPENSES.filter(e => e.property_id === propertyId);
}

export async function getRecurringExpenses(userId?: string): Promise<RecurringExpense[]> {
  if (!isSupabaseConfigured()) {
    return DEMO_RECURRING_EXPENSES;
  }
  
  // TODO: Real Supabase query
  return DEMO_RECURRING_EXPENSES;
}

// ============================================================================
// Revenue
// ============================================================================

export async function getRevenue(userId?: string): Promise<RevenueEntry[]> {
  if (!isSupabaseConfigured()) {
    return DEMO_REVENUE;
  }
  
  // TODO: Real Supabase query
  return DEMO_REVENUE;
}

export async function getRevenueByPropertyId(propertyId: string): Promise<RevenueEntry[]> {
  if (!isSupabaseConfigured()) {
    return DEMO_REVENUE.filter(r => r.property_id === propertyId);
  }
  
  // TODO: Real Supabase query
  return DEMO_REVENUE.filter(r => r.property_id === propertyId);
}

// ============================================================================
// Alerts & Anomalies
// ============================================================================

export async function getAlerts(userId?: string): Promise<Alert[]> {
  if (!isSupabaseConfigured()) {
    return DEMO_ALERTS;
  }
  
  // TODO: Real Supabase query
  return DEMO_ALERTS;
}

export async function getAnomalies(userId?: string): Promise<AnomalyResult[]> {
  if (!isSupabaseConfigured()) {
    return DEMO_ANOMALIES;
  }
  
  // TODO: Real Supabase query
  return DEMO_ANOMALIES;
}

// ============================================================================
// Analytics
// ============================================================================

export async function getAnalyticsData(userId?: string): Promise<MonthlyBill[]> {
  if (!isSupabaseConfigured()) {
    return DEMO_ANALYTICS_DATA;
  }
  
  // TODO: Real Supabase query with aggregation
  return DEMO_ANALYTICS_DATA;
}

// ============================================================================
// Benchmarking
// ============================================================================

export function getBenchmarkingData() {
  // Benchmarking is calculated from analytics data, so we use the same demo data
  // In production, this would be calculated from real analytics data
  return {
    benchmarks: DEMO_BENCHMARKS,
    portfolioSummary: DEMO_PORTFOLIO_SUMMARY,
    insights: DEMO_INSIGHTS,
    monthlyTrends: DEMO_MONTHLY_TRENDS,
    heatmap: DEMO_HEATMAP,
    utilityComparison: DEMO_UTILITY_COMPARISON,
  };
}

// ============================================================================
// Reports
// ============================================================================

export async function getMonthlyReportData(monthKey: string): Promise<MonthlyReportData> {
  if (!isSupabaseConfigured()) {
    return DEMO_MONTHLY_REPORTS[monthKey] || DEMO_MONTHLY_REPORTS[AVAILABLE_MONTHS[0].key];
  }
  
  // TODO: Real report generation from Supabase data
  return DEMO_MONTHLY_REPORTS[monthKey] || DEMO_MONTHLY_REPORTS[AVAILABLE_MONTHS[0].key];
}

export function getAvailableReportMonths() {
  // In demo mode, return hardcoded months
  // In production, query distinct months from expenses table
  return AVAILABLE_MONTHS;
}

// ============================================================================
// Bills (Legacy)
// ============================================================================

export async function getBills(userId?: string) {
  if (!isSupabaseConfigured()) {
    return DEMO_BILLS;
  }
  
  // TODO: Real Supabase query
  return DEMO_BILLS;
}

export async function getUtilityAccounts(userId?: string) {
  if (!isSupabaseConfigured()) {
    return DEMO_UTILITY_ACCOUNTS;
  }
  
  // TODO: Real Supabase query
  return DEMO_UTILITY_ACCOUNTS;
}

// ============================================================================
// Dashboard Overview Stats
// ============================================================================

export interface DashboardStats {
  totalSpend: number;
  propertyCount: number;
  strCount: number;
  ltrCount: number;
  pendingCount: number;
  overdueCount: number;
  anomalyCount: number;
  criticalAnomalies: number;
  highAnomalies: number;
  newAnomalies: number;
}

export async function getDashboardStats(userId?: string): Promise<DashboardStats> {
  const expenses = await getExpenses(userId);
  const properties = await getProperties(userId);
  const anomalies = await getAnomalies(userId);
  
  const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0);
  const pendingExpenses = expenses.filter(e => e.status === 'pending');
  const overdueExpenses = expenses.filter(e => e.status === 'overdue');
  
  return {
    totalSpend,
    propertyCount: properties.length,
    strCount: properties.filter(p => p.property_type === 'str').length,
    ltrCount: properties.filter(p => p.property_type === 'ltr').length,
    pendingCount: pendingExpenses.length,
    overdueCount: overdueExpenses.length,
    anomalyCount: anomalies.length,
    criticalAnomalies: anomalies.filter(a => a.severity === 'critical').length,
    highAnomalies: anomalies.filter(a => a.severity === 'high').length,
    newAnomalies: anomalies.filter(a => a.status === 'new').length,
  };
}

// ============================================================================
// Re-export demo data for direct access when needed
// ============================================================================

export {
  DEMO_PROPERTIES,
  DEMO_EXPENSES,
  DEMO_REVENUE,
  DEMO_ALERTS,
  DEMO_ANOMALIES,
  DEMO_ANALYTICS_DATA,
  DEMO_BENCHMARKS,
  DEMO_MONTHLY_REPORTS,
  AVAILABLE_MONTHS,
};
