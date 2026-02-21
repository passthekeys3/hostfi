import { type Expense, type Property } from './types';
import { type ExpenseCategory } from './expense-categories';

export type PropertyType = Property['property_type'];

// Schedule E line item definitions
export interface ScheduleELine {
  line: number;
  description: string;
  categories: ExpenseCategory[];
  ownerOnly?: boolean;      // Only applicable to owners (str/ltr)
  arbitrageOnly?: boolean;  // Only applicable to arbitrage operators
  consultCPA?: boolean;     // Flag for items needing CPA consultation
}

// Schedule E lines for property OWNERS (str/ltr)
export const OWNER_SCHEDULE_E_LINES: ScheduleELine[] = [
  { line: 5, description: 'Rents received', categories: [], ownerOnly: true },
  { line: 6, description: 'Advertising', categories: [], ownerOnly: true },
  { line: 7, description: 'Auto and travel', categories: [], ownerOnly: true },
  { line: 8, description: 'Cleaning and maintenance', categories: ['cleaning'], ownerOnly: true },
  { line: 9, description: 'Insurance', categories: ['insurance'], ownerOnly: true },
  { line: 10, description: 'Legal and professional fees', categories: [], ownerOnly: true },
  { line: 12, description: 'Mortgage interest', categories: ['mortgage'], ownerOnly: true },
  { line: 13, description: 'Other interest', categories: [], ownerOnly: true },
  { line: 14, description: 'Repairs', categories: ['maintenance'], ownerOnly: true },
  { line: 15, description: 'Supplies', categories: ['supplies'], ownerOnly: true },
  { line: 16, description: 'Taxes', categories: ['taxes'], ownerOnly: true },
  { line: 17, description: 'Utilities', categories: ['utility'], ownerOnly: true },
  { line: 18, description: 'Depreciation expense or depletion', categories: ['improvement'], consultCPA: true, ownerOnly: true },
  { line: 19, description: 'Other', categories: ['rent', 'management', 'subscription', 'other'], ownerOnly: true },
];

// Schedule E lines for ARBITRAGE operators (no mortgage, no property tax, no depreciation)
export const ARBITRAGE_SCHEDULE_E_LINES: ScheduleELine[] = [
  { line: 5, description: 'Rents received', categories: [], arbitrageOnly: true },
  { line: 6, description: 'Advertising', categories: [], arbitrageOnly: true },
  { line: 7, description: 'Auto and travel', categories: [], arbitrageOnly: true },
  { line: 8, description: 'Cleaning and maintenance', categories: ['cleaning'], arbitrageOnly: true },
  { line: 9, description: 'Insurance', categories: ['insurance'], arbitrageOnly: true },
  { line: 10, description: 'Legal and professional fees', categories: [], arbitrageOnly: true },
  { line: 15, description: 'Supplies', categories: ['supplies'], arbitrageOnly: true },
  { line: 14, description: 'Repairs', categories: ['maintenance'], arbitrageOnly: true },
  { line: 17, description: 'Utilities', categories: ['utility'], arbitrageOnly: true },
  { line: 19, description: 'Other (rent, management, subscriptions)', categories: ['rent', 'mortgage', 'management', 'subscription', 'taxes', 'improvement', 'other'], arbitrageOnly: true },
];

export function getScheduleELinesForPropertyType(propertyType: PropertyType): ScheduleELine[] {
  if (propertyType === 'arbitrage') {
    return ARBITRAGE_SCHEDULE_E_LINES;
  }
  return OWNER_SCHEDULE_E_LINES;
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
      consultCPA: lineDef.consultCPA,
    });
  }

  return result.filter(line => line.amount > 0 || line.line === 5); // Always show Line 5 as placeholder
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
    // Line 5 is income, not deduction
    if (line.line === 5) return sum;
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
