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
  address_line2: string | null;
  city: string;
  state: string;
  zip: string;
  property_type: 'str' | 'ltr' | 'primary' | 'arbitrage';
  status: 'active' | 'inactive';
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
// Demo data
// ============================================================================

export const DEMO_PROPERTIES: Property[] = [
  {
    id: '1', user_id: 'demo', name: 'Venice Beach Unit',
    address_line1: '1234 Abbot Kinney Blvd', address_line2: 'Unit A',
    city: 'Venice', state: 'CA', zip: '90291',
    property_type: 'str', status: 'active',
    bedrooms: 4, bathrooms: 2, sqft: 1800,
    created_at: '2024-01-15T00:00:00Z', updated_at: '2024-01-15T00:00:00Z',
  },
  {
    id: '2', user_id: 'demo', name: 'Silver Lake Duplex',
    address_line1: '4567 Sunset Blvd', address_line2: null,
    city: 'Los Angeles', state: 'CA', zip: '90026',
    property_type: 'ltr', status: 'active',
    bedrooms: 2, bathrooms: 1, sqft: 950,
    created_at: '2024-02-01T00:00:00Z', updated_at: '2024-02-01T00:00:00Z',
  },
  {
    id: '3', user_id: 'demo', name: 'Joshua Tree Cabin',
    address_line1: '789 Desert View Rd', address_line2: null,
    city: 'Joshua Tree', state: 'CA', zip: '92252',
    property_type: 'str', status: 'active',
    bedrooms: 3, bathrooms: 2, sqft: 1400,
    created_at: '2024-03-10T00:00:00Z', updated_at: '2024-03-10T00:00:00Z',
  },
];

export const DEMO_UTILITY_ACCOUNTS: (UtilityAccount & { property?: Property })[] = [
  { id: 'ua1', property_id: '1', user_id: 'demo', provider_name: 'LADWP', account_number: '1234567', utility_type: 'electric', autopay: true, created_at: '2024-01-15T00:00:00Z', updated_at: '2024-01-15T00:00:00Z', property: DEMO_PROPERTIES[0] },
  { id: 'ua2', property_id: '1', user_id: 'demo', provider_name: 'SoCalGas', account_number: '7654321', utility_type: 'gas', autopay: false, created_at: '2024-01-15T00:00:00Z', updated_at: '2024-01-15T00:00:00Z', property: DEMO_PROPERTIES[0] },
  { id: 'ua3', property_id: '2', user_id: 'demo', provider_name: 'LADWP', account_number: '9876543', utility_type: 'electric', autopay: true, created_at: '2024-02-01T00:00:00Z', updated_at: '2024-02-01T00:00:00Z', property: DEMO_PROPERTIES[1] },
  { id: 'ua4', property_id: '2', user_id: 'demo', provider_name: 'Spectrum', account_number: '5551234', utility_type: 'internet', autopay: true, created_at: '2024-02-01T00:00:00Z', updated_at: '2024-02-01T00:00:00Z', property: DEMO_PROPERTIES[1] },
  { id: 'ua5', property_id: '3', user_id: 'demo', provider_name: 'SCE', account_number: '3216549', utility_type: 'electric', autopay: false, created_at: '2024-03-10T00:00:00Z', updated_at: '2024-03-10T00:00:00Z', property: DEMO_PROPERTIES[2] },
];

export const DEMO_BILLS: (Bill & { utility_account?: UtilityAccount & { property?: Property } })[] = [
  { id: 'b1', utility_account_id: 'ua1', user_id: 'demo', amount: 142.50, due_date: '2026-02-15', billing_period_start: '2026-01-01', billing_period_end: '2026-01-31', status: 'pending', payment_method: null, source: 'manual', raw_email_id: null, confidence_score: null, created_at: '2026-02-01T00:00:00Z', paid_at: null, utility_account: DEMO_UTILITY_ACCOUNTS[0] },
  { id: 'b2', utility_account_id: 'ua2', user_id: 'demo', amount: 67.30, due_date: '2026-02-12', billing_period_start: '2026-01-01', billing_period_end: '2026-01-31', status: 'overdue', payment_method: null, source: 'manual', raw_email_id: null, confidence_score: null, created_at: '2026-01-28T00:00:00Z', paid_at: null, utility_account: DEMO_UTILITY_ACCOUNTS[1] },
  { id: 'b3', utility_account_id: 'ua3', user_id: 'demo', amount: 198.00, due_date: '2026-02-20', billing_period_start: '2026-01-01', billing_period_end: '2026-01-31', status: 'pending', payment_method: 'autopay', source: 'manual', raw_email_id: null, confidence_score: null, created_at: '2026-02-05T00:00:00Z', paid_at: null, utility_account: DEMO_UTILITY_ACCOUNTS[2] },
  { id: 'b4', utility_account_id: 'ua4', user_id: 'demo', amount: 89.99, due_date: '2026-02-10', billing_period_start: '2026-01-15', billing_period_end: '2026-02-14', status: 'paid', payment_method: 'autopay', source: 'manual', raw_email_id: null, confidence_score: null, created_at: '2026-01-25T00:00:00Z', paid_at: '2026-02-10T00:00:00Z', utility_account: DEMO_UTILITY_ACCOUNTS[3] },
  { id: 'b5', utility_account_id: 'ua5', user_id: 'demo', amount: 210.75, due_date: '2026-02-18', billing_period_start: '2026-01-01', billing_period_end: '2026-01-31', status: 'pending', payment_method: null, source: 'email_parse', raw_email_id: null, confidence_score: 0.95, created_at: '2026-02-03T00:00:00Z', paid_at: null, utility_account: DEMO_UTILITY_ACCOUNTS[4] },
  { id: 'b6', utility_account_id: 'ua1', user_id: 'demo', amount: 135.20, due_date: '2026-01-15', billing_period_start: '2025-12-01', billing_period_end: '2025-12-31', status: 'paid', payment_method: 'manual', source: 'manual', raw_email_id: null, confidence_score: null, created_at: '2026-01-02T00:00:00Z', paid_at: '2026-01-14T00:00:00Z', utility_account: DEMO_UTILITY_ACCOUNTS[0] },
];
