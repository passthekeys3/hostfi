import { describe, it, expect } from 'vitest';
import { ALL_EXPENSE_CATEGORIES, type ExpenseCategory } from '../expense-categories';
import {
  SCHEDULE_E_INCOME_LINE,
  SCHEDULE_E_LINES,
  categoryScheduleELine,
  generatePropertyTaxSummary,
  getScheduleELinesForPropertyType,
  mapExpensesToScheduleE,
} from '../tax-mapping';
import { generateScheduleECSV } from '../tax-export';
import type { Expense, Property } from '../types';

const IRS_LINES: Record<number, string> = {
  3: 'Rents received',
  5: 'Advertising',
  6: 'Auto and travel',
  7: 'Cleaning and maintenance',
  8: 'Commissions',
  9: 'Insurance',
  10: 'Legal and professional fees',
  11: 'Management fees',
  12: 'Mortgage interest paid to banks, etc.',
  13: 'Other interest',
  14: 'Repairs',
  15: 'Supplies',
  16: 'Taxes',
  17: 'Utilities',
  18: 'Depreciation expense or depletion',
  19: 'Other',
};

function expense(category: ExpenseCategory, amount = 10): Expense {
  return {
    id: category,
    user_id: 'u',
    property_id: 'p',
    category,
    description: null,
    vendor: null,
    amount,
    date: '2026-01-01',
    frequency: 'one-time',
    is_recurring: false,
    recurring_expense_id: null,
    source: 'manual',
    status: 'paid',
    payment_method: null,
    notes: null,
    receipt_url: null,
    utility_account_id: null,
    billing_period_start: null,
    billing_period_end: null,
    due_date: null,
    raw_email_id: null,
    confidence_score: null,
    created_at: '',
    updated_at: '',
    paid_at: null,
  };
}

const property = {
  id: 'p',
  user_id: 'u',
  name: 'Unit',
  address_line1: '1 Main',
  city: 'LA',
  state: 'CA',
  zip: '90001',
  property_type: 'str',
  bedrooms: 1,
  bathrooms: 1,
  created_at: '',
  updated_at: '',
} as Property;

describe('Schedule E line map', () => {
  it('matches the 2025 IRS Schedule E lines', () => {
    expect(SCHEDULE_E_INCOME_LINE).toBe(3);
    for (const line of SCHEDULE_E_LINES) {
      expect(line.description).toBe(IRS_LINES[line.line]);
    }
    expect(SCHEDULE_E_LINES.map(line => line.line)).toEqual([
      3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
    ]);
    expect(SCHEDULE_E_LINES.find(line => line.line === 3)?.income).toBe(true);
    expect(SCHEDULE_E_LINES.filter(line => line.income).map(line => line.line)).toEqual([3]);
  });

  it('assigns every owner category to exactly one expense line', () => {
    const expected: Record<ExpenseCategory, number> = {
      cleaning: 7,
      insurance: 9,
      management: 11,
      mortgage: 12,
      maintenance: 14,
      supplies: 15,
      taxes: 16,
      utility: 17,
      improvement: 18,
      rent: 19,
      subscription: 19,
      other: 19,
    };
    for (const category of ALL_EXPENSE_CATEGORIES) {
      expect(categoryScheduleELine(category, 'str')).toBe(expected[category]);
    }
    const assigned = getScheduleELinesForPropertyType('str')
      .filter(line => !line.income)
      .flatMap(line => line.categories);
    expect(new Set(assigned).size).toBe(assigned.length);
  });

  it('files arbitrage rent on line 19 and does not treat it as mortgage interest', () => {
    expect(categoryScheduleELine('rent', 'arbitrage')).toBe(19);
    expect(categoryScheduleELine('mortgage', 'arbitrage')).toBe(19);
    expect(getScheduleELinesForPropertyType('arbitrage').some(line => line.line === 12)).toBe(false);
    const mapped = mapExpensesToScheduleE(
      [expense('rent', 2200), expense('cleaning', 150), expense('maintenance', 80)],
      'arbitrage'
    );
    expect(mapped.find(line => line.line === 19)?.amount).toBe(2200);
    expect(mapped.find(line => line.line === 7)?.amount).toBe(150);
    expect(mapped.find(line => line.line === 14)?.amount).toBe(80);
    expect(mapped.find(line => line.line === 3)?.income).toBe(true);
  });

  it('does not count rents received as a deduction', () => {
    const summary = generatePropertyTaxSummary(property, [expense('cleaning', 100)]);
    expect(summary.totalDeductions).toBe(100);
    expect(summary.lineItems.find(line => line.line === 3)?.amount).toBe(0);
  });

  it('exports rents on line 3', () => {
    const summary = generatePropertyTaxSummary(property, [expense('cleaning', 40)]);
    const csv = generateScheduleECSV([summary], '2026', { p: [{ payout_amount: 500 }] });
    expect(csv).toContain(',3,Rents received,500.00,2026');
    expect(csv).not.toContain(',5,Rents received');
    expect(csv).toContain(',7,"Cleaning and maintenance",40.00,2026');
  });
});
