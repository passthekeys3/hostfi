import { type ExpenseCategory, type ExpenseFrequency } from './expense-categories';

// ============================================================================
// Database Types (match Supabase schema exactly)
// ============================================================================

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  billing_email: string | null;
  onboarding_completed: boolean;
  onboarding_step: number;
  plan: 'free' | 'pro' | 'business';
  properties_limit: number;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  user_id: string;
  name: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  zip: string;
  property_type: 'str' | 'ltr' | 'primary' | 'arbitrage';
  status?: 'active' | 'inactive';
  bedrooms: number;
  bathrooms: number;
  sqft?: number;
  created_at: string;
  updated_at: string;
}

export interface UtilityAccount {
  id: string;
  property_id: string;
  user_id: string;
  provider_name: string;
  account_number: string | null;
  utility_type: 'electric' | 'gas' | 'water' | 'internet' | 'trash' | 'rent' | 'insurance' | 'other';
  autopay: boolean;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  property_id: string;
  category: ExpenseCategory;
  description: string | null;
  vendor: string | null;
  amount: number;
  date: string;
  frequency: ExpenseFrequency;
  is_recurring: boolean;
  recurring_expense_id: string | null;
  source: 'manual' | 'email_parse' | 'recurring_auto' | 'receipt_scan';
  status: 'pending' | 'paid' | 'overdue' | 'scheduled';
  payment_method: string | null;
  notes: string | null;
  receipt_url: string | null;
  utility_account_id: string | null;
  billing_period_start: string | null;
  billing_period_end: string | null;
  due_date: string | null;
  raw_email_id: string | null;
  confidence_score: number | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  // Joined fields
  property?: Property;
  utility_account?: UtilityAccount;
  recurring_expense?: RecurringExpense;
}

export interface RecurringExpense {
  id: string;
  user_id: string;
  property_id: string;
  category: ExpenseCategory;
  description: string;
  vendor: string | null;
  amount: number;
  frequency: ExpenseFrequency;
  is_active: boolean;
  next_due_date: string | null;
  last_generated_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  property?: Property;
}

export interface Receipt {
  id: string;
  expense_id: string | null;
  user_id: string;
  file_url: string;
  file_name: string | null;
  file_type: string | null;
  file_size_bytes: number | null;
  parsed_vendor: string | null;
  parsed_amount: number | null;
  parsed_date: string | null;
  parsed_category: string | null;
  parsed_items: Array<{ description: string; amount: number }> | null;
  parsed_tax: number | null;
  parsed_subtotal: number | null;
  parsed_payment_method: string | null;
  confidence: number | null;
  raw_text: string | null;
  created_at: string;
}

export interface AnomalyLog {
  id: string;
  user_id: string;
  expense_id: string | null;
  property_id: string | null;
  anomaly_type: 'spike' | 'unusual_pattern' | 'possible_leak' | 'rate_increase' | 'new_high';
  severity: 'low' | 'medium' | 'high' | 'critical';
  utility_type: string | null;
  current_amount: number | null;
  expected_amount: number | null;
  deviation_percent: number | null;
  message: string;
  recommendation: string | null;
  seasonal_context: string | null;
  status: 'new' | 'acknowledged' | 'resolved' | 'dismissed';
  created_at: string;
  resolved_at: string | null;
  // Joined fields
  expense?: Expense;
  property?: Property;
}

export interface AlertPreferences {
  id: string;
  user_id: string;
  due_soon_enabled: boolean;
  due_soon_days: number;
  overdue_enabled: boolean;
  unusual_amount_enabled: boolean;
  unusual_amount_threshold: number;
  missing_bill_enabled: boolean;
  new_parsed_enabled: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Legacy types (kept for backward compatibility with bills system)
// ============================================================================

export interface Bill {
  id: string;
  utility_account_id: string;
  user_id: string;
  amount: number;
  due_date: string | null;
  billing_period_start: string | null;
  billing_period_end: string | null;
  status: 'pending' | 'paid' | 'overdue' | 'scheduled';
  payment_method: string | null;
  source: 'manual' | 'email_parse' | 'api';
  raw_email_id: string | null;
  confidence_score: number | null;
  created_at: string;
  paid_at: string | null;
  // Joined fields
  utility_account?: UtilityAccount & { property?: Property };
}

export interface BillMapping {
  id: string;
  user_id: string;
  sender_email: string | null;
  sender_name: string | null;
  provider_name: string | null;
  property_id: string | null;
  utility_account_id: string | null;
  match_type: string | null;
  confidence: number;
  created_at: string;
}

// ============================================================================
// Analytics Types (for charts and benchmarking)
// ============================================================================

export type UtilityType = 'electric' | 'gas' | 'water' | 'internet' | 'trash' | 'rent' | 'insurance' | 'cleaning' | 'maintenance' | 'mortgage' | 'supplies' | 'taxes' | 'management' | 'subscription' | 'improvement' | 'other';

export const UTILITY_LABELS: Record<UtilityType, string> = {
  electric: 'Electric',
  gas: 'Gas',
  water: 'Water',
  internet: 'Internet',
  trash: 'Trash',
  rent: 'Rent',
  insurance: 'Insurance',
  cleaning: 'Cleaning',
  maintenance: 'Maintenance',
  mortgage: 'Mortgage',
  supplies: 'Supplies',
  taxes: 'Taxes',
  management: 'Management',
  subscription: 'Subscription',
  improvement: 'Improvement',
  other: 'Other',
};

export const ALL_EXPENSE_TYPES: UtilityType[] = [
  'electric', 'gas', 'water', 'internet', 'trash', 'rent', 'insurance',
  'cleaning', 'maintenance', 'mortgage', 'supplies', 'taxes', 'management',
  'subscription', 'improvement', 'other'
];

export interface MonthlyBill {
  month: string;
  monthLabel: string;
  property_id: string;
  property_name: string;
  utility_type: UtilityType;
  amount: number;
}

// Chart data helper functions
export function getMonthlyTotals(data: MonthlyBill[]) {
  const months = [...new Set(data.map(b => b.month))].sort();
  return months.map(m => {
    const monthBills = data.filter(b => b.month === m);
    return {
      month: m,
      monthLabel: monthBills[0]?.monthLabel || m,
      total: Math.round(monthBills.reduce((s, b) => s + b.amount, 0) * 100) / 100,
    };
  });
}

export function getUtilityBreakdown(data: MonthlyBill[]) {
  const UTILITY_COLORS: Record<string, string> = {
    electric: '#FBBF24',
    gas: '#F97316',
    water: '#3B82F6',
    internet: '#8B5CF6',
    trash: '#78716C',
    insurance: '#06B6D4',
    cleaning: '#10B981',
    maintenance: '#6366F1',
    mortgage: '#14B8A6',
    supplies: '#EC4899',
    taxes: '#EF4444',
    management: '#8B5CF6',
    subscription: '#F59E0B',
    improvement: '#84CC16',
    other: '#9CA3AF',
  };
  
  const byType = new Map<string, number>();
  for (const b of data) {
    byType.set(b.utility_type, (byType.get(b.utility_type) || 0) + b.amount);
  }
  return [...byType.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type, value]) => ({
      type,
      name: UTILITY_LABELS[type as UtilityType] || type,
      value: Math.round(value * 100) / 100,
      color: UTILITY_COLORS[type] || UTILITY_COLORS.other,
    }));
}

export function getMoMComparison(data: MonthlyBill[]) {
  const months = [...new Set(data.map(b => b.month))].sort();
  if (months.length < 2) return [];
  const currentMonth = months[months.length - 1];
  const previousMonth = months[months.length - 2];
  const utilities = [...new Set(data.map(b => b.utility_type))];

  return utilities.map(ut => {
    const current = data.filter(b => b.month === currentMonth && b.utility_type === ut).reduce((s, b) => s + b.amount, 0);
    const previous = data.filter(b => b.month === previousMonth && b.utility_type === ut).reduce((s, b) => s + b.amount, 0);
    const change = previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0;
    return { type: ut, utility: UTILITY_LABELS[ut] || ut, current: Math.round(current), previous: Math.round(previous), change };
  }).filter(row => row.current > 0 || row.previous > 0);
}

export function getPropertyTable(data: MonthlyBill[]) {
  const months = [...new Set(data.map(b => b.month))].sort();
  const properties = [...new Set(data.map(b => b.property_id))];
  const currentMonth = months[months.length - 1];

  return properties.map(pid => {
    const propData = data.filter(b => b.property_id === pid);
    const name = propData[0]?.property_name || pid;
    const total = propData.reduce((s, b) => s + b.amount, 0);
    const avgMonthly = Math.round((total / months.length) * 100) / 100;
    const highest = Math.round(Math.max(...propData.map(b => b.amount)) * 100) / 100;
    const currentTotal = Math.round(propData.filter(b => b.month === currentMonth).reduce((s, b) => s + b.amount, 0) * 100) / 100;
    const recentMonths = months.slice(-3);
    const olderMonths = months.slice(0, Math.max(months.length - 3, 0));
    const recentAvg = propData.filter(b => recentMonths.includes(b.month)).reduce((s, b) => s + b.amount, 0) / Math.max(recentMonths.length, 1);
    const olderAvg = olderMonths.length > 0 ? propData.filter(b => olderMonths.includes(b.month)).reduce((s, b) => s + b.amount, 0) / olderMonths.length : recentAvg;
    const trendPct = olderAvg > 0 ? Math.round(((recentAvg - olderAvg) / olderAvg) * 100) : 0;
    return { property_id: pid, property_name: name, avgMonthly, highestBill: highest, currentMonth: currentTotal, trendPct };
  });
}

// ============================================================================
// Inbox / Bill Parsing Types
// ============================================================================

export interface ParsedBill {
  provider_name: string;
  utility_type: string;
  amount: number;
  due_date: string | null;
  billing_period_start: string | null;
  billing_period_end: string | null;
  account_number: string | null;
  service_address: string | null;
  confidence: number;
  raw_extraction?: unknown;
}

export interface MatchResult {
  property_id: string | null;
  utility_account_id: string | null;
  match_type: 'exact_mapping' | 'address' | 'account_number' | 'none';
  confidence: number;
  candidates: Array<{ property_id: string; score: number; reason: string }>;
}

export interface InboxItem {
  id: string;
  sender_email: string;
  subject: string;
  body_preview: string;
  received_at: string;
  status: 'pending_review' | 'confirmed' | 'rejected';
  parsed: ParsedBill;
  match: MatchResult;
}

// ============================================================================
// Revenue Types
// ============================================================================

export type RevenueSource = 'airbnb' | 'vrbo' | 'booking_com' | 'direct' | 'other';

export interface RevenueEntry {
  id: string;
  user_id: string;
  property_id: string;
  platform: RevenueSource;
  description: string | null;
  guest_name: string | null;
  amount: number;
  payout_amount: number;
  platform_fee: number;
  check_in: string;
  check_out: string;
  nights: number;
  payout_date: string;
  confirmation_code: string | null;
  created_at: string;
  source: 'manual' | 'csv_import' | 'api';
  // Aliases for backward compatibility
  date?: string;
}

// ============================================================================
// Benchmarking Types
// ============================================================================

export interface UtilityMetric {
  monthly_avg: number;
  trend: 'up' | 'down' | 'stable';
  trend_percent: number;
  rank: number;
  vs_portfolio_avg: number;
}

export interface PropertyBenchmark {
  property_id: string;
  property_name: string;
  metrics: {
    total_monthly_avg: number;
    total_annual: number;
    by_utility: Record<string, UtilityMetric>;
  };
}

export interface BenchmarkInsight {
  id: string;
  type: 'outlier' | 'savings_opportunity' | 'efficiency_leader' | 'trending_up';
  message: string;
  property_name: string;
  utility_type?: string;
  potential_savings?: number;
  severity: 'info' | 'warning' | 'opportunity';
}

export interface PortfolioSummary {
  total_monthly_avg: number;
  most_efficient: { property_name: string; monthly_avg: number };
  least_efficient: { property_name: string; monthly_avg: number };
  biggest_savings: { property_name: string; utility_type: string; annual_savings: number };
}

// ============================================================================
// Reports Types
// ============================================================================

export interface PropertySummary {
  property: Property;
  totalSpend: number;
  topCategory: string;
  topCategoryAmount: number;
  momChange: number;
  momDirection: 'up' | 'down' | 'flat';
}

export interface ReportInsight {
  type: 'positive' | 'warning' | 'negative';
  message: string;
}

export interface ReportAnomaly {
  propertyName: string;
  category: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface MonthlyReportData {
  month: string;
  totalSpend: number;
  momChange: number;
  momDirection: 'up' | 'down' | 'flat';
  propertySummaries: PropertySummary[];
  insights: ReportInsight[];
  anomalies: ReportAnomaly[];
  taxImpact?: { message: string };
  projectedAnnualSpend: number;
  lastYearAnnualSpend: number;
}

// Types only - no demo data. Use useDashboardData() hook to fetch real data.
