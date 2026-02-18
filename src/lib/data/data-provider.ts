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
 * Returns true if the app is running in demo mode.
 * Demo mode is either:
 * 1. Supabase is not configured at all
 * 2. User explicitly entered demo mode via login page (localStorage flag)
 */
export function isDemoMode(): boolean {
  if (!isSupabaseConfigured()) return true;
  if (typeof window !== 'undefined') {
    return localStorage.getItem('hostfi_demo_mode') === 'true';
  }
  return false;
}

/**
 * Enter demo mode explicitly
 */
export function enterDemoMode(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('hostfi_demo_mode', 'true');
  }
}

/**
 * Exit demo mode (e.g. on real signup/login)
 */
export function exitDemoMode(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('hostfi_demo_mode');
  }
}

// ============================================================================
// Properties
// ============================================================================

export async function getProperties(userId?: string): Promise<Property[]> {
  if (isDemoMode()) {
    return DEMO_PROPERTIES;
  }
  
  // Real Supabase query
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    if (!supabase) return [];
    const { data } = await supabase.from('properties').select('*').order('created_at', { ascending: false });
    return (data as Property[]) || [];
  } catch (error) {
    console.error('Failed to fetch properties:', error);
    return [];
  }
}

export async function getPropertyById(propertyId: string): Promise<Property | null> {
  if (isDemoMode()) {
    return DEMO_PROPERTIES.find(p => p.id === propertyId) || null;
  }
  
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    if (!supabase) return null;
    const { data } = await supabase.from('properties').select('*').eq('id', propertyId).single();
    return (data as Property) || null;
  } catch (error) {
    console.error('Failed to fetch property by ID:', error);
    return null;
  }
}

// ============================================================================
// Expenses
// ============================================================================

export async function getExpenses(userId?: string): Promise<DemoExpense[]> {
  if (isDemoMode()) {
    return DEMO_EXPENSES;
  }
  
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    if (!supabase) return [];
    const { data } = await supabase.from('expenses').select('*').order('date', { ascending: false });
    return (data as DemoExpense[]) || [];
  } catch (error) {
    console.error('Failed to fetch expenses:', error);
    return [];
  }
}

export async function getExpensesByPropertyId(propertyId: string): Promise<DemoExpense[]> {
  if (isDemoMode()) {
    return DEMO_EXPENSES.filter(e => e.property_id === propertyId);
  }
  
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    if (!supabase) return [];
    const { data } = await supabase.from('expenses').select('*').eq('property_id', propertyId).order('date', { ascending: false });
    return (data as DemoExpense[]) || [];
  } catch (error) {
    console.error('Failed to fetch expenses by property:', error);
    return [];
  }
}

export async function getRecurringExpenses(userId?: string): Promise<RecurringExpense[]> {
  if (isDemoMode()) {
    return DEMO_RECURRING_EXPENSES;
  }
  
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    if (!supabase) return [];
    const { data } = await supabase.from('recurring_expenses').select('*').order('created_at', { ascending: false });
    return (data as RecurringExpense[]) || [];
  } catch (error) {
    console.error('Failed to fetch recurring expenses:', error);
    return [];
  }
}

// ============================================================================
// Revenue
// ============================================================================

export async function getRevenue(userId?: string): Promise<RevenueEntry[]> {
  if (isDemoMode()) {
    return DEMO_REVENUE;
  }
  
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    if (!supabase) return [];
    const { data } = await supabase.from('revenue').select('*').order('date', { ascending: false });
    return (data as RevenueEntry[]) || [];
  } catch (error) {
    console.error('Failed to fetch revenue:', error);
    return [];
  }
}

export async function getRevenueByPropertyId(propertyId: string): Promise<RevenueEntry[]> {
  if (isDemoMode()) {
    return DEMO_REVENUE.filter(r => r.property_id === propertyId);
  }
  
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    if (!supabase) return [];
    const { data } = await supabase.from('revenue').select('*').eq('property_id', propertyId).order('date', { ascending: false });
    return (data as RevenueEntry[]) || [];
  } catch (error) {
    console.error('Failed to fetch revenue by property:', error);
    return [];
  }
}

// ============================================================================
// Alerts & Anomalies
// ============================================================================

export async function getAlerts(userId?: string): Promise<Alert[]> {
  if (isDemoMode()) {
    return DEMO_ALERTS;
  }
  return [];
}

export async function getAnomalies(userId?: string): Promise<AnomalyResult[]> {
  if (isDemoMode()) {
    return DEMO_ANOMALIES;
  }
  return [];
}

// ============================================================================
// Analytics
// ============================================================================

export async function getAnalyticsData(userId?: string): Promise<MonthlyBill[]> {
  if (isDemoMode()) {
    return DEMO_ANALYTICS_DATA;
  }
  return [];
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

export async function getMonthlyReportData(monthKey: string): Promise<MonthlyReportData | null> {
  if (isDemoMode()) {
    return DEMO_MONTHLY_REPORTS[monthKey] || DEMO_MONTHLY_REPORTS[AVAILABLE_MONTHS[0].key];
  }
  return null;
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
  if (isDemoMode()) {
    return DEMO_BILLS;
  }
  return [];
}

export async function getUtilityAccounts(userId?: string) {
  if (isDemoMode()) {
    return DEMO_UTILITY_ACCOUNTS;
  }
  return [];
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
