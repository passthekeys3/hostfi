import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { createRateLimiter } from '@/lib/rate-limit';
import { syncExpenseToSheets } from '@/lib/integrations/google-sync';

const isRateLimited = createRateLimiter('google-sync-expense', 30, 60_000);

/**
 * POST /api/integrations/google/sync-expense
 * Sync a single expense to Google Sheets (fire-and-forget from client)
 */
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const auth = await authenticateRequest();

    const body = await request.json();
    const { expense } = body as {
      expense: {
        date: string;
        property_name: string;
        category: string;
        amount: number;
        description: string;
        notes?: string;
      };
    };

    if (!expense || !expense.date || !expense.amount) {
      return NextResponse.json({ error: 'Invalid expense data' }, { status: 400 });
    }

    // Sync to Google Sheets (non-blocking conceptually, but we wait for response)
    await syncExpenseToSheets(auth.userId, expense);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('sync-expense error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
