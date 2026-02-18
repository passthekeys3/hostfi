/**
 * Expense utility functions
 */

import { Mail, CreditCard, Receipt, Upload, Bot, FileText, type LucideIcon } from "lucide-react";

export type ExpenseSource = 'email' | 'plaid' | 'manual' | 'csv' | 'ai' | 'recurring';

export const SOURCE_ICONS: Record<ExpenseSource, LucideIcon> = {
  email: Mail,
  plaid: CreditCard,
  manual: Receipt,
  csv: Upload,
  ai: Bot,
  recurring: FileText,
};

export const SOURCE_LABELS: Record<ExpenseSource, string> = {
  email: 'Email',
  plaid: 'Plaid',
  manual: 'Manual',
  csv: 'CSV Import',
  ai: 'AI Parsed',
  recurring: 'Recurring',
};

export function getSourceIcon(source?: string): LucideIcon {
  return SOURCE_ICONS[source as ExpenseSource] || Receipt;
}

export function getSourceLabel(source?: string): string {
  return SOURCE_LABELS[source as ExpenseSource] || 'Manual';
}
