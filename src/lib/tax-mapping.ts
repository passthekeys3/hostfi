import { type Expense, type Property } from './types';
import { type ExpenseCategory } from './expense-categories';

export type PropertyType = Property['property_type'];

// Schedule E (Form 1040) Part I, confirmed against the 2025 IRS instructions:
// line 3 rents received, lines 5–19 expenses. Line numbers are not stored on
// expenses; exports compute them from category.
export interface ScheduleELine {
  line: number;
  description: string;
  categories: ExpenseCategory[];
  /** Income line. Not included in total deductions. */
  income?: boolean;
  ownerOnly?: boolean;
  consultCPA?: boolean;
}

export const SCHEDULE_E_INCOME_LINE = 3;

export const SCHEDULE_E_LINES: ScheduleELine[] = [
  { line: 3, description: 'Rents received', categories: [], income: true },
  { line: 5, description: 'Advertising', categories: [] },
  { line: 6, description: 'Auto and travel', categories: [] },
  { line: 7, description: 'Cleaning and maintenance', categories: ['cleaning'] },
  { line: 8, description: 'Commissions', categories: [] },
  { line: 9, description: 'Insurance', categories: ['insurance'] },
  { line: 10, description: 'Legal and professional fees', categories: [] },
  { line: 11, description: 'Management fees', categories: ['management'] },
  { line: 12, description: 'Mortgage interest paid to banks, etc.', categories: ['mortgage'], ownerOnly: true },
  { line: 13, description: 'Other interest', categories: [] },
  { line: 14, description: 'Repairs', categories: ['maintenance'] },
  { line: 15, description: 'Supplies', categories: ['supplies'] },
  { line: 16, description: 'Taxes', categories: ['taxes'] },
  { line: 17, description: 'Utilities', categories: ['utility'] },
  { line: 18, description: 'Depreciation expense or depletion', categories: ['improvement'], consultCPA: true },
  { line: 19, description: 'Other', categories: ['rent', 'subscription', 'other'] },
];

/** @deprecated Use SCHEDULE_E_LINES. Kept so older imports still resolve. */
export const OWNER_SCHEDULE_E_LINES = SCHEDULE_E_LINES;

export function getScheduleELinesForPropertyType(propertyType: PropertyType): ScheduleELine[] {
  return SCHEDULE_E_LINES.flatMap(line => {
    if (propertyType !== 'arbitrage') return [line];
    if (line.line === 12) return [];
    if (line.line === 19) {
      return [{
        ...line,
        description: 'Other (including rent paid)',
        categories: ['rent', 'subscription', 'other', 'mortgage'],
      }];
    }
    return [line];
  });
}

export function categoryScheduleELine(category: string, propertyType: PropertyType = 'str'): number {
  const match = getScheduleELinesForPropertyType(propertyType).find(line =>
    (line.categories as string[]).includes(category)
  );
  return match?.line ?? 19;
}

export interface MappedExpense {
  expense: Expense;
  line: number;
  lineDescription: string;
}

export interface ScheduleELineTotal {
  line: number;
  description: string;
  amount: number;
  expenses: Expense[];
  income?: boolean;
  consultCPA?: boolean;
}

export function mapExpensesToScheduleE(
  expenses: Expense[],
  propertyType: PropertyType
): ScheduleELineTotal[] {
  const lines = getScheduleELinesForPropertyType(propertyType);
  const result: ScheduleELineTotal[] = [];

  for (const lineDef of lines) {
    const matchingExpenses = expenses.filter(exp => 
      lineDef.categories.includes(exp.category)
    );
    const total = matchingExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    result.push({
      line: lineDef.line,
      description: lineDef.description,
      amount: total,
      expenses: matchingExpenses,
      income: lineDef.income,
      consultCPA: lineDef.consultCPA,
    });
  }

  return result
    .filter(line => line.amount > 0 || line.income)
    .sort((a, b) => a.line - b.line);
}

export interface PropertyTaxSummary {
  property: Property;
  lineItems: ScheduleELineTotal[];
  totalDeductions: number;
  improvementTotal: number;
  missingCategories: string[];
}

export function generatePropertyTaxSummary(
  property: Property,
  expenses: Expense[]
): PropertyTaxSummary {
  const propertyExpenses = expenses.filter(exp => exp.property_id === property.id);
  const lineItems = mapExpensesToScheduleE(propertyExpenses, property.property_type);
  
  const totalDeductions = lineItems.reduce((sum, line) => {
    if (line.income || line.line === SCHEDULE_E_INCOME_LINE) return sum;
    return sum + line.amount;
  }, 0);

  const improvementTotal = propertyExpenses
    .filter(exp => exp.category === 'improvement')
    .reduce((sum, exp) => sum + exp.amount, 0);

  // Check for common missing deductions
  const missingCategories: string[] = [];
  const hasAdvertising = propertyExpenses.some(exp => exp.description?.toLowerCase().includes('advertising'));
  const hasAutoTravel = propertyExpenses.some(exp => exp.description?.toLowerCase().includes('travel') || exp.description?.toLowerCase().includes('auto'));
  
  if (!hasAdvertising) missingCategories.push('advertising');
  if (!hasAutoTravel) missingCategories.push('auto/travel');

  return {
    property,
    lineItems,
    totalDeductions,
    improvementTotal,
    missingCategories,
  };
}

export interface TaxInsight {
  type: 'positive' | 'warning' | 'negative' | 'info';
  message: string;
}

export function generateTaxInsights(summaries: PropertyTaxSummary[]): TaxInsight[] {
  const insights: TaxInsight[] = [];
  
  const totalDeductions = summaries.reduce((sum, s) => sum + s.totalDeductions, 0);
  insights.push({
    type: 'positive',
    message: `Your total deductible expenses: $${totalDeductions.toLocaleString()}`,
  });

  const totalImprovements = summaries.reduce((sum, s) => sum + s.improvementTotal, 0);
  if (totalImprovements > 0) {
    insights.push({
      type: 'warning',
      message: `Improvement expenses ($${totalImprovements.toLocaleString()}) may need to be depreciated rather than deducted — flag for CPA`,
    });
  }

  const cleaningTotal = summaries.reduce((sum, s) => {
    const cleaningLine = s.lineItems.find(l => l.description.includes('Cleaning'));
    return sum + (cleaningLine?.amount || 0);
  }, 0);
  if (cleaningTotal > 500) {
    insights.push({
      type: 'info',
      message: `You have $${cleaningTotal.toLocaleString()} in cleaning expenses — ensure you're tracking per-turnover vs deep clean separately for accurate reporting`,
    });
  }

  const allMissing = new Set<string>();
  summaries.forEach(s => s.missingCategories.forEach(c => allMissing.add(c)));
  if (allMissing.size > 0) {
    insights.push({
      type: 'warning',
      message: `Missing common deductions: You haven't logged any ${[...allMissing].join(' or ')} expenses — are you tracking these elsewhere?`,
    });
  }

  return insights;
}

export function getPropertyTypeLabel(type: PropertyType): string {
  switch (type) {
    case 'str': return 'Short-Term Rental (Owner)';
    case 'ltr': return 'Long-Term Rental (Owner)';
    case 'arbitrage': return 'Rental Arbitrage';
    case 'primary': return 'Primary Residence';
    default: return type;
  }
}
