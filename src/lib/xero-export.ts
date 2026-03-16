/**
 * Xero CSV Export for HostFi
 * 
 * Generates CSV files compatible with Xero's manual journal import
 * and bank statement import formats.
 * 
 * Xero CSV Import Formats:
 * 1. Bank Statement: Date, Amount, Payee, Description, Reference
 * 2. Manual Journals: *Date, *Amount, *AccountCode, Description, Reference, TaxType
 * 3. Bills (Accounts Payable): ContactName, InvoiceNumber, InvoiceDate, DueDate, 
 *    Description, Quantity, UnitAmount, AccountCode, TaxType
 * 
 * We generate format 3 (Bills) as it maps best to rental expenses,
 * and format 1 (Bank Statement) as a simpler alternative.
 */

// Schedule E line descriptions (matches tax-mapping.ts)
const SCHEDULE_E_LINE_DESCRIPTIONS: Record<number, string> = {
  5: 'Rents Received',
  6: 'Advertising',
  7: 'Auto & Travel',
  8: 'Cleaning & Maintenance',
  9: 'Insurance',
  10: 'Legal & Professional Fees',
  11: 'Management Fees',
  12: 'Mortgage Interest',
  13: 'Other Interest',
  14: 'Repairs / Rent Paid',
  15: 'Supplies',
  16: 'Taxes',
  17: 'Utilities',
  18: 'Depreciation',
  19: 'Other Expenses',
};

// Xero standard account codes for rental properties
// Users should customize these in Xero to match their chart of accounts
const XERO_ACCOUNT_MAP: Record<string, { code: string; name: string }> = {
  'mortgage': { code: '800', name: 'Mortgage Interest' },
  'rent': { code: '801', name: 'Rent Expense' },
  'utilities': { code: '810', name: 'Utilities' },
  'electric': { code: '810', name: 'Utilities' },
  'gas': { code: '810', name: 'Utilities' },
  'water': { code: '810', name: 'Utilities' },
  'internet': { code: '810', name: 'Utilities' },
  'insurance': { code: '820', name: 'Insurance' },
  'cleaning': { code: '830', name: 'Cleaning & Maintenance' },
  'maintenance': { code: '830', name: 'Cleaning & Maintenance' },
  'repairs': { code: '835', name: 'Repairs' },
  'supplies': { code: '840', name: 'Supplies' },
  'taxes': { code: '850', name: 'Property Taxes' },
  'management': { code: '860', name: 'Management Fees' },
  'legal': { code: '870', name: 'Legal & Professional' },
  'advertising': { code: '880', name: 'Advertising' },
  'platform_fees': { code: '880', name: 'Advertising' },
  'depreciation': { code: '890', name: 'Depreciation' },
  'travel': { code: '895', name: 'Auto & Travel' },
  'other': { code: '899', name: 'Other Rental Expenses' },
  'uncategorized': { code: '899', name: 'Other Rental Expenses' },
};

// Map Schedule E lines to Xero account codes
const SCHEDULE_E_TO_XERO: Record<number, string> = {
  6: '880',   // Advertising
  7: '895',   // Auto & Travel
  8: '830',   // Cleaning & Maintenance
  9: '820',   // Insurance
  10: '870',  // Legal & Professional
  11: '860',  // Management Fees
  12: '800',  // Mortgage Interest
  13: '800',  // Other Interest
  14: '835',  // Repairs / Rent Paid
  15: '840',  // Supplies
  16: '850',  // Taxes
  17: '810',  // Utilities
  18: '890',  // Depreciation
  19: '899',  // Other
};

export interface XeroExpense {
  date: string;          // YYYY-MM-DD
  amount: number;
  vendor: string;
  description: string;
  category: string;
  property_name: string;
  schedule_e_line?: number;
  reference?: string;
}

/**
 * Generate Xero Bills Import CSV
 * This is the most complete format -- creates bills in Accounts Payable
 */
export function generateXeroBillsCSV(expenses: XeroExpense[]): string {
  const rows: string[] = [];
  rows.push('*ContactName,*InvoiceNumber,*InvoiceDate,*DueDate,Description,Quantity,*UnitAmount,AccountCode,*TaxType');

  for (const expense of expenses) {
    const accountCode = expense.schedule_e_line 
      ? SCHEDULE_E_TO_XERO[expense.schedule_e_line] || '899'
      : XERO_ACCOUNT_MAP[expense.category]?.code || '899';
    
    const invoiceDate = formatXeroDate(expense.date);
    const dueDate = invoiceDate; // Same as invoice date for past expenses
    const invoiceNum = expense.reference || `HF-${expense.date.replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6)}`;
    const description = `${expense.property_name}: ${expense.description}`.slice(0, 500);
    const contactName = escapeCSV(expense.vendor || 'Unknown Vendor');

    rows.push([
      contactName,
      escapeCSV(invoiceNum),
      invoiceDate,
      dueDate,
      escapeCSV(description),
      '1',
      expense.amount.toFixed(2),
      accountCode,
      'Tax Exempt (0%)',
    ].join(','));
  }

  return rows.join('\n');
}

/**
 * Generate Xero Bank Statement CSV
 * Simpler format for importing into a Xero bank account
 */
export function generateXeroBankStatementCSV(expenses: XeroExpense[]): string {
  const rows: string[] = [];
  rows.push('*Date,*Amount,Payee,Description,Reference');

  for (const expense of expenses) {
    const date = formatXeroDate(expense.date);
    const payee = escapeCSV(expense.vendor || 'Unknown');
    const description = escapeCSV(`${expense.property_name}: ${expense.description}`.slice(0, 500));
    const reference = escapeCSV(expense.reference || '');

    rows.push([
      date,
      (-expense.amount).toFixed(2), // Negative for expenses
      payee,
      description,
      reference,
    ].join(','));
  }

  return rows.join('\n');
}

/**
 * Generate Xero Manual Journal CSV
 * For bulk expense import as journal entries
 */
export function generateXeroJournalCSV(expenses: XeroExpense[]): string {
  const rows: string[] = [];
  rows.push('*Narration,*Date,*AccountCode,*Debit,Credit,Description,TaxType');

  for (const expense of expenses) {
    const accountCode = expense.schedule_e_line
      ? SCHEDULE_E_TO_XERO[expense.schedule_e_line] || '899'
      : XERO_ACCOUNT_MAP[expense.category]?.code || '899';

    const date = formatXeroDate(expense.date);
    const narration = escapeCSV(`${expense.property_name} - ${expense.vendor || expense.category}`);
    const description = escapeCSV(expense.description.slice(0, 500));

    // Debit the expense account
    rows.push([
      narration,
      date,
      accountCode,
      expense.amount.toFixed(2),
      '',
      description,
      'Tax Exempt (0%)',
    ].join(','));

    // Credit the bank/cash account (standard Xero code 090 for bank)
    rows.push([
      narration,
      date,
      '090',
      '',
      expense.amount.toFixed(2),
      description,
      'Tax Exempt (0%)',
    ].join(','));
  }

  return rows.join('\n');
}

/**
 * Generate a Schedule E summary in Xero-friendly format
 * Groups by property and Schedule E line for CPA use
 */
export function generateXeroScheduleESummaryCSV(
  summaries: { property_name: string; line: number; description: string; amount: number }[]
): string {
  const rows: string[] = [];
  rows.push('Property,Schedule E Line,Description,Xero Account Code,Amount');

  for (const item of summaries) {
    const accountCode = SCHEDULE_E_TO_XERO[item.line] || '899';
    rows.push([
      escapeCSV(item.property_name),
      item.line.toString(),
      escapeCSV(item.description),
      accountCode,
      item.amount.toFixed(2),
    ].join(','));
  }

  return rows.join('\n');
}

// --- Helpers ---

function formatXeroDate(dateStr: string): string {
  // Xero expects DD/MM/YYYY
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
}

function escapeCSV(value: string): string {
  if (!value) return '';
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Get the Xero account code mapping table
 * Useful for displaying to users so they can match their chart of accounts
 */
export function getXeroAccountMapping(): { code: string; name: string; scheduleELine: number; scheduleEDesc: string }[] {
  return Object.entries(SCHEDULE_E_TO_XERO).map(([line, code]) => ({
    code,
    name: Object.values(XERO_ACCOUNT_MAP).find(a => a.code === code)?.name || 'Unknown',
    scheduleELine: parseInt(line),
    scheduleEDesc: SCHEDULE_E_LINE_DESCRIPTIONS[parseInt(line)] || 'Unknown',
  }));
}
