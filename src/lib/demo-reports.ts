import { type Expense, type Property, DEMO_PROPERTIES } from './types';
import { DEMO_EXPENSES } from './demo-expenses';
import { EXPENSE_CATEGORY_CONFIG, type ExpenseCategory } from './expense-categories';

export interface PropertySummary {
  property: Property;
  totalSpend: number;
  topCategory: ExpenseCategory;
  topCategoryAmount: number;
  momChange: number; // percentage
  momDirection: 'up' | 'down' | 'flat';
}

export interface MonthlyInsight {
  type: 'positive' | 'warning' | 'negative';
  message: string;
}

export interface AnomalyCallout {
  propertyName: string;
  category: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface TaxImpactNote {
  message: string;
  amount: number;
  category: string;
}

export interface MonthlyReportData {
  month: string; // e.g., "January 2026"
  monthKey: string; // e.g., "2026-01"
  totalSpend: number;
  momChange: number;
  momDirection: 'up' | 'down' | 'flat';
  propertySummaries: PropertySummary[];
  insights: MonthlyInsight[];
  anomalies: AnomalyCallout[];
  taxImpact: TaxImpactNote | null;
  projectedAnnualSpend: number;
  lastYearAnnualSpend: number;
}

// Helper function to get expenses for a specific month
function getExpensesForMonth(expenses: Expense[], monthKey: string): Expense[] {
  return expenses.filter(exp => exp.date.startsWith(monthKey));
}

// Helper function to calculate top category
function getTopCategory(expenses: Expense[]): { category: ExpenseCategory; amount: number } {
  const byCategory = new Map<ExpenseCategory, number>();
  for (const exp of expenses) {
    byCategory.set(exp.category, (byCategory.get(exp.category) || 0) + exp.amount);
  }
  
  let topCategory: ExpenseCategory = 'other';
  let topAmount = 0;
  byCategory.forEach((amount, category) => {
    if (amount > topAmount) {
      topAmount = amount;
      topCategory = category;
    }
  });
  
  return { category: topCategory, amount: topAmount };
}

// Generate demo monthly report data
export function generateMonthlyReport(monthKey: string): MonthlyReportData {
  const [year, month] = monthKey.split('-').map(Number);
  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  
  // Get previous month key
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonthKey = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
  
  // Get expenses for current and previous month
  const currentExpenses = getExpensesForMonth(DEMO_EXPENSES, monthKey);
  const prevExpenses = getExpensesForMonth(DEMO_EXPENSES, prevMonthKey);
  
  const totalSpend = currentExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const prevTotalSpend = prevExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  
  const momChange = prevTotalSpend > 0 
    ? Math.round(((totalSpend - prevTotalSpend) / prevTotalSpend) * 100)
    : 0;
  const momDirection: 'up' | 'down' | 'flat' = momChange > 2 ? 'up' : momChange < -2 ? 'down' : 'flat';
  
  // Generate property summaries
  const propertySummaries: PropertySummary[] = DEMO_PROPERTIES.map(property => {
    const propExpenses = currentExpenses.filter(exp => exp.property_id === property.id);
    const prevPropExpenses = prevExpenses.filter(exp => exp.property_id === property.id);
    
    const propTotal = propExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const prevPropTotal = prevPropExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    const propMomChange = prevPropTotal > 0
      ? Math.round(((propTotal - prevPropTotal) / prevPropTotal) * 100)
      : 0;
    
    const { category: topCategory, amount: topCategoryAmount } = getTopCategory(propExpenses);
    
    return {
      property,
      totalSpend: propTotal,
      topCategory,
      topCategoryAmount,
      momChange: propMomChange,
      momDirection: (propMomChange > 2 ? 'up' : propMomChange < -2 ? 'down' : 'flat') as 'up' | 'down' | 'flat',
    };
  }).filter(s => s.totalSpend > 0);
  
  // Generate insights (hardcoded realistic demo insights)
  const insights: MonthlyInsight[] = [];
  
  // Check for utility spikes
  const utilityExpenses = currentExpenses.filter(exp => exp.category === 'utility');
  const prevUtilityExpenses = prevExpenses.filter(exp => exp.category === 'utility');
  const utilityTotal = utilityExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const prevUtilityTotal = prevUtilityExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  
  if (prevUtilityTotal > 0 && utilityTotal > prevUtilityTotal * 1.2) {
    insights.push({
      type: 'warning',
      message: `Utility costs up ${Math.round(((utilityTotal - prevUtilityTotal) / prevUtilityTotal) * 100)}% — check for seasonal changes or potential issues`,
    });
  }
  
  // Check cleaning trends
  const cleaningExpenses = currentExpenses.filter(exp => exp.category === 'cleaning');
  const cleaningTotal = cleaningExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  if (cleaningTotal > 0) {
    const avgCleaningCost = cleaningTotal / cleaningExpenses.length;
    if (avgCleaningCost < 160) {
      insights.push({
        type: 'positive',
        message: `Cleaning costs averaging $${Math.round(avgCleaningCost)} per clean — competitive rate`,
      });
    }
  }
  
  // Annual projection insight
  const projectedAnnual = totalSpend * 12;
  const lastYearAnnual = 42000; // Hardcoded demo value
  insights.push({
    type: projectedAnnual > lastYearAnnual * 1.1 ? 'warning' : 'positive',
    message: `You're on track to spend $${Math.round(projectedAnnual / 1000)}K this year${projectedAnnual > lastYearAnnual ? `, up from $${Math.round(lastYearAnnual / 1000)}K last year` : ''}`,
  });
  
  // Generate anomaly callouts
  const anomalies: AnomalyCallout[] = [];
  
  // Check for water/utility spikes at specific properties
  for (const propSummary of propertySummaries) {
    const propUtilities = currentExpenses.filter(
      exp => exp.property_id === propSummary.property.id && exp.category === 'utility'
    );
    const prevPropUtilities = prevExpenses.filter(
      exp => exp.property_id === propSummary.property.id && exp.category === 'utility'
    );
    
    const propUtilityTotal = propUtilities.reduce((sum, exp) => sum + exp.amount, 0);
    const prevPropUtilityTotal = prevPropUtilities.reduce((sum, exp) => sum + exp.amount, 0);
    
    if (prevPropUtilityTotal > 0 && propUtilityTotal > prevPropUtilityTotal * 1.3) {
      anomalies.push({
        propertyName: propSummary.property.name,
        category: 'Utilities',
        message: `Utilities jumped ${Math.round(((propUtilityTotal - prevPropUtilityTotal) / prevPropUtilityTotal) * 100)}% — check for issues`,
        severity: propUtilityTotal > prevPropUtilityTotal * 1.5 ? 'high' : 'medium',
      });
    }
  }
  
  // Tax impact note
  const improvementExpenses = currentExpenses.filter(exp => exp.category === 'improvement');
  const improvementTotal = improvementExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  
  let taxImpact: TaxImpactNote | null = null;
  if (improvementTotal > 0) {
    taxImpact = {
      message: `You've spent $${improvementTotal.toLocaleString()} on improvements this month — discuss with your CPA whether these qualify as repairs (fully deductible) or capital improvements (depreciated)`,
      amount: improvementTotal,
      category: 'improvement',
    };
  }
  
  return {
    month: monthName,
    monthKey,
    totalSpend,
    momChange,
    momDirection,
    propertySummaries,
    insights,
    anomalies,
    taxImpact,
    projectedAnnualSpend: totalSpend * 12,
    lastYearAnnualSpend: lastYearAnnual,
  };
}

// Available months for the demo (based on DEMO_EXPENSES data)
export const AVAILABLE_MONTHS = [
  { key: '2026-02', label: 'February 2026' },
  { key: '2026-01', label: 'January 2026' },
  { key: '2025-12', label: 'December 2025' },
];

// Pre-generated demo reports with enhanced realistic data
export const DEMO_MONTHLY_REPORTS: Record<string, MonthlyReportData> = {
  '2026-02': {
    month: 'February 2026',
    monthKey: '2026-02',
    totalSpend: 11924.54,
    momChange: -8,
    momDirection: 'down',
    propertySummaries: [
      {
        property: DEMO_PROPERTIES[0],
        totalSpend: 4883.80,
        topCategory: 'mortgage',
        topCategoryAmount: 3200,
        momChange: -5,
        momDirection: 'down',
      },
      {
        property: DEMO_PROPERTIES[1],
        totalSpend: 4322.99,
        topCategory: 'mortgage',
        topCategoryAmount: 3500,
        momChange: -3,
        momDirection: 'down',
      },
      {
        property: DEMO_PROPERTIES[2],
        totalSpend: 3284.75,
        topCategory: 'mortgage',
        topCategoryAmount: 2800,
        momChange: -12,
        momDirection: 'down',
      },
    ],
    insights: [
      {
        type: 'positive',
        message: 'Cleaning costs averaging $150 per turnover — competitive rate for LA market',
      },
      {
        type: 'warning',
        message: 'Electric at Joshua Tree Cabin up 18% — desert summer approaching, expect higher AC costs',
      },
      {
        type: 'positive',
        message: "You're on track to spend $143K this year, down 8% from January's pace",
      },
    ],
    anomalies: [],
    taxImpact: null,
    projectedAnnualSpend: 143094,
    lastYearAnnualSpend: 138000,
  },
  '2026-01': {
    month: 'January 2026',
    monthKey: '2026-01',
    totalSpend: 12976.30,
    momChange: 15,
    momDirection: 'up',
    propertySummaries: [
      {
        property: DEMO_PROPERTIES[0],
        totalSpend: 6561.80,
        topCategory: 'mortgage',
        topCategoryAmount: 3200,
        momChange: 22,
        momDirection: 'up',
      },
      {
        property: DEMO_PROPERTIES[1],
        totalSpend: 3674.99,
        topCategory: 'mortgage',
        topCategoryAmount: 3500,
        momChange: 8,
        momDirection: 'up',
      },
      {
        property: DEMO_PROPERTIES[2],
        totalSpend: 4620.00,
        topCategory: 'mortgage',
        topCategoryAmount: 2800,
        momChange: 45,
        momDirection: 'up',
      },
    ],
    insights: [
      {
        type: 'positive',
        message: 'Insurance renewals processed — $2,400 annual coverage secured at competitive rates',
      },
      {
        type: 'warning',
        message: 'Q4 TOT taxes ($1,850) paid — ensure you have reserves for Q1 payment due April 30',
      },
      {
        type: 'positive',
        message: "You're on track to spend $156K this year, up from $138K last year",
      },
    ],
    anomalies: [
      {
        propertyName: 'Joshua Tree Cabin',
        category: 'Maintenance',
        message: 'HVAC service $320 — preventive maintenance, no anomaly detected',
        severity: 'low',
      },
    ],
    taxImpact: null,
    projectedAnnualSpend: 155716,
    lastYearAnnualSpend: 138000,
  },
  '2025-12': {
    month: 'December 2025',
    monthKey: '2025-12',
    totalSpend: 11280.00,
    momChange: 5,
    momDirection: 'up',
    propertySummaries: [
      {
        property: DEMO_PROPERTIES[0],
        totalSpend: 3850.00,
        topCategory: 'mortgage',
        topCategoryAmount: 3200,
        momChange: 3,
        momDirection: 'flat',
      },
      {
        property: DEMO_PROPERTIES[1],
        totalSpend: 4130.00,
        topCategory: 'mortgage',
        topCategoryAmount: 3500,
        momChange: 12,
        momDirection: 'up',
      },
      {
        property: DEMO_PROPERTIES[2],
        totalSpend: 3300.00,
        topCategory: 'mortgage',
        topCategoryAmount: 2800,
        momChange: -2,
        momDirection: 'flat',
      },
    ],
    insights: [
      {
        type: 'positive',
        message: 'Strong December bookings offset higher utility costs from holiday guests',
      },
      {
        type: 'warning',
        message: 'Silver Lake Duplex utilities up 12% — winter heating season',
      },
      {
        type: 'positive',
        message: 'Year-end total: $138K in expenses — within budget',
      },
    ],
    anomalies: [],
    taxImpact: null,
    projectedAnnualSpend: 135360,
    lastYearAnnualSpend: 125000,
  },
};

export function getMonthlyReport(monthKey: string): MonthlyReportData {
  return DEMO_MONTHLY_REPORTS[monthKey] || generateMonthlyReport(monthKey);
}
