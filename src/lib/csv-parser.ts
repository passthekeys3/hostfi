import { type ExpenseCategory, EXPENSE_CATEGORY_CONFIG } from './expense-categories';

export interface ParsedRow {
  [key: string]: string;
}

export interface ColumnMapping {
  date: string | null;
  amount: string | null;
  description: string | null;
  property: string | null;
  category: string | null;
  vendor: string | null;
  notes: string | null;
}

export interface ParsedExpense {
  date: string;
  amount: number;
  description: string;
  property: string;
  category: ExpenseCategory | null;
  vendor: string;
  notes: string;
  valid: boolean;
  hasIssue: boolean;
  issueMessage: string | null;
  errors: string[];
}

export function parseCSV(text: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return { headers: [], rows: [] };

  // Handle quoted CSV fields
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseLine(lines[i]);
    const row: ParsedRow = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }

  return { headers, rows };
}

export function autoDetectMappings(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    date: null,
    amount: null,
    description: null,
    property: null,
    category: null,
    vendor: null,
    notes: null,
  };

  const lower = headers.map(h => h.toLowerCase());

  for (let i = 0; i < lower.length; i++) {
    const h = lower[i];
    if (!mapping.date && (h.includes('date') || h.includes('time'))) mapping.date = headers[i];
    if (!mapping.amount && (h.includes('amount') || h.includes('total') || h.includes('cost') || h.includes('price'))) mapping.amount = headers[i];
    if (!mapping.description && (h.includes('description') || h.includes('memo') || h.includes('detail') || h.includes('name'))) mapping.description = headers[i];
    if (!mapping.property && (h.includes('property') || h.includes('unit') || h.includes('address') || h.includes('listing'))) mapping.property = headers[i];
    if (!mapping.category && (h.includes('category') || h.includes('type') || h.includes('class'))) mapping.category = headers[i];
    if (!mapping.vendor && (h.includes('vendor') || h.includes('payee') || h.includes('merchant') || h.includes('company'))) mapping.vendor = headers[i];
    if (!mapping.notes && (h.includes('note') || h.includes('comment') || h.includes('remark'))) mapping.notes = headers[i];
  }

  return mapping;
}

function detectCategory(text: string): ExpenseCategory | null {
  const lower = text.toLowerCase();
  const keywords: Record<ExpenseCategory, string[]> = {
    cleaning: ['clean', 'turnover', 'maid', 'housekeep'],
    maintenance: ['repair', 'fix', 'plumb', 'hvac', 'electric', 'handyman', 'maintenance'],
    utility: ['electric', 'gas', 'water', 'internet', 'wifi', 'trash', 'sewer', 'utility'],
    mortgage: ['mortgage', 'rent', 'lease', 'loan'],
    insurance: ['insurance', 'policy', 'liability', 'coverage'],
    taxes: ['tax', 'tot', 'lodging tax', 'property tax'],
    supplies: ['supply', 'supplies', 'toiletries', 'linen', 'towel', 'amenity'],
    management: ['management', 'co-host', 'cohost', 'property manager'],
    subscription: ['subscription', 'software', 'saas', 'membership'],
    improvement: ['furniture', 'furnish', 'decor', 'appliance', 'mattress', 'renovation', 'upgrade'],
    other: [],
  };

  for (const [cat, words] of Object.entries(keywords)) {
    if (words.some(w => lower.includes(w))) return cat as ExpenseCategory;
  }
  return null;
}

export function transformToExpenses(
  rows: ParsedRow[],
  mapping: ColumnMapping,
  _propertyNames: string[]
): ParsedExpense[] {
  return rows.map(row => {
    const errors: string[] = [];
    const dateStr = mapping.date ? row[mapping.date] || '' : '';
    const amountStr = mapping.amount ? row[mapping.amount] || '' : '';
    const description = mapping.description ? row[mapping.description] || '' : '';
    const property = mapping.property ? row[mapping.property] || '' : '';
    const categoryStr = mapping.category ? row[mapping.category] || '' : '';
    const vendor = mapping.vendor ? row[mapping.vendor] || '' : '';
    const notes = mapping.notes ? row[mapping.notes] || '' : '';

    // Parse amount
    const amount = parseFloat(amountStr.replace(/[$,]/g, '')) || 0;
    if (!amount) errors.push('Invalid amount');

    // Parse date
    let date = dateStr;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [m, d, y] = parts;
      date = `${y.length === 2 ? '20' + y : y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    if (!date.match(/^\d{4}-\d{2}-\d{2}/)) errors.push('Invalid date');

    // Detect category
    let category: ExpenseCategory | null = null;
    if (categoryStr) {
      const catLower = categoryStr.toLowerCase();
      const validCats = Object.keys(EXPENSE_CATEGORY_CONFIG) as ExpenseCategory[];
      category = validCats.find(c => c === catLower || EXPENSE_CATEGORY_CONFIG[c].label.toLowerCase() === catLower) || detectCategory(categoryStr + ' ' + description);
    } else {
      category = detectCategory(description + ' ' + vendor);
    }

    return {
      date,
      amount: Math.abs(amount),
      description,
      property,
      category,
      vendor,
      notes,
      valid: errors.length === 0,
      hasIssue: errors.length > 0 || !category,
      issueMessage: errors.length > 0 ? errors[0] : !category ? 'Could not detect category' : null,
      errors,
    };
  });
}

export const SAMPLE_CSV_TEMPLATE = `Date,Amount,Description,Property,Category,Vendor,Notes
02/01/2026,$150.00,Standard turnover clean,Venice Beach Unit,Cleaning,CleanBnB LA,Regular service
02/03/2026,$89.99,Monthly internet,Silver Lake Duplex,Utility,Spectrum,Autopay
02/05/2026,$45.00,Lightbulb replacement,Venice Beach Unit,Maintenance,Amazon,6 smart bulbs`;

export function generateCSVBlob(content: string): Blob {
  return new Blob([content], { type: 'text/csv;charset=utf-8;' });
}
