/**
 * Data Provider — Unified data access layer
 * 
 * All data is fetched from Supabase. No demo mode — users sign up for free.
 */

import type { AnomalyResult } from '../anomaly-detection';

// Types
// Re-export types from the canonical types file
export type { Property, Expense } from '@/lib/types';
import type { Property, Expense } from '@/lib/types';

export interface RecurringExpense {
  id: string;
  property_id: string;
  user_id?: string;
  category: string;
  description: string;
  amount: number;
  frequency: 'monthly' | 'quarterly' | 'annual';
  next_due: string;
  vendor?: string;
  auto_pay: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RevenueEntry {
  id: string;
  property_id: string;
  user_id?: string;
  platform?: string;
  source?: string;
  amount: number;
  payout_amount?: number;
  platform_fee?: number;
  date: string;
  check_in?: string;
  check_out?: string;
  nights?: number;
  guest_name?: string;
  confirmation_code?: string;
  payout_date?: string;
  description?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Alert {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  read: boolean;
  created_at: string;
  property_id?: string;
  expense_id?: string;
}

export interface MonthlyBill {
  property_id: string;
  property_name: string;
  utility_type: string;
  amount: number;
  month: string;
  year: number;
}

export interface MonthlyReportData {
  month: string;
  totalExpenses: number;
  totalRevenue: number;
  netProfit: number;
  expensesByCategory: Record<string, number>;
  propertySummaries: Array<{
    property: Property;
    expenses: number;
    revenue: number;
    netProfit: number;
  }>;
  insights: Array<{ title: string; description: string; type: 'positive' | 'negative' | 'neutral' }>;
  anomalies: Array<{ title: string; description: string; severity: string }>;
}

// Available months for reports
export const AVAILABLE_MONTHS = [
  { key: '2026-01', label: 'January 2026' },
  { key: '2025-12', label: 'December 2025' },
  { key: '2025-11', label: 'November 2025' },
];

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

// ============================================================================
// Properties
// ============================================================================

export async function getProperties(userId?: string): Promise<Property[]> {
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

export async function getExpenses(userId?: string): Promise<Expense[]> {
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    if (!supabase) return [];
    const { data } = await supabase.from('expenses').select('*').order('date', { ascending: false });
    return (data as Expense[]) || [];
  } catch (error) {
    console.error('Failed to fetch expenses:', error);
    return [];
  }
}

export async function getExpensesByPropertyId(propertyId: string): Promise<Expense[]> {
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    if (!supabase) return [];
    const { data } = await supabase.from('expenses').select('*').eq('property_id', propertyId).order('date', { ascending: false });
    return (data as Expense[]) || [];
  } catch (error) {
    console.error('Failed to fetch expenses by property:', error);
    return [];
  }
}

export async function getRecurringExpenses(userId?: string): Promise<RecurringExpense[]> {
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
  // TODO: Implement real alerts from database
  return [];
}

export async function getAnomalies(userId?: string): Promise<AnomalyResult[]> {
  // Anomalies are fetched via useDashboardData from anomaly_logs table
  return [];
}

// ============================================================================
// Analytics
// ============================================================================

export async function getAnalyticsData(userId?: string): Promise<MonthlyBill[]> {
  // Analytics are computed from expenses data
  return [];
}

// ============================================================================
// Benchmarking
// ============================================================================

export function getBenchmarkingData() {
  // Benchmarking is calculated from real analytics data
  return {
    benchmarks: [],
    portfolioSummary: null,
    insights: [],
    monthlyTrends: [],
    heatmap: [],
    utilityComparison: [],
  };
}

// ============================================================================
// Reports
// ============================================================================

export async function getMonthlyReportData(monthKey: string): Promise<MonthlyReportData | null> {
  // Reports are generated from real expense/revenue data
  return null;
}

export function getAvailableReportMonths() {
  return AVAILABLE_MONTHS;
}

// ============================================================================
// Bills (Legacy)
// ============================================================================

export async function getBills(userId?: string) {
  return [];
}

export async function getUtilityAccounts(userId?: string) {
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
