import { type LucideIcon, Zap, Sparkles, Shield, Wrench, Home, Package, Landmark, ClipboardList, RefreshCw, Paintbrush, Paperclip } from "lucide-react";

export type ExpenseCategory =
  | 'utility'
  | 'cleaning'
  | 'insurance'
  | 'maintenance'
  | 'mortgage'
  | 'supplies'
  | 'taxes'
  | 'management'
  | 'subscription'
  | 'improvement'
  | 'other';

export type ExpenseFrequency =
  | 'one-time'
  | 'per-turnover'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'semi-annual'
  | 'annual';

export interface ExpenseTemplate {
  id: string;
  name: string;
  category: ExpenseCategory;
  default_amount: number;
  property_id?: string;
  frequency: ExpenseFrequency;
}

export interface ExpenseCategoryConfig {
  label: string;
  icon: LucideIcon;
  color: string;
  description: string;
}

export const EXPENSE_CATEGORY_CONFIG: Record<ExpenseCategory, ExpenseCategoryConfig> = {
  utility: { label: 'Utility', icon: Zap, color: 'blue', description: 'Electric, gas, water, internet, trash' },
  cleaning: { label: 'Cleaning', icon: Sparkles, color: 'violet', description: 'Turnover cleans, deep cleans' },
  insurance: { label: 'Insurance', icon: Shield, color: 'cyan', description: 'Property, liability, umbrella' },
  maintenance: { label: 'Maintenance', icon: Wrench, color: 'orange', description: 'Repairs, fixes, handyman' },
  mortgage: { label: 'Mortgage/Rent', icon: Home, color: 'slate', description: 'Monthly mortgage or lease payment' },
  supplies: { label: 'Supplies', icon: Package, color: 'amber', description: 'Toiletries, linens, consumables' },
  taxes: { label: 'Taxes', icon: Landmark, color: 'red', description: 'Property tax, TOT, lodging tax' },
  management: { label: 'Management', icon: ClipboardList, color: 'indigo', description: 'PM fees, co-host fees' },
  subscription: { label: 'Subscriptions', icon: RefreshCw, color: 'teal', description: 'Software, smart locks, services' },
  improvement: { label: 'Improvements', icon: Paintbrush, color: 'pink', description: 'Renovations, upgrades, capex' },
  other: { label: 'Other', icon: Paperclip, color: 'gray', description: 'Miscellaneous expenses' },
};

export const ALL_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'utility', 'cleaning', 'insurance', 'maintenance', 'mortgage',
  'supplies', 'taxes', 'management', 'subscription', 'improvement', 'other',
];

export const FREQUENCY_LABELS: Record<ExpenseFrequency, string> = {
  'one-time': 'One-time',
  'per-turnover': 'Per turnover',
  'weekly': 'Weekly',
  'monthly': 'Monthly',
  'quarterly': 'Quarterly',
  'semi-annual': 'Semi-annual',
  'annual': 'Annual',
};

export function getCategoryColorClasses(color: string): { bg: string; text: string; border: string } {
  const map: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/20' },
    violet: { bg: 'bg-violet-500/10', text: 'text-violet-600', border: 'border-violet-500/20' },
    cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-600', border: 'border-cyan-500/20' },
    orange: { bg: 'bg-orange-500/10', text: 'text-orange-600', border: 'border-orange-500/20' },
    slate: { bg: 'bg-slate-500/10', text: 'text-slate-600', border: 'border-slate-500/20' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/20' },
    red: { bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-500/20' },
    indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-600', border: 'border-indigo-500/20' },
    teal: { bg: 'bg-teal-500/10', text: 'text-teal-600', border: 'border-teal-500/20' },
    pink: { bg: 'bg-pink-500/10', text: 'text-pink-600', border: 'border-pink-500/20' },
    gray: { bg: 'bg-gray-500/10', text: 'text-gray-600', border: 'border-gray-500/20' },
  };
  return map[color] || map.gray;
}
