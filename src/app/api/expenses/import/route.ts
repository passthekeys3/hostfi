import { NextRequest, NextResponse } from 'next/server';
import { EXPENSE_CATEGORY_CONFIG, type ExpenseCategory } from '@/lib/expense-categories';
import { authenticateRequest } from '@/lib/auth';
import { createRateLimiter } from '@/lib/rate-limit';
import { createClient } from '@supabase/supabase-js';
import type { Expense } from '@/lib/types';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const isRateLimited = createRateLimiter('expenses-import', 5, 60_000);

const MAX_IMPORT_SIZE = 10_000;
const MAX_STRING_LENGTH = 1000;

function sanitize(s: string | undefined | null, maxLen: number = MAX_STRING_LENGTH): string {
  return (s || '').slice(0, maxLen).trim();
}

interface ImportedExpense {
  date: string;
  amount: number;
  description: string;
  property: string;
  property_id?: string;
  category: ExpenseCategory | null;
  vendor: string;
  notes: string;
}

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  duplicates: number;
  expenses: Expense[];
  errors: string[];
}

function isDuplicate(expense: ImportedExpense, existing: ImportedExpense[]): boolean {
  return existing.some(e => 
    e.date === expense.date && 
    Math.abs(e.amount - expense.amount) < 0.01 &&
    e.description.toLowerCase() === expense.description.toLowerCase() &&
    (e.property_id === expense.property_id || e.property.toLowerCase() === expense.property.toLowerCase())
  );
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Authentication
    let auth;
    try {
      auth = await authenticateRequest();
    } catch (response) {
      return response as NextResponse;
    }

    const body = await request.json();
    const { expenses, existingExpenses = [] } = body as { 
      expenses: ImportedExpense[]; 
      existingExpenses?: ImportedExpense[];
    };

    if (!Array.isArray(expenses)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request: expenses must be an array' },
        { status: 400 }
      );
    }

    if (expenses.length > MAX_IMPORT_SIZE) {
      return NextResponse.json(
        { success: false, error: `Too many expenses (max ${MAX_IMPORT_SIZE})` },
        { status: 400 }
      );
    }

    const result: ImportResult = {
      success: true,
      imported: 0,
      skipped: 0,
      duplicates: 0,
      expenses: [],
      errors: [],
    };

    const importedForDuplicateCheck: ImportedExpense[] = [...existingExpenses];

    for (const expense of expenses) {
      if (!expense.date || !expense.amount || !expense.description || !expense.property) {
        result.skipped++;
        result.errors.push('Skipped row: missing required fields');
        continue;
      }

      if (!/^\d{4}-\d{2}-\d{2}/.test(expense.date)) {
        result.skipped++;
        result.errors.push(`Skipped row: invalid date format for "${sanitize(expense.description, 50)}"`);
        continue;
      }

      if (typeof expense.amount !== 'number' || expense.amount <= 0 || expense.amount > 10_000_000) {
        result.skipped++;
        result.errors.push(`Skipped row: invalid amount for "${sanitize(expense.description, 50)}"`);
        continue;
      }

      if (isDuplicate(expense, importedForDuplicateCheck)) {
        result.duplicates++;
        continue;
      }

      const newExpense: Expense = {
        id: `import-${Date.now()}-${result.imported}`,
        user_id: auth.userId,
        property_id: sanitize(expense.property_id),
        category: expense.category || 'other',
        description: sanitize(expense.description),
        vendor: sanitize(expense.vendor) || null,
        amount: expense.amount,
        date: expense.date.substring(0, 10),
        frequency: 'one-time',
        is_recurring: false,
        recurring_expense_id: null,
        source: 'manual',
        status: 'paid',
        payment_method: null,
        notes: sanitize(expense.notes) || null,
        receipt_url: null,
        utility_account_id: null,
        billing_period_start: null,
        billing_period_end: null,
        due_date: null,
        raw_email_id: null,
        confidence_score: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        paid_at: new Date().toISOString(),
      };

      result.expenses.push(newExpense);
      importedForDuplicateCheck.push(expense);
      result.imported++;
    }

    // Persist to Supabase
    if (result.expenses.length > 0) {
      const supabase = getServiceClient();
      if (supabase) {
        const rows = result.expenses.map(e => ({
          user_id: e.user_id,
          property_id: e.property_id || null,
          category: e.category,
          description: e.description,
          vendor: e.vendor,
          amount: e.amount,
          date: e.date,
          frequency: e.frequency,
          source: 'csv_import',
          status: e.status,
          notes: e.notes,
        }));
        const { error } = await supabase.from('expenses').insert(rows);
        if (error) {
          console.error('Expense import DB error:', error.message);
          return NextResponse.json({ success: false, error: 'Failed to save imported expenses' }, { status: 500 });
        }
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error importing expenses:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process import' },
      { status: 500 }
    );
  }
}
